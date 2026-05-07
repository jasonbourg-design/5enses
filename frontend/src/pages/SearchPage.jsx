import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import BusinessCard from '../components/common/BusinessCard';
import PostCard from '../components/common/PostCard';
import './SearchPage.css';

const FILTERS = ['All', 'Businesses', 'Posts', 'People', 'Communities'];
const SORT_OPTS = [
  { value: 'rating', label: 'Top Rated' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'A–Z' },
];
const PRICE_OPTS = [
  { value: '', label: 'Any' },
  { value: '1', label: '$' },
  { value: '2', label: '$$' },
  { value: '3', label: '$$$' },
  { value: '4', label: '$$$$' },
];

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeFilter, setActiveFilter] = useState(0);
  const [results, setResults] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPrice, setSelectedPrice] = useState('');
  const [sort, setSort] = useState('rating');
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    api.get('/search/categories').then(r => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = async (q) => {
    if (!q || q.trim().length < 2) { setResults({}); return; }
    setLoading(true);
    try {
      const typeMap = ['all', 'businesses', 'posts', 'users', 'communities'];
      const params = new URLSearchParams({
        q,
        type: typeMap[activeFilter] || 'all',
        sort,
        ...(selectedCategory && { category: selectedCategory }),
        ...(selectedPrice && { price_range: selectedPrice }),
      });
      const { data } = await api.get(`/search?${params}`);
      setResults(data.results || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = (val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 400);
  };

  useEffect(() => {
    if (query) doSearch(query);
  }, [activeFilter, sort, selectedCategory, selectedPrice]);

  const hasResults = Object.values(results).some(arr => arr?.length > 0);
  const totalCount = Object.values(results).reduce((acc, arr) => acc + (arr?.length || 0), 0);

  return (
    <div className="page">
      {/* Search header */}
      <div className="search-header">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            ref={inputRef}
            className="search-input"
            type="text"
            placeholder="Search places, people, posts…"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
          />
          {query && (
            <button className="search-clear" onClick={() => { setQuery(''); setResults({}); }}>✕</button>
          )}
        </div>
        <button
          className={`filter-btn ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(f => !f)}
        >
          ⚙️
        </button>
      </div>

      {/* Type filters */}
      <div className="search-filters-row">
        {FILTERS.map((f, i) => (
          <button
            key={f}
            className={`filter-chip ${activeFilter === i ? 'active' : ''}`}
            onClick={() => setActiveFilter(i)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <div className="search-advanced card animate-fade-in">
          <div className="adv-row">
            <label>Sort</label>
            <div className="adv-opts">
              {SORT_OPTS.map(o => (
                <button key={o.value} className={`adv-chip ${sort === o.value ? 'active' : ''}`}
                  onClick={() => setSort(o.value)}>{o.label}</button>
              ))}
            </div>
          </div>
          {(activeFilter === 0 || activeFilter === 1) && (
            <>
              <div className="adv-row">
                <label>Category</label>
                <div className="adv-opts" style={{ flexWrap: 'wrap' }}>
                  <button className={`adv-chip ${!selectedCategory ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('')}>All</button>
                  {categories.map(c => (
                    <button key={c.id} className={`adv-chip ${selectedCategory === c.slug ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(c.slug)}>
                      {c.icon} {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="adv-row">
                <label>Price</label>
                <div className="adv-opts">
                  {PRICE_OPTS.map(o => (
                    <button key={o.value} className={`adv-chip ${selectedPrice === o.value ? 'active' : ''}`}
                      onClick={() => setSelectedPrice(o.value)}>{o.label}</button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Body */}
      <div className="search-body">
        {!query && (
          <div className="search-start">
            <h2>Discover by sense</h2>
            <div className="sense-categories">
              {categories.map(cat => (
                <button key={cat.id} className="sense-cat-btn"
                  onClick={() => { setSelectedCategory(cat.slug); setQuery(cat.name); doSearch(cat.name); }}>
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {query && loading && (
          <div className="search-loading">
            <div className="spinner" />
            <span>Searching…</span>
          </div>
        )}

        {query && !loading && !hasResults && query.length >= 2 && (
          <div className="empty-state">
            <span className="icon">🔍</span>
            <h3>No results for "{query}"</h3>
            <p>Try different keywords or browse categories</p>
          </div>
        )}

        {!loading && hasResults && (
          <div className="search-results animate-fade-in">
            {query && (
              <p className="results-count">{totalCount} result{totalCount !== 1 ? 's' : ''} for "{query}"</p>
            )}

            {results.businesses?.length > 0 && (activeFilter === 0 || activeFilter === 1) && (
              <section className="results-section">
                <h3 className="results-section-title">Places</h3>
                <div className="results-list">
                  {results.businesses.map(b => <BusinessCard key={b.id} business={b} variant="horizontal" />)}
                </div>
              </section>
            )}

            {results.users?.length > 0 && (activeFilter === 0 || activeFilter === 3) && (
              <section className="results-section">
                <h3 className="results-section-title">People</h3>
                <div className="results-list">
                  {results.users.map(u => <UserResult key={u.id} user={u} />)}
                </div>
              </section>
            )}

            {results.posts?.length > 0 && (activeFilter === 0 || activeFilter === 2) && (
              <section className="results-section">
                <h3 className="results-section-title">Posts</h3>
                <div className="results-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {results.posts.map(p => <PostCard key={p.id} post={p} compact />)}
                </div>
              </section>
            )}

            {results.communities?.length > 0 && (activeFilter === 0 || activeFilter === 4) && (
              <section className="results-section">
                <h3 className="results-section-title">Communities</h3>
                <div className="results-list">
                  {results.communities.map(c => <CommunityResult key={c.id} community={c} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function UserResult({ user }) {
  return (
    <a href={`/user/${user.username}`} className="user-result">
      {user.avatar_url
        ? <img src={user.avatar_url} className="avatar avatar-md" alt={user.display_name} />
        : <div className="avatar avatar-md avatar-placeholder">{(user.display_name || user.username || '?')[0].toUpperCase()}</div>
      }
      <div className="user-result-info">
        <span className="user-result-name">{user.display_name || user.username}</span>
        <span className="user-result-username">@{user.username}</span>
        {user.bio && <span className="user-result-bio">{user.bio}</span>}
      </div>
      <span className="user-result-followers">{user.follower_count || 0} followers</span>
    </a>
  );
}

function CommunityResult({ community }) {
  return (
    <a href={`/community/${community.slug}`} className="community-result">
      <div className="community-result-icon">
        {community.icon || community.name[0]}
      </div>
      <div className="community-result-info">
        <span className="community-result-name">{community.name}</span>
        {community.description && (
          <span className="community-result-desc">{community.description.slice(0, 80)}…</span>
        )}
        <span className="community-result-members">{community.member_count || 0} members</span>
      </div>
    </a>
  );
}
