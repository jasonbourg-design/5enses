# 5enses 🎵👁️👃👅🤚

A consumer social app for discovering and reviewing businesses through **all five senses** — sight, sound, smell, taste, and touch.

---

## Stack

| Layer     | Tech                          |
|-----------|-------------------------------|
| Frontend  | React 18, React Router v6, Axios |
| Backend   | Node.js, Express              |
| Database  | PostgreSQL                    |
| Auth      | JWT (Bearer tokens)           |
| Uploads   | Multer (local) → S3-ready     |
| Fonts     | Syne (display) + DM Sans (body) |

---

## Project Structure

```
5enses/
├── backend/
│   ├── src/
│   │   ├── index.js          ← Express app entry
│   │   ├── db/index.js       ← PostgreSQL pool
│   │   ├── middleware/auth.js ← JWT middleware
│   │   └── routes/
│   │       ├── auth.js       ← Register / Login / Me
│   │       ├── businesses.js ← CRUD + save + ratings
│   │       ├── ratings.js    ← 5-sense ratings
│   │       ├── posts.js      ← Feed posts + comments + likes
│   │       ├── communities.js ← Communities + groups + join
│   │       ├── notifications.js ← Notification feed
│   │       ├── search.js     ← Full-text search
│   │       └── users.js      ← Profiles + follow + feed
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── public/index.html
│   ├── src/
│   │   ├── index.js          ← React entry
│   │   ├── App.jsx           ← Router + shell
│   │   ├── index.css         ← Design tokens + global styles
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── utils/
│   │   │   └── api.js        ← Axios client
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   └── BottomNav.jsx
│   │   │   └── common/
│   │   │       ├── SenseScore.jsx  ← ⭐ Core component
│   │   │       ├── BusinessCard.jsx
│   │   │       └── PostCard.jsx
│   │   └── pages/
│   │       ├── AuthPage.jsx        ← Login / Register
│   │       ├── HomePage.jsx        ← Feed + featured places
│   │       ├── SearchPage.jsx      ← Search + filters
│   │       ├── BusinessPage.jsx    ← Profile + ratings
│   │       ├── RatePage.jsx        ← Leave a rating (5 senses)
│   │       ├── CommunityPage.jsx   ← List + detail
│   │       ├── CreatePostPage.jsx  ← New post
│   │       ├── PostPage.jsx        ← View post + comments
│   │       ├── NotificationsPage.jsx
│   │       └── ProfilePage.jsx     ← User profile
│   └── package.json
│
└── package.json              ← Root workspace scripts
```

---

## Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+

### 2. Database setup

```bash
createdb 5enses
psql -d 5enses -f backend/migrations/001_initial_schema.sql
```

### 3. Backend config

```bash
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET
```

### 4. Install & run

```bash
# From project root:
npm install          # installs concurrently
npm run install:all  # installs backend + frontend deps
npm run dev          # starts both servers concurrently
```

- **Backend:** http://localhost:4000
- **Frontend:** http://localhost:3000

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in → JWT |
| GET | `/api/auth/me` | Current user |
| PATCH | `/api/auth/profile` | Update profile |

### Businesses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/businesses` | List/search with filters |
| GET | `/api/businesses/:slug` | Business detail |
| GET | `/api/businesses/:id/ratings` | Business ratings |
| POST | `/api/businesses/:id/save` | Save business |
| DELETE | `/api/businesses/:id/save` | Unsave |

### Ratings (5 Senses)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ratings` | Submit/update rating |
| GET | `/api/ratings/:id` | Get rating |
| POST | `/api/ratings/:id/helpful` | Mark helpful |
| DELETE | `/api/ratings/:id` | Delete rating |

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts` | Feed (filter by community/group) |
| POST | `/api/posts` | Create post |
| GET | `/api/posts/:id` | Post detail |
| POST | `/api/posts/:id/like` | Like |
| DELETE | `/api/posts/:id/like` | Unlike |
| GET | `/api/posts/:id/comments` | Comments |
| POST | `/api/posts/:id/comments` | Add comment |

### Communities
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/communities` | List communities |
| GET | `/api/communities/:slug` | Community detail + groups |
| POST | `/api/communities/:id/join` | Join |
| DELETE | `/api/communities/:id/join` | Leave |
| POST | `/api/communities/groups/:id/join` | Join group |

### Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?q=&type=` | Multi-entity search |
| GET | `/api/search/categories` | Category list |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Notification feed |
| PATCH | `/api/notifications/read-all` | Mark all read |
| PATCH | `/api/notifications/:id/read` | Mark one read |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:username` | Profile |
| GET | `/api/users/:username/ratings` | User's ratings |
| POST | `/api/users/:id/follow` | Follow |
| DELETE | `/api/users/:id/follow` | Unfollow |
| GET | `/api/users/me/feed` | Personalized feed |

---

## Key Design Decisions

**Sensory Rating Model**
Each of the 5 senses is rated independently (1–5). The overall score is the mean of all provided senses. Users can skip senses that don't apply (e.g. no "taste" for a park).

**Business Profiles**
Businesses have a `business_rating_summary` VIEW that aggregates all sense averages live — no denormalization needed.

**JWT Auth**
Tokens stored in `localStorage`. The Axios interceptor attaches them automatically and redirects to `/login` on 401.

**Mobile-first**
Max width of 430px simulates a phone shell. Bottom nav, sticky headers, and horizontal scroll carousels all follow mobile UX patterns.

---

## Next Steps / Enhancements

- [ ] Image upload to S3 (Multer S3 storage engine)
- [ ] WebSocket notifications (Socket.io)
- [ ] Business owner dashboard
- [ ] Admin panel for business management
- [ ] Geolocation-based "Near You" feed
- [ ] PWA manifest + service worker for installability
- [ ] Email verification on registration
- [ ] Password reset flow
- [ ] Dark/light mode toggle (CSS var swap)
- [ ] Infinite scroll pagination
