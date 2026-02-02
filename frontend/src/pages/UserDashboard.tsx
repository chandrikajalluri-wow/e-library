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
  const [readlist, setReadlist] = useState<any[]>([]);
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
      setReadlist(bData);
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
          {readlist.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'left', padding: '3rem 0', color: 'var(--text-secondary)' }}>
              <p>No books in your readlist.</p>
            </div>
          ) : (
            readlist.map((item: any) => {
              // Fallback: handle both new structure {book, status} and legacy structure {title, ...}
              const book = item.book || (item.title ? item : null);
              if (!book) return null;



              return (
                <div
                  key={book._id}
                  className="card book-card ripple-effect"
                  onClick={() => navigate(`/books/${book._id}`)}
                  style={{ cursor: 'pointer' }}
                >
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
                        <span className={`status-badge book-status-badge ${item.status === 'completed' ? 'status-completed' : 'status-active'}`}>
                          {item.status === 'completed' ? 'COMPLETED' : 'ACTIVE'}
                        </span>

                        <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <div><strong>Issued:</strong> {item.addedAt ? new Date(item.addedAt).toLocaleDateString() : 'N/A'}</div>
                          {item.dueDate && <div><strong>Due:</strong> {new Date(item.dueDate).toLocaleDateString()}</div>}
                        </div>
                      </div>

                      <div className="book-actions-row" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!(item.status === 'active' && item.dueDate && new Date(item.dueDate) < new Date())) {
                                navigate(`/read/${book._id}`);
                              }
                            }}
                            disabled={item.status === 'active' && item.dueDate && new Date(item.dueDate) < new Date()}
                            className={`btn-primary ${item.status === 'active' && item.dueDate && new Date(item.dueDate) < new Date() ? 'btn-disabled' : ''}`}
                            style={{
                              padding: '6px 12px',
                              fontSize: '13px',
                              fontWeight: 700,
                              minWidth: 'auto',
                              height: 'auto',
                              borderRadius: '8px',
                              lineHeight: '1',
                              opacity: (item.status === 'active' && item.dueDate && new Date(item.dueDate) < new Date()) ? 0.6 : 1,
                              cursor: (item.status === 'active' && item.dueDate && new Date(item.dueDate) < new Date()) ? 'not-allowed' : 'pointer'
                            }}
                            title={item.status === 'active' && item.dueDate && new Date(item.dueDate) < new Date() ? 'Access expired. Please renew from book details.' : 'Read Book'}
                          >
                            {item.status === 'active' && item.dueDate && new Date(item.dueDate) < new Date() ? 'Expired' : 'Read'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section >
    </div >
  );
};

export default UserDashboard;
