import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/common/PostCard';
import BusinessCard from '../components/common/BusinessCard';
import './HomePage.css';

const TABS = ['For You', 'Following', 'Near You'];

export default function HomePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [posts, setPosts] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [postsRes, bizRes] = await Promise.all([
          activeTab === 1 ? api.get('/users/me/feed') : api.get('/posts?limit=10'),
          api.get('/businesses?limit=6&sort=rating'),
        ]);
        setPosts(postsRes.data.posts || []);
        setBusinesses(bizRes.data.businesses || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeTab]);

  return (
    <div className="page">
      {/* Header */}
      <header className="home-header">
        <div className="home-logo">
          <span className="home-logo-mark">5</span>
          <span className="home-logo-text">enses</span>
        </div>
        <Link to="/profile" className="home-avatar">
          {user?.avatar_url
            ? <img src={user.avatar_url} alt={user.display_name} className="avatar avatar-sm" />
            : <div className="avatar avatar-sm avatar-placeholder">{(user?.display_name || user?.username || '?')[0].toUpperCase()}</div>
          }
        </Link>
      </header>

      {/* Greeting */}
      <div className="home-greeting animate-fade-in">
        <h1>Hey, {user?.display_name?.split(' ')[0] || 'there'} 👋</h1>
        <p>Discover experiences through all your senses</p>
      </div>

      {/* Featured businesses */}
      <section className="home-section">
        <div className="section-header">
          <h2>Top Rated Near You</h2>
          <Link to="/search" className="section-link">See all</Link>
        </div>
        <div className="biz-scroll">
          {loading
            ? Array(4).fill(0).map((_, i) => <div key={i} className="biz-scroll-item skeleton" />)
            : businesses.map(b => (
                <div key={b.id} className="biz-scroll-item">
                  <BusinessCard business={b} />
                </div>
              ))
          }
        </div>
      </section>

      {/* Feed tabs */}
      <section className="home-section home-feed">
        <div className="feed-tabs">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              className={`feed-tab ${activeTab === i ? 'active' : ''}`}
              onClick={() => setActiveTab(i)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="feed-posts">
          {loading
            ? Array(3).fill(0).map((_, i) => (
                <div key={i} className="card" style={{ height: 200 }}>
                  <div className="skeleton" style={{ height: '100%' }} />
                </div>
              ))
            : posts.length === 0
              ? (
                <div className="empty-state">
                  <span className="icon">✨</span>
                  <h3>Nothing here yet</h3>
                  <p>Follow people or join communities to see their posts</p>
                  <Link to="/search" className="btn btn-primary">Explore</Link>
                </div>
              )
              : posts.map(p => <PostCard key={p.id} post={p} compact />)
          }
        </div>
      </section>
    </div>
  );
}
