import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './CreatePostPage.css';

const POST_TYPES = [
  { value: 'text', label: '✍️ Text', desc: 'Share your thoughts' },
  { value: 'image', label: '📷 Photo', desc: 'Share an image' },
  { value: 'link', label: '🔗 Link', desc: 'Share a link' },
  { value: 'rating_share', label: '⭐ Rating', desc: 'Share a review' },
];

export default function CreatePostPage() {
  const navigate = useNavigate();
  const [postType, setPostType] = useState('text');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [communities, setCommunities] = useState([]);
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/communities').then(r => setCommunities(r.data.communities || [])).catch(() => {});
  }, []);

  const canSubmit = postType === 'text'
    ? body.trim().length > 0
    : postType === 'link'
    ? linkUrl.trim().length > 0
    : body.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        post_type: postType,
        title: title.trim() || undefined,
        body: body.trim() || undefined,
        link_url: linkUrl.trim() || undefined,
        community_id: selectedCommunity || undefined,
      };
      const { data } = await api.post('/posts', payload);
      navigate(`/post/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page create-page">
      {/* Header */}
      <div className="create-header">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>✕</button>
        <h1>Create Post</h1>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Post'}
        </button>
      </div>

      <div className="create-body">
        {/* Post type selector */}
        <div className="post-type-row">
          {POST_TYPES.map(t => (
            <button
              key={t.value}
              className={`post-type-btn ${postType === t.value ? 'active' : ''}`}
              onClick={() => setPostType(t.value)}
            >
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Community selector */}
        <div className="create-community-row">
          <span className="create-label">Post to:</span>
          <select
            className="create-select"
            value={selectedCommunity}
            onChange={e => setSelectedCommunity(e.target.value)}
          >
            <option value="">My Profile</option>
            {communities.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Title */}
        <input
          className="input create-title-input"
          type="text"
          placeholder="Title (optional)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={300}
        />

        {/* Body / URL */}
        {postType === 'link' ? (
          <input
            className="input"
            type="url"
            placeholder="https://..."
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
          />
        ) : (
          <textarea
            className="input create-textarea"
            placeholder={
              postType === 'text' ? "What's on your mind?"
              : postType === 'image' ? "Add a caption…"
              : "Describe the rating…"
            }
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={6}
            maxLength={10000}
          />
        )}

        {postType === 'image' && (
          <div className="create-image-upload">
            <div className="upload-zone">
              <span>📷</span>
              <p>Tap to add photos</p>
              <span className="upload-hint">Up to 4 images</span>
            </div>
          </div>
        )}

        {error && (
          <div className="create-error">{error}</div>
        )}

        {/* Tips */}
        <div className="create-tip card">
          <p>💡 <strong>Tip:</strong> Posts in a community reach more people who care about sensory experiences.</p>
        </div>
      </div>
    </div>
  );
}
