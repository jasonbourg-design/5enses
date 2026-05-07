import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { SenseScoreBars, OverallScore, SenseDots } from '../components/common/SenseScore';
import { formatDistanceToNow } from 'date-fns';
import './BusinessPage.css';

const PRICE = ['', '$', '$$', '$$$', '$$$$'];
const SENSE_FILTERS = [
  { key: '', label: 'All' },
  { key: 'sight', label: '👁️ Sight' },
  { key: 'sound', label: '👂 Sound' },
  { key: 'smell', label: '👃 Smell' },
  { key: 'taste', label: '👅 Taste' },
  { key: 'touch', label: '🤚 Touch' },
];
const SORT_OPTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'helpful', label: 'Most Helpful' },
  { value: 'highest', label: 'Highest' },
  { value: 'lowest', label: 'Lowest' },
];

export default function BusinessPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [business, setBusiness] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [senseFilter, setSenseFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/businesses/${slug}`);
        setBusiness(data);
        setSaved(data.is_saved || false);
        loadRatings(data.id);
      } catch { navigate('/search'); }
      finally { setLoading(false); }
    };
    load();
  }, [slug]);

  const loadRatings = async (bizId, filter = '', sortBy = 'newest') => {
    setRatingsLoading(true);
    try {
      const id = bizId || business?.id;
      const { data } = await api.get(`/businesses/${id}/ratings?sense_filter=${filter}&sort=${sortBy}`);
      setRatings(data.ratings || []);
    } catch {} finally { setRatingsLoading(false); }
  };

  const handleSave = async () => {
    if (!isLoggedIn) return navigate('/login');
    try {
      if (saved) { await api.delete(`/businesses/${business.id}/save`); setSaved(false); }
      else { await api.post(`/businesses/${business.id}/save`); setSaved(true); }
    } catch {}
  };

  const handleFilterChange = (f) => { setSenseFilter(f); loadRatings(null, f, sort); };
  const handleSortChange = (s) => { setSort(s); loadRatings(null, senseFilter, s); };

  if (loading) return (
    <div className="page">
      <div className="biz-hero skeleton" style={{ height: 240 }} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[180, 120, 200].map((h, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 12 }} />)}
      </div>
    </div>
  );

  if (!business) return null;

  return (
    <div className="page biz-page">
      {/* Hero */}
      <div className="biz-hero">
        {business.cover_image_url
          ? <img src={business.cover_image_url} alt={business.name} className="biz-hero-img" />
          : <div className="biz-hero-placeholder">{business.name[0]}</div>
        }
        <div className="biz-hero-overlay" />
        <button className="biz-back-btn" onClick={() => navigate(-1)}>←</button>
        <button className={`biz-save-btn ${saved ? 'saved' : ''}`} onClick={handleSave}>
          {saved ? '🔖' : '🏷️'}
        </button>
      </div>

      {/* Info */}
      <div className="biz-info">
        <div className="biz-info-header">
          <div>
            <h1 className="biz-name">{business.name}</h1>
            <p className="biz-meta">
              {business.category}
              {business.price_range && ` · ${PRICE[business.price_range]}`}
              {business.city && ` · ${business.city}`}
            </p>
          </div>
          {business.avg_overall != null && (
            <OverallScore score={business.avg_overall} count={business.rating_count} />
          )}
        </div>

        {/* Quick actions */}
        <div className="biz-actions">
          <Link to={`/rate/${business.id}`} className="btn btn-primary btn-sm">
            ⭐ Rate It
          </Link>
          {business.phone && (
            <a href={`tel:${business.phone}`} className="btn btn-outline btn-sm">📞 Call</a>
          )}
          {business.website && (
            <a href={business.website} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">🌐 Website</a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="biz-tabs">
        {['overview', 'ratings', 'photos'].map(tab => (
          <button
            key={tab}
            className={`biz-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="biz-tab-body">
        {activeTab === 'overview' && (
          <div className="biz-overview animate-fade-in">
            {/* Sensory breakdown */}
            {business.avg_overall != null && (
              <div className="card biz-senses-card">
                <h3 className="card-section-title">Sensory Breakdown</h3>
                <SenseScoreBars scores={business} />
              </div>
            )}

            {/* Description */}
            {business.description && (
              <div className="card biz-description">
                <p>{business.description}</p>
              </div>
            )}

            {/* Details */}
            <div className="card biz-details">
              <h3 className="card-section-title">Details</h3>
              {business.address && (
                <div className="detail-row">
                  <span className="detail-icon">📍</span>
                  <span>{business.address}, {business.city}, {business.state}</span>
                </div>
              )}
              {business.phone && (
                <div className="detail-row">
                  <span className="detail-icon">📞</span>
                  <a href={`tel:${business.phone}`}>{business.phone}</a>
                </div>
              )}
              {business.website && (
                <div className="detail-row">
                  <span className="detail-icon">🌐</span>
                  <a href={business.website} target="_blank" rel="noreferrer" className="detail-link">
                    {business.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              {business.hours && (
                <div className="detail-row detail-hours">
                  <span className="detail-icon">🕐</span>
                  <div className="hours-grid">
                    {Object.entries(business.hours).map(([day, h]) => (
                      <span key={day}><strong>{day}:</strong> {h}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ratings' && (
          <div className="biz-ratings animate-fade-in">
            {/* Sense filter pills */}
            <div className="sense-filter-row">
              {SENSE_FILTERS.map(f => (
                <button
                  key={f.key}
                  className={`filter-chip ${senseFilter === f.key ? 'active' : ''}`}
                  onClick={() => handleFilterChange(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="ratings-sort-row">
              <span className="sort-label">Sort by:</span>
              <select className="sort-select" value={sort} onChange={e => handleSortChange(e.target.value)}>
                {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {ratingsLoading
              ? <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
              : ratings.length === 0
                ? (
                  <div className="empty-state">
                    <span className="icon">⭐</span>
                    <h3>No reviews yet</h3>
                    <p>Be the first to rate this place!</p>
                    <Link to={`/rate/${business.id}`} className="btn btn-primary">Write a Review</Link>
                  </div>
                )
                : ratings.map(r => <RatingCard key={r.id} rating={r} />)
            }
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="biz-photos animate-fade-in">
            {business.images?.length > 0
              ? (
                <div className="photos-grid">
                  {business.images.map((img, i) => (
                    <img key={i} src={img} alt="" className="photo-thumb" loading="lazy" />
                  ))}
                </div>
              )
              : (
                <div className="empty-state">
                  <span className="icon">📷</span>
                  <h3>No photos yet</h3>
                </div>
              )
            }
          </div>
        )}
      </div>
    </div>
  );
}

function RatingCard({ rating }) {
  const timeAgo = formatDistanceToNow(new Date(rating.created_at), { addSuffix: true });
  return (
    <div className="rating-card card animate-fade-in">
      <div className="rating-card-header">
        <div className="rating-author">
          {rating.avatar_url
            ? <img src={rating.avatar_url} className="avatar avatar-sm" alt={rating.display_name} />
            : <div className="avatar avatar-sm avatar-placeholder">{(rating.display_name || '?')[0]}</div>
          }
          <div>
            <span className="rating-author-name">{rating.display_name || rating.username}</span>
            <span className="rating-time">{timeAgo}</span>
          </div>
        </div>
        <div className="rating-overall-badge">
          {Number(rating.overall).toFixed(1)} ★
        </div>
      </div>
      <SenseDots scores={rating} size="sm" />
      {rating.review_text && <p className="rating-text">{rating.review_text}</p>}
      {rating.images?.length > 0 && (
        <div className="rating-images">
          {rating.images.map((img, i) => <img key={i} src={img} alt="" className="rating-img-thumb" />)}
        </div>
      )}
      <div className="rating-card-footer">
        <button className="btn btn-ghost btn-sm">👍 Helpful ({rating.helpful_count || 0})</button>
      </div>
    </div>
  );
}
