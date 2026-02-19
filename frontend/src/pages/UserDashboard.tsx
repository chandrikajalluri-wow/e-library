/* eslint-disable react-hooks/immutability */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getReadlist, getProfile } from '../services/userService';
import { getMyMembership, type Membership } from '../services/membershipService';
import { MembershipName } from '../types/enums';


import { toast } from 'react-toastify';
import { BookOpen, Flame, Heart, Bookmark, ArrowRight, Zap } from 'lucide-react';
import Loader from '../components/Loader';
import '../styles/UserDashboard.css';
import '../styles/BookList.css';

const UserDashboard: React.FC = () => {
  const [readlist, setReadlist] = useState<any[]>([]);
  const [stats, setStats] = useState({ booksRead: 0, borrowedCount: 0, wishlistCount: 0, streakCount: 0 });
  const [membership, setMembership] = useState<Membership | null>(null);

  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'reading' | 'completed'>('reading');
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
        getMyMembership()
      ]);

      if (results[0].status === 'fulfilled') setReadlist(Array.isArray(results[0].value) ? results[0].value : []);
      if (results[1].status === 'fulfilled') setStats(results[1].value);
      if (results[2].status === 'fulfilled') setMembership(results[2].value);


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

  const [showMembershipDetails, setShowMembershipDetails] = useState(false);

  if (isLoading) {
    return <Loader />;
  }

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
          <p>You've added <strong>{stats.borrowedCount}</strong> books to your library this month. Keep up the momentum!</p>
        </div>
        <div className="hero-quick-stats">
          <div className="hero-stat-item">
            <span className="hero-stat-value">{stats.streakCount}</span>
            <span className="hero-stat-label">Day Streak</span>
          </div>
          <div className="hero-stat-item">
            <span className="hero-stat-value">{readlist.filter(item => item.book || item.title).length}</span>
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
              <span>Reading Usage</span>
              <span>{stats.borrowedCount} / {membership?.monthlyLimit || 3} books</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${Math.min((stats.borrowedCount / (membership?.monthlyLimit || 3)) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="membership-details-action membership-details-action-styled">
              <button
                onClick={() => setShowMembershipDetails(!showMembershipDetails)}
                className="details-toggle-btn details-toggle-btn-styled"
              >
                {showMembershipDetails ? 'Hide Plan Details' : 'View Plan Details'}
                <ArrowRight size={14} style={{ transform: showMembershipDetails ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform 0.3s ease' }} />
              </button>

              {showMembershipDetails && (
                <div className="membership-features-mini-list membership-features-list">
                  <ul className="features-ul">
                    {membership?.features?.map((feature, i) => (
                      <li key={i} className="feature-li">
                        <div className="feature-dot"></div>
                        {feature}
                      </li>
                    )) || (
                        <li className="feature-li" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Standard library access included.</li>
                      )}
                  </ul>
                </div>
              )}
            </div>
            <button onClick={() => navigate('/memberships')} className="upgrade-link-btn upgrade-link-btn-styled">
              {membership?.name === MembershipName.PREMIUM ? 'View Plans' : 'Upgrade Plan'}
            </button>
          </div>
        </div>

        {[
          { label: 'Books Completed', value: stats.booksRead, icon: <BookOpen size={24} />, color: 'blue' },
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



      {/* Readlist Section */}
      <section className="readlist-section">
        <div className="readlist-header">
          <h2 className="modern-section-title readlist-title">
            <Bookmark size={24} className="title-icon" />
            My Library
          </h2>
          <button
            onClick={() => loadData()}
            className="sync-btn"          >
            ↻ Sync Data
          </button>
        </div>

        <div className="library-tabs-container">
          <button
            className={`library-tab ${activeTab === 'reading' ? 'active' : ''}`}
            onClick={() => setActiveTab('reading')}
          >
            Reading
          </button>
          <button
            className={`library-tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed
          </button>
        </div>

        <div className="grid-books">
          {readlist.filter(item => {
            if (activeTab === 'reading') return item.status === 'active';
            if (activeTab === 'completed') return item.status === 'completed';
            return true;
          }).length === 0 ? (
            <div className="empty-discovery-zone saas-reveal">
              <div className="discovery-visual-content">
                <div className="floating-icons-container">
                  <div className="float-icon icon-1"><BookOpen size={40} /></div>
                  <div className="float-icon icon-2"><Heart size={30} /></div>
                  <div className="float-icon icon-3"><Zap size={35} /></div>
                </div>
                <div className="discovery-text">
                  <h2>Your library is quiet...</h2>
                  <p>Adventure, knowledge, and mystery are just a click away. Start your reading journey today.</p>
                </div>
              </div>

              <div className="discovery-chips-container">
                <p className="chips-label">Quick Discovery</p>
                <div className="discovery-chips">
                  {['Fantasy', 'Technology', 'Business', 'Romance', 'Sci-Fi'].map((cat) => (
                    <button
                      key={cat}
                      className="discovery-chip"
                      onClick={() => navigate(`/books?search=${cat}`)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="discovery-actions">
                <button onClick={() => navigate('/books')} className="explore-catalog-btn">
                  Explore Full Catalog
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          ) : (
            readlist
              .filter(item => {
                if (activeTab === 'reading') return item.status === 'active';
                if (activeTab === 'completed') return item.status === 'completed';
                return true;
              })
              .map((item: any) => {
                const book = item.book || (item.title ? item : null);
                if (!book) return null;
                const isDateExpired = item.dueDate && new Date(item.dueDate) < new Date();
                const isExpired = item.status === 'active' && isDateExpired;

                return (
                  <div
                    key={book._id}
                    className="modern-book-card"
                  >
                    <div className="card-image-wrap card-image-wrap-pointer" onClick={() => navigate(`/books/${book._id}`)}>
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
                        {!(item.status === 'completed' && isDateExpired) && (
                          <button
                            onClick={() => navigate(`/read/${book._id}`)}
                            disabled={isExpired}
                            className="read-btn-premium"
                          >
                            {isExpired ? 'Renew' : (item.status === 'completed' ? 'Read Again' : 'Read')}
                          </button>
                        )}
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
