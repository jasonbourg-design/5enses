const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// POST /api/ratings
router.post('/', authenticate, [
  body('business_id').isUUID(),
  body('sight').optional().isInt({ min: 1, max: 5 }),
  body('sound').optional().isInt({ min: 1, max: 5 }),
  body('smell').optional().isInt({ min: 1, max: 5 }),
  body('taste').optional().isInt({ min: 1, max: 5 }),
  body('touch').optional().isInt({ min: 1, max: 5 }),
  body('review_text').optional().trim().isLength({ max: 2000 }),
  body('visit_date').optional().isDate(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { business_id, sight, sound, smell, taste, touch, review_text, visit_date, images } = req.body;

  // Calculate overall as mean of provided senses
  const senses = [sight, sound, smell, taste, touch].filter(v => v != null);
  if (senses.length === 0) return res.status(400).json({ error: 'At least one sense score is required' });
  const overall = senses.reduce((a, b) => a + b, 0) / senses.length;

  try {
    const { rows } = await db.query(
      `INSERT INTO ratings (user_id, business_id, sight, sound, smell, taste, touch, overall, review_text, visit_date, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (user_id, business_id) DO UPDATE SET
         sight = EXCLUDED.sight, sound = EXCLUDED.sound, smell = EXCLUDED.smell,
         taste = EXCLUDED.taste, touch = EXCLUDED.touch, overall = EXCLUDED.overall,
         review_text = EXCLUDED.review_text, visit_date = EXCLUDED.visit_date,
         images = EXCLUDED.images, updated_at = NOW()
       RETURNING *`,
      [req.user.id, business_id, sight, sound, smell, taste, touch, overall, review_text, visit_date, images || []]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/ratings/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.*, u.username, u.display_name, u.avatar_url,
              b.name AS business_name, b.slug AS business_slug, b.cover_image_url AS business_image
       FROM ratings r
       JOIN users u ON r.user_id = u.id
       JOIN businesses b ON r.business_id = b.id
       WHERE r.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Rating not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/ratings/:id/helpful
router.post('/:id/helpful', authenticate, async (req, res) => {
  try {
    await db.query(
      'INSERT INTO rating_helpful (user_id, rating_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.id]
    );
    await db.query(
      'UPDATE ratings SET helpful_count = (SELECT COUNT(*) FROM rating_helpful WHERE rating_id = $1) WHERE id = $1',
      [req.params.id]
    );
    res.json({ helpful: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/ratings/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      'DELETE FROM ratings WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Rating not found or not yours' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
