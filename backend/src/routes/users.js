const router = require('express').Router();
const db = require('../db');
const { authenticate, optionalAuth } = require('../middleware/auth');

// GET /api/users/:username
router.get('/:username', optionalAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, u.location, u.created_at,
              (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS follower_count,
              (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count,
              (SELECT COUNT(*) FROM ratings WHERE user_id = u.id) AS rating_count,
              (SELECT COUNT(*) FROM posts WHERE author_id = u.id AND is_deleted = false) AS post_count
       FROM users u WHERE u.username = $1 AND u.is_active = true`,
      [req.params.username]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });

    if (req.user) {
      const follow = await db.query(
        'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
        [req.user.id, rows[0].id]
      );
      rows[0].is_following = follow.rows.length > 0;
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:username/ratings
router.get('/:username/ratings', optionalAuth, async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const user = await db.query('SELECT id FROM users WHERE username = $1', [req.params.username]);
    if (!user.rows[0]) return res.status(404).json({ error: 'User not found' });

    const { rows } = await db.query(
      `SELECT r.*, b.name AS business_name, b.slug AS business_slug,
              b.cover_image_url, c.name AS category
       FROM ratings r
       JOIN businesses b ON r.business_id = b.id
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [user.rows[0].id, parseInt(limit), parseInt(offset)]
    );
    res.json({ ratings: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users/:id/follow
router.post('/:id/follow', authenticate, async (req, res) => {
  try {
    await db.query(
      'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.id]
    );
    res.json({ following: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/users/:id/follow
router.delete('/:id/follow', authenticate, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
      [req.user.id, req.params.id]
    );
    res.json({ following: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/feed (home feed for logged-in user)
router.get('/me/feed', authenticate, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  try {
    // Posts from people you follow + communities you're in
    const { rows } = await db.query(
      `SELECT p.id, p.title, p.body, p.post_type, p.images, p.like_count, p.comment_count,
              p.created_at, p.is_pinned,
              u.username, u.display_name, u.avatar_url,
              c.name AS community_name, c.slug AS community_slug,
              g.name AS group_name
       FROM posts p
       JOIN users u ON p.author_id = u.id
       LEFT JOIN communities c ON p.community_id = c.id
       LEFT JOIN groups g ON p.group_id = g.id
       WHERE p.is_deleted = false AND (
         p.author_id IN (SELECT following_id FROM follows WHERE follower_id = $1)
         OR p.community_id IN (SELECT community_id FROM community_members WHERE user_id = $1)
         OR p.group_id IN (SELECT group_id FROM group_members WHERE user_id = $1)
       )
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, parseInt(limit), parseInt(offset)]
    );
    res.json({ posts: rows, page: parseInt(page) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
