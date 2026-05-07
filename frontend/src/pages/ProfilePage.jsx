import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { SenseDots } from '../components/common/SenseScore';
import './ProfilePage.css';

export default function ProfilePage() {
  const { username } = useParams();
  const { user: me, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const isOwnProfile = !username || username === me?.username;
  const targetUsername = username || me?.username;

  const [profile, setProfile] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ratings');
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (!targetUsername) return;
    const load = async () => {
      setLoading(true);
      try {
        const [profileRes, ratingsRes] = await Promise.all([
          api.get(`/users/${targetUsername}`),
          api.get(`/users/${targetUsername}/ratings`),
        ]);
        setProfile(profileRes.data);
        setRatings(ratingsRes.data.ratings || []);
        setFollowing(profileRes.data.is_following || false);
      } catch { navigate('/home'); }
      finally { setLoading(false); }
    };
    load();
  }, [targetUsername]);

  const handleFollow = async () => {
    if (!isLoggedIn) return navigate('/login');
    try {
      if (following) {
        await api.delete(`/users/${profile.id}/follow`);
        setFollowing(false);
        setProfile(p => ({ ...p, follower_count: p.follower_count - 1 }));
      } else {
        await api.post(`/users/${profile.id}/follow`);
        setFollowing(true);
        setProfile(p => ({ ...p, follower_count: p.follower_count + 1 }));
      }
    } catch {}
  };

  if (loading) return (
    <div className="page">
      <div className="profile-hero-skeleton skeleton" />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[60, 100, 80].map((h, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 12 }} />)}
      </div>
    </div>
  );

  return (
    <div className="page profile-page">
      {/* Header */}
      <div className="profile-header-bar">
        {!isOwnProfile && (
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>←</button>
        )}
        <span className="profile-header-username">@{profile?.username}</span>
        {isOwnProfile && (
          <button className="btn btn-ghost btn-sm profile-logout" onClick={logout}>Sign out</button>
        )}
      </div>

      {/* Avatar + info */}
      <div className="profile-hero">
        <div className="profile-avatar-wrap">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} className="avatar avatar-xl profile-avatar" alt={profile.display_name} />
            : <div className="avatar avatar-xl profile-avatar avatar-placeholder-lg">
                {(profile?.display_name || profile?.username || '?')[0].toUpperCase()}
              </div>
          }
        </div>
        <div className="profile-info">
          <h1 className="profile-display-name">{profile?.display_name}</h1>
          {profile?.bio && <p className="profile-bio">{profile.bio}</p>}
          {profile?.location && <span className="profile-location">📍 {profile.location}</span>}
        </div>
      </div>

      {/* Stats */}
      <div className="profile-stats">
        <div className="stat-item">
          <span className="stat-num">{profile?.rating_count || 0}</span>
          <span className="stat-label">Reviews</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-num">{profile?.follower_count || 0}</span>
          <span className="stat-label">Followers</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-num">{profile?.following_count || 0}</span>
          <span className="stat-label">Following</span>
        </div>
      </div>

      {/* Actions */}
      {!isOwnProfile && (
        <div className="profile-actions">
          <button
            className={`btn ${following ? 'btn-outline' : 'btn-primary'}`}
            style={{ flex: 1 }}
            onClick={handleFollow}
          >
            {following ? '✓ Following' : '+ Follow'}
          </button>
        </div>
      )}
      {isOwnProfile && (
        <div className="profile-actions">
          <Link to="/settings/profile" className="btn btn-outline" style={{ flex: 1 }}>Edit Profile</Link>
        </div>
      )}

      {/* Tabs */}
      <div className="profile-tabs">
        {['ratings', 'posts'].map(tab => (
          <button
            key={tab}
            className={`profile-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="profile-tab-body">
        {activeTab === 'ratings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ratings.length === 0 ? (
              <div className="empty-state">
                <span className="icon">⭐</span>
                <h3>No reviews yet</h3>
                {isOwnProfile && <Link to="/search" className="btn btn-primary">Find places to review</Link>}
              </div>
            ) : ratings.map(r => <ProfileRatingCard key={r.id} rating={r} />)
            }
          </div>
        )}
        {activeTab === 'posts' && (
          <div className="empty-state">
            <span className="icon">📝</span>
            <h3>No posts yet</h3>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileRatingCard({ rating }) {
  return (
    <Link to={`/business/${rating.business_slug}`} className="profile-rating-card card">
      <div className="prc-left">
        {rating.cover_image_url
          ? <img src={rating.cover_image_url} className="prc-img" alt={rating.business_name} />
          : <div className="prc-img prc-img-placeholder">{rating.business_name?.[0]}</div>
        }
      </div>
      <div className="prc-body">
        <h4 className="prc-name">{rating.business_name}</h4>
        <span className="prc-cat">{rating.category}</span>
        <SenseDots scores={rating} size="sm" />
        {rating.review_text && (
          <p className="prc-review">{rating.review_text.slice(0, 80)}{rating.review_text.length > 80 ? '…' : ''}</p>
        )}
      </div>
      <div className="prc-score">
        <span>{Number(rating.overall).toFixed(1)}</span>
        <span className="prc-star">★</span>
      </div>
    </Link>
  );
}
