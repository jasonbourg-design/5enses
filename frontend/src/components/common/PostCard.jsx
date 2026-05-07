import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import './PostCard.css';

export default function PostCard({ post: initialPost, compact = false }) {
  const [post, setPost] = useState(initialPost);
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const handleLike = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) return navigate('/login');
    try {
      if (post.user_liked) {
        const { data } = await api.delete(`/posts/${post.id}/like`);
        setPost(p => ({ ...p, user_liked: false, like_count: data.like_count }));
      } else {
        const { data } = await api.post(`/posts/${post.id}/like`);
        setPost(p => ({ ...p, user_liked: true, like_count: data.like_count }));
      }
    } catch (_) {}
  };

  const avatarUrl = post.avatar_url;
  const displayName = post.display_name || post.username;
  const timeAgo = post.created_at ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true }) : '';

  return (
    <article className={`post-card card ${compact ? 'compact' : ''} animate-fade-in`}>
      <div className="post-card__header">
        <Link to={`/user/${post.username}`} className="post-author">
          {avatarUrl
            ? <img src={avatarUrl} alt={displayName} className="avatar avatar-sm" />
            : <div className="avatar avatar-sm avatar-placeholder">{(displayName || '?')[0].toUpperCase()}</div>
          }
          <div>
            <span className="author-name">{displayName}</span>
            <span className="post-time">{timeAgo}</span>
          </div>
        </Link>
        {(post.community_name || post.group_name) && (
          <Link
            to={post.community_slug ? `/community/${post.community_slug}` : '#'}
            className="post-community-tag"
          >
            {post.community_name || post.group_name}
          </Link>
        )}
      </div>

      <Link to={`/post/${post.id}`} className="post-card__body">
        {post.title && <h3 className="post-title">{post.title}</h3>}
        {post.body && (
          <p className={`post-body ${compact ? 'clamped' : ''}`}>{post.body}</p>
        )}
        {post.images?.length > 0 && (
          <div className={`post-images count-${Math.min(post.images.length, 4)}`}>
            {post.images.slice(0, 4).map((img, i) => (
              <img key={i} src={img} alt="" loading="lazy" />
            ))}
          </div>
        )}
      </Link>

      <div className="post-card__actions">
        <button
          className={`post-action ${post.user_liked ? 'liked' : ''}`}
          onClick={handleLike}
        >
          <span className="action-icon">{post.user_liked ? '❤️' : '🤍'}</span>
          <span>{post.like_count || 0}</span>
        </button>
        <Link to={`/post/${post.id}`} className="post-action">
          <span className="action-icon">💬</span>
          <span>{post.comment_count || 0}</span>
        </Link>
        <button className="post-action">
          <span className="action-icon">↗️</span>
          <span>Share</span>
        </button>
      </div>
    </article>
  );
}
