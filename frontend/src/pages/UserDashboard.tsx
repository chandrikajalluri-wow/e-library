/* eslint-disable react-hooks/immutability */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MembershipName } from '../types/enums';
import { getDashboardStats, getReadlist } from '../services/userService';
import { getMyMembership, type Membership } from '../services/membershipService';
import { getAnnouncements } from '../services/superAdminService';
import { toast } from 'react-toastify';
import { BookOpen, Flame, Heart } from 'lucide-react';
import '../styles/UserDashboard.css';
import '../styles/BookList.css';

const UserDashboard: React.FC = () => {
  const [readlistBooks, setReadlistBooks] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalFine: 0, borrowedCount: 0, wishlistCount: 0, streakCount: 0 });
  const [membership, setMembership] = useState<Membership | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const bData = await getReadlist();
      setReadlistBooks(bData);
      const sData = await getDashboardStats();
      setStats(sData);
      const mData = await getMyMembership();
      setMembership(mData);
      const aData = await getAnnouncements();
      setAnnouncements(aData.filter((a: any) => a.isActive));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };



  const navigate = useNavigate();

  return (
    <div className="dashboard-wrapper dashboard-container">
      <div className="back-to-catalog-container">
        <button
          onClick={() => navigate('/books')}
          className="btn-secondary back-to-catalog-link"
        >
          &larr; Back to Catalog
        </button>
      </div>
      <header className="admin-header">
        <div className="admin-header-titles">
          <h1 className="admin-header-title">My Dashboard</h1>
          <p className="admin-header-subtitle">Overview of your activity and reading list</p>
        </div>
      </header>

      <div className="stats-grid">
        <div className="card stat-card membership-status-card">
          <div className="membership-info-main">
            <span className="stat-label">Your Membership</span>
            <p className="stat-value membership-name">
              {isLoading ? '...' : (membership?.displayName || 'Basic')}
            </p>
          </div>
          <div className="membership-limits-box">
            <div className="limit-info">
              <span className="limit-label">Monthly Limit</span>
              <span className="limit-val">{isLoading ? '-' : stats.borrowedCount} / {isLoading ? '-' : (membership?.borrowLimit || 3)} books</span>
            </div>
            <button
              onClick={() => navigate('/memberships')}
              className="upgrade-link-btn"
            >
              {membership?.name === MembershipName.PREMIUM ? 'View Plans' : 'Manage Plan'}
            </button>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon-bg monthly-reads-icon">
            <BookOpen size={22} />
          </div>
          <div className="stat-content">
            <h3 className="stat-label">Monthly Reads</h3>
            <p className="stat-value">{stats.borrowedCount}</p>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon-bg wishlisted-icon">
            <Heart size={22} />
          </div>
          <div className="stat-content">
            <h3 className="stat-label">Wishlisted</h3>
            <p className="stat-value">{stats.wishlistCount}</p>
          </div>
        </div>

        <div className="card stat-card streak-card">
          <div className="stat-icon-bg streak-icon">
            <Flame size={22} />
          </div>
          <div className="stat-content">
            <h3 className="stat-label">Login Streak</h3>
            <p className="stat-value">{stats.streakCount} Days</p>
          </div>
        </div>
      </div>

      {announcements.length > 0 && (
        <section className="dashboard-announcements-section">
          <div className="section-header-flex">
            <h2>Announcements</h2>
            <span className="badge-new">Latest Updates</span>
          </div>
          <div className="announcements-grid">
            {announcements.slice(0, 2).map((ann: any) => (
              <div key={ann._id} className="announcement-card ripple-effect">
                <div className="announcement-content-wrap">
                  <div className="announcement-meta">
                    <span className="ann-date">{new Date(ann.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <h3 className="ann-title">{ann.title}</h3>
                  <p className="ann-body">{ann.content}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card dashboard-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BookOpen size={24} className="text-primary-color" />
            <h2 style={{ margin: 0 }}>My Readlist</h2>
          </div>
        </div>
        <div className="grid-books">
          {readlistBooks.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <p>Your readlist is empty. Start adding books to read digitally!</p>
            </div>
          ) : (
            readlistBooks.map((book: any) => (
              <div key={book._id} className="card book-card">
                <div className="book-cover-container">
                  {book.cover_image_url ? (
                    <img
                      src={book.cover_image_url}
                      alt={book.title}
                      className="book-cover-img"
                      loading="lazy"
                    />
                  ) : (
                    <div className="no-image-placeholder">No Image</div>
                  )}
                </div>
                <div className="book-info-container">
                  <div className="book-category-tag">
                    {book.category_id?.name || 'Book'}
                  </div>
                  <h3 className="book-title-h3">{book.title || 'Unknown Title'}</h3>
                  <p className="book-author-p">
                    {book.author ? `by ${book.author}` : ''}
                  </p>

                  <div className="book-footer">
                    <div className="book-status-info">
                      <span className="status-badge status-active book-status-badge">IN READLIST</span>
                    </div>

                    <div className="book-actions-row">
                      <button
                        onClick={() => navigate(`/read/${book._id}`)}
                        className="btn-primary book-action-btn"
                      >
                        Read
                      </button>
                      <button
                        onClick={() => navigate(`/books/${book._id}`)}
                        className="btn-secondary book-action-btn"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section >
    </div >
  );
};

export default UserDashboard;
