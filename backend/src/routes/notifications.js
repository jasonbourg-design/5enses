const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/notifications
router.get('/', authenticate, async (req, res) => {
  const { page = 1, limit = 30, unread_only } = req.query;
  const offset = (page - 1) * limit;
  const conditions = ['n.recipient_id = $1'];
  if (unread_only === 'true') conditions.push('n.is_read = false');

  try {
    const { rows } = await db.query(
      `SELECT n.*, u.username AS actor_username, u.display_name AS actor_display_name, u.avatar_url AS actor_avatar
       FROM notifications n
       LEFT JOIN users u ON n.actor_id = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, parseInt(limit), parseInt(offset)]
    );

    const unreadCount = await db.query(
      'SELECT COUNT(*) FROM notifications WHERE recipient_id = $1 AND is_read = false',
      [req.user.id]
    );

    res.json({ notifications: rows, unread_count: parseInt(unreadCount.rows[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = true WHERE recipient_id = $1 AND is_read = false',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND recipient_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper: create a notification (internal use)
const createNotification = async (recipientId, actorId, type, entityId, entityType, message) => {
  if (recipientId === actorId) return; // don't notify yourself
  try {
    await db.query(
      `INSERT INTO notifications (recipient_id, actor_id, type, entity_id, entity_type, message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [recipientId, actorId, type, entityId, entityType, message]
    );
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
};

module.exports = router;
module.exports.createNotification = createNotification;
