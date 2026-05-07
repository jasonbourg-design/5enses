import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomNav from './components/layout/BottomNav';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import BusinessPage from './pages/BusinessPage';
import RatePage from './pages/RatePage';
import CommunityListPage, { CommunityDetailPage } from './pages/CommunityPage';
import NotificationsPage from './pages/NotificationsPage';
import CreatePostPage from './pages/CreatePostPage';
import PostPage from './pages/PostPage';
import ProfilePage from './pages/ProfilePage';
import api from './utils/api';

function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

function AppShell() {
  const { isLoggedIn } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isLoggedIn) return;
    const fetchUnread = async () => {
      try {
        const { data } = await api.get('/notifications?limit=1');
        setUnreadCount(data.unread_count || 0);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  return (
    <div className="app-shell">
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />

        {/* Main app */}
        <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />

        {/* Business */}
        <Route path="/business/:slug" element={<ProtectedRoute><BusinessPage /></ProtectedRoute>} />
        <Route path="/rate/:businessId" element={<ProtectedRoute><RatePage /></ProtectedRoute>} />

        {/* Community */}
        <Route path="/community" element={<ProtectedRoute><CommunityListPage /></ProtectedRoute>} />
        <Route path="/community/:slug" element={<ProtectedRoute><CommunityDetailPage /></ProtectedRoute>} />

        {/* Posts */}
        <Route path="/create" element={<ProtectedRoute><CreatePostPage /></ProtectedRoute>} />
        <Route path="/post/:id" element={<ProtectedRoute><PostPage /></ProtectedRoute>} />

        {/* Notifications */}
        <Route path="/notifications" element={
          <ProtectedRoute>
            <NotificationsPage onRead={setUnreadCount} />
          </ProtectedRoute>
        } />

        {/* Profile */}
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/user/:username" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

        {/* Redirects */}
        <Route path="/" element={<Navigate to={isLoggedIn ? "/home" : "/login"} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <BottomNav unreadCount={unreadCount} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}
