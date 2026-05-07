import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import api from '../utils/api';
import './NotificationsPage.css';

const NOTIF_ICONS = {
  new_follower: '👤',
  post_like: '❤️',
  comment: '💬',
  comment_like: '❤️',
  rating_helpful: '👍',
  group_invite: '👥',
  community_invite: '🌍',
  mention: '📣',
  new_post_in_group: '📝',
};

export default function NotificationsPage({ onRead }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
      onRead?.(data.unread_count);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(ns => ns.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      onRead?.(0);
    } catch {}
  };

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch {}
  };

  const filtered = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  return (
    <div className="page notif-page">
      <div className="page-header">
        <h1>Notifications</h1>
        {unreadCount > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={markAllRead} style={{ marginLeft: 'auto' }}>
            Mark all read
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="notif-filter-row">
        <button className={`filter-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
        <button className={`filter-chip ${filter === 'unread' ? 'active' : ''}`} onClick={() => setFilter('unread')}>
          Unread {unreadCount > 0 && <span className="notif-count-badge">{unreadCount}</span>}
        </button>
      </div>

      {loading ? (
        <div className="notif-list">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12, margin: '0 16px 8px' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="icon">🔔</span>
          <h3>{filter === 'unread' ? 'All caught up!' : 'No notifications yet'}</h3>
          <p>We'll let you know when something happens</p>
        </div>
      ) : (
        <div className="notif-list">
          {filtered.map(n => (
            <div
              key={n.id}
              className={`notif-item ${!n.is_read ? 'unread' : ''}`}
              onClick={() => !n.is_read && markRead(n.id)}
            >
              <div className="notif-icon-wrap">
                <div className="notif-icon">{NOTIF_ICONS[n.type] || '🔔'}</div>
                {n.actor_avatar ? (
                  <img src={n.actor_avatar} className="notif-actor-avatar" alt={n.actor_display_name} />
                ) : n.actor_username ? (
                  <div className="notif-actor-avatar avatar-placeholder-sm">
                    {(n.actor_display_name || n.actor_username || '?')[0].toUpperCase()}
                  </div>
                ) : null}
              </div>
              <div className="notif-content">
                <p className="notif-message">
                  {n.actor_display_name && <strong>{n.actor_display_name} </strong>}
                  {n.message || formatNotifMessage(n)}
                </p>
                <span className="notif-time">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </span>
              </div>
              {!n.is_read && <div className="notif-unread-dot" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatNotifMessage(n) {
  switch (n.type) {
    case 'new_follower': return 'started following you';
    case 'post_like': return 'liked your post';
    case 'comment': return 'commented on your post';
    case 'comment_like': return 'liked your comment';
    case 'rating_helpful': return 'found your review helpful';
    case 'mention': return 'mentioned you in a post';
    case 'new_post_in_group': return 'posted in a group you follow';
    default: return 'interacted with your content';
  }
}
