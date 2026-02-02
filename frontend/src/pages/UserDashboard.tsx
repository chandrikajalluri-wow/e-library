/* eslint-disable react-hooks/immutability */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getReadlist, getProfile } from '../services/userService';
import { getMyMembership, type Membership } from '../services/membershipService';
import { getAnnouncements } from '../services/superAdminService';
import { toast } from 'react-toastify';
import { BookOpen, Flame, Heart, Bookmark, Ghost, ArrowRight, Zap } from 'lucide-react';
import '../styles/UserDashboard.css';
import '../styles/BookList.css';

const UserDashboard: React.FC = () => {
  const [readlist, setReadlist] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalFine: 0, borrowedCount: 0, wishlistCount: 0, streakCount: 0 });
  const [membership, setMembership] = useState<Membership | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Fetch profile first to ensure we have user info
      try {
        const profile = await getProfile();
        setUserProfile(profile);
      } catch (e) { console.error('Profile fetch failed', e); }

      // Fetch other data pieces individually or via Promise.allSettled for resilience
      const results = await Promise.allSettled([
        getReadlist(),
        getDashboardStats(),
        getMyMembership(),
        getAnnouncements()
      ]);

      if (results[0].status === 'fulfilled') setReadlist(Array.isArray(results[0].value) ? results[0].value : []);
      if (results[1].status === 'fulfilled') setStats(results[1].value);
      if (results[2].status === 'fulfilled') setMembership(results[2].value);
      if (results[3].status === 'fulfilled') {
        const aData = results[3].value;
        setAnnouncements(Array.isArray(aData) ? aData : []);
      }

    } catch (err) {
      console.error(err);
      toast.error('Failed to load some dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const navigate = useNavigate();

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="dashboard-wrapper dashboard-container">
      <div className="back-to-catalog-container">
        <button onClick={() => navigate('/books')} className="back-to-catalog-link">
          <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} />
          Back to Catalog
        </button>
      </div>

      {/* Hero Section */}
      <section className="user-dashboard-hero">
        <div className="hero-welcome-content">
          <h1>{getTimeGreeting()}, {userProfile?.name?.split(' ')[0] || 'Reader'}! 👋</h1>
          <p>You've read <strong>{stats.borrowedCount}</strong> books this month. Keep up the momentum!</p>
        </div>
        <div className="hero-quick-stats">
          <div className="hero-stat-item">
            <span className="hero-stat-value">{stats.streakCount}</span>
            <span className="hero-stat-label">Day Streak</span>
          </div>
          <div className="hero-stat-item">
            <span className="hero-stat-value">{readlist.length}</span>
            <span className="hero-stat-label">Active Reads</span>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="dashboard-stat-card membership-display-card">
          <div className="membership-header">
            <div className="stat-info-box">
              <h3>Current Plan</h3>
              <p className="stat-value">{isLoading ? '...' : (membership?.displayName || 'Basic')}</p>
            </div>
            <span className="membership-badge">
              {membership?.name || 'FREE'}
            </span>
          </div>
          <div className="membership-progress-area">
            <div className="progress-info">
              <span>Usage</span>
              <span>{stats.borrowedCount} / {membership?.borrowLimit || 3} books</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${Math.min((stats.borrowedCount / (membership?.borrowLimit || 3)) * 100, 100)}%` }}
              ></div>
            </div>
            <button onClick={() => navigate('/memberships')} className="upgrade-link-btn" style={{ marginTop: '1.5rem', width: '100%' }}>
              Manage Membership
            </button>
          </div>
        </div>

        {[
          { label: 'Books Read', value: stats.borrowedCount, icon: <BookOpen size={24} />, color: 'blue' },
          { label: 'Wishlisted', value: stats.wishlistCount, icon: <Heart size={24} />, color: 'pink' },
          { label: 'Login Streak', value: stats.streakCount, icon: <Flame size={24} />, color: 'gold' }
        ].map((s, i) => (
          <div key={i} className="dashboard-stat-card">
            <div className={`stat-icon-wrapper ${s.color}`}>
              {s.icon}
            </div>
            <div className="stat-info-box">
              <h3>{s.label}</h3>
              <p className="stat-value">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Announcements Section */}
      {announcements.length > 0 && (
        <section>
          <h2 className="modern-section-title">
            <Zap size={24} className="title-icon" />
            Announcements
          </h2>
          <div className="announcements-swiper">
            {announcements.slice(0, 3).map((ann: any) => (
              <div key={ann._id} className="modern-announcement-card">
                <span className="ann-tag">Latest Updates</span>
                <div className="ann-content">
                  <h3>{ann.title}</h3>
                  <p>{ann.content}</p>
                </div>
                <div className="ann-footer">
                  <span className="ann-date">
                    {new Date(ann.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Readlist Section */}
      <section style={{ marginTop: '0', paddingTop: '0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="modern-section-title" style={{ marginBottom: 0 }}>
            <Bookmark size={24} className="title-icon" />
            My Readlist
          </h2>
          <button
            onClick={() => loadData()}
            style={{ background: 'transparent', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
          >
            ↻ Sync Data
          </button>
        </div>

        <div className="grid-books">
          {readlist.length === 0 ? (
            <div className="empty-readlist-state">
              <Ghost size={64} className="empty-state-icon" />
              <h2>Your library is quiet...</h2>
              <p>Adventure awaits! Find your next favorite book in our extensive catalog.</p>
              <button onClick={() => navigate('/books')} className="read-btn-premium">
                Explore Catalog
              </button>
            </div>
          ) : (
            readlist.map((item: any) => {
              const book = item.book || (item.title ? item : null);
              if (!book) return null;
              const isExpired = item.status === 'active' && item.dueDate && new Date(item.dueDate) < new Date();

              return (
                <div
                  key={book._id}
                  className="modern-book-card"
                >
                  <div className="card-image-wrap" onClick={() => navigate(`/books/${book._id}`)} style={{ cursor: 'pointer' }}>
                    <div className="status-overlay">
                      <span className={`status-label ${isExpired ? 'expired' : item.status}`}>
                        {isExpired ? 'Expired' : item.status}
                      </span>
                    </div>
                    {book.cover_image_url ? (
                      <img src={book.cover_image_url} alt={book.title} loading="lazy" />
                    ) : (
                      <div className="no-image-placeholder">No Image</div>
                    )}
                  </div>

                  <div className="card-details-box">
                    <span className="card-category">{book.category_id?.name || 'Literature'}</span>
                    <h3 className="card-title">{book.title}</h3>
                    <p className="card-author">by {book.author}</p>

                    <div className="card-footer">
                      <div className="due-info">
                        <span className="due-label">{item.status === 'completed' ? 'Finished On' : (item.dueDate ? 'Ends On' : 'Access')}</span>
                        <span className="due-date">
                          {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'Active Access'}
                        </span>
                      </div>
                      <button
                        onClick={() => navigate(`/read/${book._id}`)}
                        disabled={isExpired}
                        className="read-btn-premium"
                      >
                        {isExpired ? 'Renew' : 'Read'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

export default UserDashboard;
