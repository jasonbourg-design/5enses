const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate, optionalAuth } = require('../middleware/auth');

// GET /api/posts?community_id=&group_id=&page=
router.get('/', optionalAuth, async (req, res) => {
  const { community_id, group_id, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = ['p.is_deleted = false'];

  if (community_id) { params.push(community_id); conditions.push(`p.community_id = $${params.length}`); }
  if (group_id) { params.push(group_id); conditions.push(`p.group_id = $${params.length}`); }

  const where = `WHERE ${conditions.join(' AND ')}`;
  params.push(parseInt(limit), parseInt(offset));

  try {
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
       ${where}
       ORDER BY p.is_pinned DESC, p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    // Inject user's like state if logged in
    if (req.user && rows.length > 0) {
      const ids = rows.map(r => r.id);
      const likes = await db.query(
        'SELECT post_id FROM post_likes WHERE user_id = $1 AND post_id = ANY($2)',
        [req.user.id, ids]
      );
      const likedSet = new Set(likes.rows.map(l => l.post_id));
      rows.forEach(r => r.user_liked = likedSet.has(r.id));
    }

    res.json({ posts: rows, page: parseInt(page) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/posts
router.post('/', authenticate, [
  body('title').optional().trim().isLength({ max: 300 }),
  body('body').optional().trim().isLength({ max: 10000 }),
  body('post_type').optional().isIn(['text','image','link','rating_share','poll']),
  body('community_id').optional().isUUID(),
  body('group_id').optional().isUUID(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, body: postBody, post_type = 'text', images, community_id, group_id, link_url, rating_id } = req.body;

  try {
    const { rows } = await db.query(
      `INSERT INTO posts (author_id, title, body, post_type, images, community_id, group_id, link_url, rating_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.user.id, title, postBody, post_type, images || [], community_id, group_id, link_url, rating_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/posts/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, u.username, u.display_name, u.avatar_url,
              c.name AS community_name, c.slug AS community_slug,
              g.name AS group_name
       FROM posts p
       JOIN users u ON p.author_id = u.id
       LEFT JOIN communities c ON p.community_id = c.id
       LEFT JOIN groups g ON p.group_id = g.id
       WHERE p.id = $1 AND p.is_deleted = false`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Post not found' });

    if (req.user) {
      const like = await db.query(
        'SELECT 1 FROM post_likes WHERE user_id = $1 AND post_id = $2',
        [req.user.id, req.params.id]
      );
      rows[0].user_liked = like.rows.length > 0;
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/posts/:id/like
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    await db.query(
      'INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.id]
    );
    const { rows } = await db.query(
      'UPDATE posts SET like_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = $1) WHERE id = $1 RETURNING like_count',
      [req.params.id]
    );
    res.json({ liked: true, like_count: rows[0]?.like_count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/posts/:id/like
router.delete('/:id/like', authenticate, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2',
      [req.user.id, req.params.id]
    );
    const { rows } = await db.query(
      'UPDATE posts SET like_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = $1) WHERE id = $1 RETURNING like_count',
      [req.params.id]
    );
    res.json({ liked: false, like_count: rows[0]?.like_count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/posts/:id/comments
router.get('/:id/comments', optionalAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*, u.username, u.display_name, u.avatar_url
       FROM comments c
       JOIN users u ON c.author_id = u.id
       WHERE c.post_id = $1 AND c.is_deleted = false
       ORDER BY c.created_at ASC`,
      [req.params.id]
    );
    res.json({ comments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/posts/:id/comments
router.post('/:id/comments', authenticate, [
  body('body').trim().isLength({ min: 1, max: 2000 }),
  body('parent_id').optional().isUUID(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { rows } = await db.query(
      `INSERT INTO comments (post_id, author_id, body, parent_id) VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.params.id, req.user.id, req.body.body, req.body.parent_id]
    );
    await db.query(
      'UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1',
      [req.params.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/posts/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE posts SET is_deleted = true WHERE id = $1 AND author_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Post not found or not yours' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
