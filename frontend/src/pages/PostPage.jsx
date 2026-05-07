import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import './PostPage.css';

export default function PostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [postRes, commentsRes] = await Promise.all([
          api.get(`/posts/${id}`),
          api.get(`/posts/${id}/comments`),
        ]);
        setPost(postRes.data);
        setComments(commentsRes.data.comments || []);
      } catch { navigate(-1); }
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  const handleLike = async () => {
    if (!isLoggedIn) return navigate('/login');
    try {
      if (post.user_liked) {
        const { data } = await api.delete(`/posts/${id}/like`);
        setPost(p => ({ ...p, user_liked: false, like_count: data.like_count }));
      } else {
        const { data } = await api.post(`/posts/${id}/like`);
        setPost(p => ({ ...p, user_liked: true, like_count: data.like_count }));
      }
    } catch {}
  };

  const handleComment = async () => {
    if (!commentText.trim() || !isLoggedIn) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/posts/${id}/comments`, { body: commentText.trim() });
      setComments(cs => [...cs, {
        ...data,
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
      }]);
      setCommentText('');
      setPost(p => ({ ...p, comment_count: (p.comment_count || 0) + 1 }));
    } catch {} finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  );

  const timeAgo = post?.created_at ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true }) : '';

  return (
    <div className="page post-page">
      {/* Header */}
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>←</button>
        <h1>Post</h1>
      </div>

      {/* Post */}
      <article className="post-full">
        {/* Author */}
        <div className="post-full-author">
          <Link to={`/user/${post.username}`} className="post-author-link">
            {post.avatar_url
              ? <img src={post.avatar_url} className="avatar avatar-md" alt={post.display_name} />
              : <div className="avatar avatar-md avatar-placeholder">{(post.display_name || '?')[0].toUpperCase()}</div>
            }
            <div>
              <span className="author-name">{post.display_name || post.username}</span>
              <span className="author-handle">@{post.username} · {timeAgo}</span>
            </div>
          </Link>
          {post.community_name && (
            <Link to={`/community/${post.community_slug}`} className="post-community-badge">
              {post.community_name}
            </Link>
          )}
        </div>

        {/* Content */}
        {post.title && <h2 className="post-full-title">{post.title}</h2>}
        {post.body && <p className="post-full-body">{post.body}</p>}

        {post.images?.length > 0 && (
          <div className="post-full-images">
            {post.images.map((img, i) => <img key={i} src={img} alt="" />)}
          </div>
        )}

        {/* Actions */}
        <div className="post-full-actions">
          <button
            className={`post-action-btn ${post.user_liked ? 'liked' : ''}`}
            onClick={handleLike}
          >
            <span>{post.user_liked ? '❤️' : '🤍'}</span>
            <span>{post.like_count || 0} likes</span>
          </button>
          <button className="post-action-btn" onClick={() => inputRef.current?.focus()}>
            <span>💬</span>
            <span>{post.comment_count || 0} comments</span>
          </button>
          <button className="post-action-btn">
            <span>↗️</span>
            <span>Share</span>
          </button>
        </div>
      </article>

      <div className="divider" />

      {/* Comments */}
      <div className="comments-section">
        <h3 className="comments-title">{comments.length} Comment{comments.length !== 1 ? 's' : ''}</h3>

        {comments.map(c => (
          <div key={c.id} className="comment-item animate-fade-in">
            <Link to={`/user/${c.username}`}>
              {c.avatar_url
                ? <img src={c.avatar_url} className="avatar avatar-sm" alt={c.display_name} />
                : <div className="avatar avatar-sm avatar-placeholder">{(c.display_name || '?')[0].toUpperCase()}</div>
              }
            </Link>
            <div className="comment-body">
              <div className="comment-header">
                <span className="comment-author">{c.display_name || c.username}</span>
                <span className="comment-time">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
              </div>
              <p className="comment-text">{c.body}</p>
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <span className="icon">💬</span>
            <p>Be the first to comment!</p>
          </div>
        )}
      </div>

      {/* Comment input */}
      {isLoggedIn && (
        <div className="comment-input-bar">
          {user?.avatar_url
            ? <img src={user.avatar_url} className="avatar avatar-sm" alt={user.display_name} />
            : <div className="avatar avatar-sm avatar-placeholder">{(user?.display_name || '?')[0].toUpperCase()}</div>
          }
          <input
            ref={inputRef}
            className="input comment-input"
            type="text"
            placeholder="Add a comment…"
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleComment()}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={handleComment}
            disabled={!commentText.trim() || submitting}
          >
            {submitting ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Post'}
          </button>
        </div>
      )}
    </div>
  );
}
