const router = require('express').Router();
const db = require('../db');
const { optionalAuth } = require('../middleware/auth');

// GET /api/search?q=&type=all|businesses|posts|users|communities
router.get('/', optionalAuth, async (req, res) => {
  const { q, type = 'all', page = 1, limit = 20, category, city } = req.query;
  if (!q || q.trim().length < 2) return res.status(400).json({ error: 'Query too short' });

  const offset = (page - 1) * limit;
  const results = {};

  try {
    if (type === 'all' || type === 'businesses') {
      const params = [`%${q}%`, parseInt(limit), parseInt(offset)];
      const conditions = ['b.is_active = true', `(b.name ILIKE $1 OR b.description ILIKE $1 OR b.city ILIKE $1)`];
      if (category) { params.unshift(category); conditions.push(`c.slug = $1`); params[1] = `%${q}%`; }

      const { rows } = await db.query(
        `SELECT b.id, b.name, b.slug, b.city, b.cover_image_url, b.price_range,
                c.name AS category, brs.avg_overall, brs.rating_count
         FROM businesses b
         LEFT JOIN categories c ON b.category_id = c.id
         LEFT JOIN business_rating_summary brs ON brs.business_id = b.id
         WHERE b.is_active = true AND (b.name ILIKE $1 OR b.description ILIKE $1)
         ORDER BY brs.avg_overall DESC NULLS LAST
         LIMIT $2 OFFSET $3`,
        [`%${q}%`, parseInt(limit), parseInt(offset)]
      );
      results.businesses = rows;
    }

    if (type === 'all' || type === 'users') {
      const { rows } = await db.query(
        `SELECT id, username, display_name, avatar_url, bio,
                (SELECT COUNT(*) FROM follows WHERE following_id = users.id) AS follower_count
         FROM users
         WHERE is_active = true AND (username ILIKE $1 OR display_name ILIKE $1)
         LIMIT $2 OFFSET $3`,
        [`%${q}%`, parseInt(limit), parseInt(offset)]
      );
      results.users = rows;
    }

    if (type === 'all' || type === 'posts') {
      const { rows } = await db.query(
        `SELECT p.id, p.title, p.body, p.post_type, p.like_count, p.comment_count, p.created_at,
                u.username, u.display_name, u.avatar_url
         FROM posts p JOIN users u ON p.author_id = u.id
         WHERE p.is_deleted = false AND (p.title ILIKE $1 OR p.body ILIKE $1)
         ORDER BY p.created_at DESC
         LIMIT $2 OFFSET $3`,
        [`%${q}%`, parseInt(limit), parseInt(offset)]
      );
      results.posts = rows;
    }

    if (type === 'all' || type === 'communities') {
      const { rows } = await db.query(
        `SELECT id, name, slug, description, cover_image, member_count
         FROM communities
         WHERE is_public = true AND (name ILIKE $1 OR description ILIKE $1)
         ORDER BY member_count DESC
         LIMIT $2 OFFSET $3`,
        [`%${q}%`, parseInt(limit), parseInt(offset)]
      );
      results.communities = rows;
    }

    res.json({ query: q, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/search/categories
router.get('/categories', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM categories ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
