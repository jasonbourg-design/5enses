import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/common/PostCard';
import './CommunityPage.css';

export default function CommunityListPage() {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/communities').then(r => setCommunities(r.data.communities || [])).finally(() => setLoading(false));
  }, []);

  const handleJoin = async (e, community) => {
    e.preventDefault();
    try {
      if (community.is_member) {
        await api.delete(`/communities/${community.id}/join`);
        setCommunities(cs => cs.map(c => c.id === community.id ? { ...c, is_member: false, member_count: c.member_count - 1 } : c));
      } else {
        await api.post(`/communities/${community.id}/join`);
        setCommunities(cs => cs.map(c => c.id === community.id ? { ...c, is_member: true, member_count: c.member_count + 1 } : c));
      }
    } catch {}
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Community</h1>
      </div>

      <div className="community-list-body">
        {/* Groups CTA */}
        <div className="community-banner card">
          <div className="community-banner-text">
            <h2>Find your people</h2>
            <p>Join communities of people who experience the world like you do</p>
          </div>
          <span className="community-banner-emoji">🌍</span>
        </div>

        {loading
          ? Array(4).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />)
          : communities.map(c => (
              <Link key={c.id} to={`/community/${c.slug}`} className="community-item card">
                <div className="community-item-img">
                  {c.cover_image ? <img src={c.cover_image} alt={c.name} /> : <span>{c.icon || c.name[0]}</span>}
                </div>
                <div className="community-item-info">
                  <h3>{c.name}</h3>
                  {c.description && <p>{c.description.slice(0, 80)}</p>}
                  <span className="community-member-count">{c.member_count?.toLocaleString() || 0} members</span>
                </div>
                <button
                  className={`btn btn-sm ${c.is_member ? 'btn-outline' : 'btn-primary'}`}
                  onClick={e => handleJoin(e, c)}
                >
                  {c.is_member ? 'Joined' : 'Join'}
                </button>
              </Link>
            ))
        }
      </div>
    </div>
  );
}

export function CommunityDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');

  useEffect(() => {
    const load = async () => {
      try {
        const [commRes, postsRes] = await Promise.all([
          api.get(`/communities/${slug}`),
          api.get(`/posts?community_id=TODO&limit=10`),
        ]);
        setCommunity(commRes.data);
        setPosts(postsRes.data.posts || []);
      } catch { navigate('/community'); }
      finally { setLoading(false); }
    };
    load();
  }, [slug]);

  const handleJoin = async () => {
    if (!isLoggedIn) return navigate('/login');
    try {
      if (community.membership) {
        await api.delete(`/communities/${community.id}/join`);
        setCommunity(c => ({ ...c, membership: null, member_count: c.member_count - 1 }));
      } else {
        await api.post(`/communities/${community.id}/join`);
        setCommunity(c => ({ ...c, membership: { role: 'member' }, member_count: c.member_count + 1 }));
      }
    } catch {}
  };

  if (loading) return <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;

  return (
    <div className="page">
      {/* Hero */}
      <div className="community-hero">
        {community?.cover_image
          ? <img src={community.cover_image} alt={community.name} className="community-hero-img" />
          : <div className="community-hero-placeholder">{community?.icon || community?.name[0]}</div>
        }
        <button className="community-back" onClick={() => navigate(-1)}>←</button>
        <div className="community-hero-overlay" />
        <div className="community-hero-info">
          <h1>{community?.name}</h1>
          <p>{community?.member_count?.toLocaleString()} members</p>
        </div>
      </div>

      {/* Actions */}
      <div className="community-actions">
        <button
          className={`btn ${community?.membership ? 'btn-outline' : 'btn-primary'}`}
          onClick={handleJoin}
        >
          {community?.membership ? '✓ Joined' : '+ Join Community'}
        </button>
        {community?.membership && (
          <Link to="/create" className="btn btn-outline">✏️ Post</Link>
        )}
      </div>

      {community?.description && (
        <p className="community-desc">{community.description}</p>
      )}

      {/* Groups */}
      {community?.groups?.length > 0 && (
        <div className="community-groups-section">
          <h3 className="section-mini-title">Groups</h3>
          <div className="groups-scroll">
            {community.groups.map(g => (
              <div key={g.id} className="group-chip card">
                <span className="group-chip-name">{g.name}</span>
                <span className="group-chip-count">{g.member_count} members</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="community-tabs">
        {['posts', 'about'].map(tab => (
          <button key={tab} className={`community-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="community-tab-body">
        {activeTab === 'posts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {posts.length === 0
              ? <div className="empty-state"><span className="icon">📝</span><h3>No posts yet</h3></div>
              : posts.map(p => <PostCard key={p.id} post={p} compact />)
            }
          </div>
        )}
        {activeTab === 'about' && (
          <div className="card" style={{ padding: 16 }}>
            <p style={{ color: 'var(--clr-text-2)', fontSize: '0.9rem', lineHeight: 1.7 }}>
              {community?.description || 'No description provided.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
