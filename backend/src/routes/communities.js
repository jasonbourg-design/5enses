const router = require('express').Router();
const db = require('../db');
const { authenticate, optionalAuth } = require('../middleware/auth');

// GET /api/communities
router.get('/', optionalAuth, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const { rows } = await db.query(
      `SELECT c.id, c.name, c.slug, c.description, c.cover_image, c.member_count, c.is_public, c.created_at
       FROM communities c
       WHERE c.is_public = true
       ORDER BY c.member_count DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), parseInt(offset)]
    );
    if (req.user) {
      const ids = rows.map(r => r.id);
      if (ids.length > 0) {
        const memberships = await db.query(
          'SELECT community_id FROM community_members WHERE user_id = $1 AND community_id = ANY($2)',
          [req.user.id, ids]
        );
        const memberSet = new Set(memberships.rows.map(m => m.community_id));
        rows.forEach(r => r.is_member = memberSet.has(r.id));
      }
    }
    res.json({ communities: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/communities/:slug
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM communities WHERE slug = $1',
      [req.params.slug]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Community not found' });
    const community = rows[0];

    if (req.user) {
      const m = await db.query(
        'SELECT role FROM community_members WHERE community_id = $1 AND user_id = $2',
        [community.id, req.user.id]
      );
      community.membership = m.rows[0] || null;
    }

    // fetch groups
    const groups = await db.query(
      `SELECT g.id, g.name, g.slug, g.description, g.cover_image, g.member_count, g.is_private
       FROM groups g WHERE g.community_id = $1 ORDER BY g.member_count DESC`,
      [community.id]
    );
    community.groups = groups.rows;

    res.json(community);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/communities/:id/join
router.post('/:id/join', authenticate, async (req, res) => {
  try {
    await db.query(
      'INSERT INTO community_members (community_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, req.user.id]
    );
    await db.query(
      'UPDATE communities SET member_count = (SELECT COUNT(*) FROM community_members WHERE community_id = $1) WHERE id = $1',
      [req.params.id]
    );
    res.json({ joined: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/communities/:id/join
router.delete('/:id/join', authenticate, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM community_members WHERE community_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    await db.query(
      'UPDATE communities SET member_count = (SELECT COUNT(*) FROM community_members WHERE community_id = $1) WHERE id = $1',
      [req.params.id]
    );
    res.json({ joined: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GROUPS ──────────────────────────────────────────────────────

// GET /api/groups/:id
router.get('/groups/:id', optionalAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT g.*, c.name AS community_name, c.slug AS community_slug
       FROM groups g JOIN communities c ON g.community_id = c.id
       WHERE g.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Group not found' });
    const group = rows[0];

    if (req.user) {
      const m = await db.query(
        'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
        [group.id, req.user.id]
      );
      group.membership = m.rows[0] || null;
    }
    res.json(group);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/groups/:id/join
router.post('/groups/:id/join', authenticate, async (req, res) => {
  try {
    await db.query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, req.user.id]
    );
    await db.query(
      'UPDATE groups SET member_count = (SELECT COUNT(*) FROM group_members WHERE group_id = $1) WHERE id = $1',
      [req.params.id]
    );
    res.json({ joined: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
