/* eslint-disable react-hooks/immutability */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BorrowStatus, MembershipName } from '../types/enums';
import { getMyBorrows, returnBook } from '../services/borrowService';
import { getDashboardStats } from '../services/userService';
import { getMyMembership, type Membership } from '../services/membershipService';
import { getAnnouncements } from '../services/superAdminService';
import { toast } from 'react-toastify';
import FinePaymentModal from '../components/FinePaymentModal';
import ConfirmationModal from '../components/ConfirmationModal';
import '../styles/UserDashboard.css';
import '../styles/BookList.css';

const UserDashboard: React.FC = () => {
  const [borrows, setBorrows] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalFine: 0, borrowedCount: 0, wishlistCount: 0, streakCount: 0 });
  const [membership, setMembership] = useState<Membership | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [selectedBorrow, setSelectedBorrow] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'returned'>('all');
  const [isLoading, setIsLoading] = useState(true);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isLoading: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    isLoading: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const bData = await getMyBorrows();
      setBorrows(bData);
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

  const getCurrentFine = (b: any) => {
    if (b.status === BorrowStatus.RETURNED || b.status === BorrowStatus.ARCHIVED) {
      return b.isFinePaid ? 0 : (b.fine_amount || 0);
    }

    const now = new Date();
    const endDate = (b.status === BorrowStatus.RETURN_REQUESTED && b.return_requested_at)
      ? new Date(b.return_requested_at)
      : now;
    const returnDate = new Date(b.return_date);

    let fineStartDate = returnDate;
    if (b.last_fine_paid_date && new Date(b.last_fine_paid_date) > returnDate) {
      fineStartDate = new Date(b.last_fine_paid_date);
    }

    if (endDate > fineStartDate) {
      const diffTime = Math.abs(endDate.getTime() - fineStartDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays * 10;
    }
    return 0;
  };

  const handleReturn = async (borrow: any) => {
    const fine = getCurrentFine(borrow);

    if (fine > 0 && !borrow.isFinePaid) {
      toast.info(`Please pay the fine of ₹${fine.toFixed(2)} before returning.`);
      setSelectedBorrow(borrow);
      setIsModalOpen(true);
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Request Return',
      message: `Are you sure you want to request a return for "${borrow.book_id?.title}"?`,
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
          await returnBook(borrow._id);
          toast.success('Return requested successfully. Admin will process it.');
          loadData();
          setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err: any) {
          console.error(err);
          toast.error(err.response?.data?.error || 'Failed to return book');
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  };


  const navigate = useNavigate();

  return (
    <div className="dashboard-wrapper">
      <div className="back-to-catalog-container">
        <button
          onClick={() => navigate('/books')}
          className="btn-secondary back-to-catalog-link"
        >
          &larr; Back to Catalog
        </button>
      </div>
      <header className="admin-header">
        <h1 className="admin-header-title">My Dashboard</h1>
        <p className="admin-header-subtitle">Overview of your activity and fines</p>
      </header>

      <div className="stats-grid">
        <div className="card stat-card membership-status-card">
          <div className="membership-info-main">
            <h3 className="stat-label">Membership</h3>
            <p className="stat-value membership-name">
              {isLoading ? '...' : (membership?.displayName || 'Basic')}
            </p>
          </div>
          <div className="membership-limits">
            <span>Limit: {isLoading ? '-' : stats.borrowedCount} / {isLoading ? '-' : (membership?.borrowLimit || 3)} books</span>
            <button
              onClick={() => navigate('/memberships')}
              className="upgrade-link-btn"
            >
              {membership?.name === MembershipName.PREMIUM ? 'View Plans' : 'Upgrade Plan'}
            </button>
          </div>
        </div>
        <div className="card stat-card">
          <h3 className="stat-label">Total Fine</h3>
          <p className="stat-value stat-fine">₹{stats.totalFine.toFixed(2)}</p>
        </div>
        <div className="card stat-card">
          <h3 className="stat-label">Borrowed</h3>
          <p className="stat-value">{stats.borrowedCount}</p>
        </div>
        <div className="card stat-card">
          <h3 className="stat-label">Wishlisted</h3>
          <p className="stat-value">{stats.wishlistCount}</p>
        </div>
        <div className="card stat-card streak-card">
          <h3 className="stat-label">Login Streak</h3>
          <p className="stat-value">🔥 {stats.streakCount} Days</p>
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
          <h2 style={{ margin: 0 }}>My Borrows</h2>
          <div className="filter-controls" style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-color)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setFilterStatus('all')}
              style={{
                background: filterStatus === 'all' ? 'var(--primary-color)' : 'transparent',
                color: filterStatus === 'all' ? 'white' : 'var(--text-secondary)',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                transition: 'all 0.2s'
              }}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              style={{
                background: filterStatus === 'active' ? 'var(--primary-color)' : 'transparent',
                color: filterStatus === 'active' ? 'white' : 'var(--text-secondary)',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                transition: 'all 0.2s'
              }}
            >
              Active
            </button>
            <button
              onClick={() => setFilterStatus('returned')}
              style={{
                background: filterStatus === 'returned' ? 'var(--primary-color)' : 'transparent',
                color: filterStatus === 'returned' ? 'white' : 'var(--text-secondary)',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                transition: 'all 0.2s'
              }}
            >
              Returned
            </button>
          </div>
        </div>
        <div className="grid-books">
          {borrows.filter(b => {
            if (filterStatus === 'active') return b.status === BorrowStatus.BORROWED || b.status === BorrowStatus.OVERDUE;
            if (filterStatus === 'returned') return b.status === BorrowStatus.RETURNED;
            return true;
          }).map((b) => (
            <div key={b._id} className="card book-card">
              <div className="book-cover-container">
                {b.book_id?.cover_image_url ? (
                  <img
                    src={b.book_id.cover_image_url}
                    alt={b.book_id.title}
                    className="book-cover-img"
                    loading="lazy"
                  />
                ) : (
                  <div className="no-image-placeholder">No Image</div>
                )}
              </div>
              <div className="book-info-container">
                <div className="book-category-tag">
                  {b.book_id?.category_id?.name || 'Book'}
                </div>
                <h3 className="book-title-h3">{b.book_id?.title || 'Unknown Title'}</h3>
                <p className="book-author-p">
                  {b.book_id?.author ? `by ${b.book_id.author}` : ''}
                </p>

                <div className="borrow-details-mini" style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Issued:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(b.issued_date).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span>Due:</span>
                    <span style={{ fontWeight: 600, color: new Date() > new Date(b.return_date) ? 'var(--danger-color)' : 'var(--text-primary)' }}>
                      {new Date(b.return_date).toLocaleDateString()}
                    </span>
                  </div>
                  {(getCurrentFine(b) > 0 || (new Date() > new Date(b.return_date) && b.status !== 'returned')) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span>Fine:</span>
                      <span style={{ fontWeight: 700, color: 'var(--danger-color)' }}>
                        ₹{getCurrentFine(b).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="book-footer" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className={`status-badge status-${b.status}`} style={{ fontSize: '0.7rem' }}>
                      {b.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Pay Now button - always visible if fine > 0 and not paid */}
                  {getCurrentFine(b) > 0 && !b.isFinePaid && (
                    <button
                      onClick={() => {
                        setSelectedBorrow(b);
                        setIsModalOpen(true);
                      }}
                      className="btn-primary btn-danger"
                      style={{ width: '100%', padding: '0.5rem' }}
                    >
                      Pay Now
                    </button>
                  )}

                  {(b.status === BorrowStatus.BORROWED || b.status === BorrowStatus.OVERDUE) && (
                    <>
                      <button
                        onClick={() => navigate(`/read/${b.book_id._id}`)}
                        className="btn-primary"
                        style={{ width: '100%', padding: '0.5rem' }}
                      >
                        Read
                      </button>
                      <button
                        onClick={() => handleReturn(b)}
                        className="btn-secondary"
                        style={{ width: '100%', padding: '0.5rem' }}
                      >
                        Request Return
                      </button>
                    </>
                  )}
                  {b.status === 'return_requested' && (
                    <div className="pending-status-msg">
                      Pending Approval
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {borrows.length === 0 && (
          <p className="empty-message">
            You haven't borrowed any books.
          </p>
        )}
      </section>

      {isModalOpen && selectedBorrow && (
        <FinePaymentModal
          borrow={selectedBorrow}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedBorrow(null);
          }}
          onSuccess={loadData}
        />
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type="info"
        isLoading={confirmModal.isLoading}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default UserDashboard;
