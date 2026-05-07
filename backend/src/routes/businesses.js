const router = require('express').Router();
const db = require('../db');
const { authenticate, optionalAuth } = require('../middleware/auth');

// GET /api/businesses?q=&category=&city=&page=&limit=
router.get('/', optionalAuth, async (req, res) => {
  const { q, category, city, price_range, sort = 'rating', page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = ['b.is_active = true'];

  if (q) { params.push(`%${q}%`); conditions.push(`b.name ILIKE $${params.length}`); }
  if (category) { params.push(category); conditions.push(`c.slug = $${params.length}`); }
  if (city) { params.push(`%${city}%`); conditions.push(`b.city ILIKE $${params.length}`); }
  if (price_range) { params.push(price_range); conditions.push(`b.price_range = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = sort === 'rating' ? 'avg_overall DESC NULLS LAST' : sort === 'newest' ? 'b.created_at DESC' : 'b.name ASC';

  params.push(parseInt(limit), parseInt(offset));

  try {
    const { rows } = await db.query(
      `SELECT b.id, b.name, b.slug, b.city, b.state, b.address,
              b.cover_image_url, b.price_range, c.name AS category,
              ROUND(brs.avg_overall, 2) AS avg_overall,
              brs.rating_count,
              brs.avg_sight, brs.avg_sound, brs.avg_smell, brs.avg_taste, brs.avg_touch
       FROM businesses b
       LEFT JOIN categories c ON b.category_id = c.id
       LEFT JOIN business_rating_summary brs ON brs.business_id = b.id
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ businesses: rows, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/businesses/:slug
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT b.*, c.name AS category, c.slug AS category_slug,
              brs.avg_overall, brs.rating_count,
              brs.avg_sight, brs.avg_sound, brs.avg_smell, brs.avg_taste, brs.avg_touch
       FROM businesses b
       LEFT JOIN categories c ON b.category_id = c.id
       LEFT JOIN business_rating_summary brs ON brs.business_id = b.id
       WHERE b.slug = $1 AND b.is_active = true`,
      [req.params.slug]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Business not found' });

    // If user is logged in, check if saved
    if (req.user) {
      const saved = await db.query(
        'SELECT 1 FROM saved_businesses WHERE user_id = $1 AND business_id = $2',
        [req.user.id, rows[0].id]
      );
      rows[0].is_saved = saved.rows.length > 0;

      const userRating = await db.query(
        'SELECT id FROM ratings WHERE user_id = $1 AND business_id = $2',
        [req.user.id, rows[0].id]
      );
      rows[0].user_has_rated = userRating.rows.length > 0;
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/businesses/:id/ratings?page=&sense_filter=&sort=
router.get('/:id/ratings', optionalAuth, async (req, res) => {
  const { page = 1, limit = 10, sort = 'newest', sense_filter } = req.query;
  const offset = (page - 1) * limit;

  let orderBy = 'r.created_at DESC';
  if (sort === 'helpful') orderBy = 'r.helpful_count DESC';
  if (sort === 'highest') orderBy = 'r.overall DESC';
  if (sort === 'lowest') orderBy = 'r.overall ASC';

  let senseCondition = '';
  if (sense_filter && ['sight','sound','smell','taste','touch'].includes(sense_filter)) {
    senseCondition = `AND r.${sense_filter} IS NOT NULL`;
  }

  try {
    const { rows } = await db.query(
      `SELECT r.*, u.username, u.display_name, u.avatar_url
       FROM ratings r
       JOIN users u ON r.user_id = u.id
       WHERE r.business_id = $1 ${senseCondition}
       ORDER BY ${orderBy}
       LIMIT $2 OFFSET $3`,
      [req.params.id, parseInt(limit), parseInt(offset)]
    );
    res.json({ ratings: rows, page: parseInt(page) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/businesses/:id/save
router.post('/:id/save', authenticate, async (req, res) => {
  try {
    await db.query(
      'INSERT INTO saved_businesses (user_id, business_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.id]
    );
    res.json({ saved: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/businesses/:id/save
router.delete('/:id/save', authenticate, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM saved_businesses WHERE user_id = $1 AND business_id = $2',
      [req.user.id, req.params.id]
    );
    res.json({ saved: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
