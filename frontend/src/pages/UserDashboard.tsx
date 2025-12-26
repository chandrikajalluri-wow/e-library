/* eslint-disable react-hooks/immutability */
import React, { useEffect, useState } from 'react';
import { getMyBorrows, returnBook } from '../services/borrowService';
import { getDashboardStats } from '../services/userService';
import { toast } from 'react-toastify';
import FinePaymentModal from '../components/FinePaymentModal';
import '../styles/UserDashboard.css';

const UserDashboard: React.FC = () => {
  const [borrows, setBorrows] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalFine: 0, borrowedCount: 0, wishlistCount: 0 });
  const [selectedBorrow, setSelectedBorrow] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const bData = await getMyBorrows();
      setBorrows(bData);
      const sData = await getDashboardStats();
      setStats(sData);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load dashboard data');
    }
  };

  const handleReturn = async (borrow: any) => {
    let fine = borrow.fine_amount || 0;
    if (borrow.status !== 'returned' && borrow.status !== 'archived' && new Date() > new Date(borrow.return_date)) {
      const diffTime = Math.abs(new Date().getTime() - new Date(borrow.return_date).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      fine += diffDays * 10;
    }

    if (fine > 0 && !borrow.isFinePaid) {
      toast.info(`Please pay the fine of ₹${fine.toFixed(2)} before returning.`);
      setSelectedBorrow(borrow);
      setIsModalOpen(true);
      return;
    }

    try {
      await returnBook(borrow._id);
      toast.success('Return requested successfully. Admin will process it.');
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to return book');
    }
  };

  return (
    <div className="dashboard-wrapper">
      <header className="admin-header">
        <h1 className="admin-header-title">My Dashboard</h1>
        <p className="admin-header-subtitle">Overview of your activity and fines</p>
      </header>

      <div className="stats-grid">
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
      </div>

      <section className="card dashboard-section">
        <h2>My Borrows</h2>
        <table className="dashboard-table">
          <thead>
            <tr>
              <th style={{ padding: '1rem' }}>Book</th>
              <th>Issued Date</th>
              <th>Due Date</th>
              <th>Fine</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {borrows.map((b) => (
              <tr key={b._id}>
                <td className="book-title">
                  {b.book_id?.title || 'Unknown Book (Deleted)'}
                </td>
                <td>{new Date(b.issued_date).toLocaleDateString()}</td>
                <td className={new Date() > new Date(b.return_date) ? 'overdue-date' : ''}>
                  {new Date(b.return_date).toLocaleDateString()}
                </td>
                <td>
                  <span className={`fine-amount ${(b.fine_amount > 0 || new Date() > new Date(b.return_date)) ? 'fine-danger' : ''}`}>
                    ₹{(() => {
                      let fine = b.fine_amount || 0;
                      if (b.status !== 'returned' && b.status !== 'archived' && new Date() > new Date(b.return_date)) {
                        const diffTime = Math.abs(new Date().getTime() - new Date(b.return_date).getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        fine += diffDays * 10;
                      }
                      return fine.toFixed(2);
                    })()}
                  </span>
                </td>
                <td>
                  <span className={`status-badge status-${b.status}`}>
                    {b.status}
                  </span>
                </td>
                <td>
                  {(b.status === 'borrowed' || b.status === 'overdue') && (
                    <div className="actions-cell">
                      {(() => {
                        let fine = b.fine_amount || 0;
                        if (new Date() > new Date(b.return_date)) {
                          const diffTime = Math.abs(new Date().getTime() - new Date(b.return_date).getTime());
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          fine += diffDays * 10;
                        }

                        return (fine > 0 && !b.isFinePaid) ? (
                          <button
                            onClick={() => {
                              setSelectedBorrow(b);
                              setIsModalOpen(true);
                            }}
                            className="btn-primary"
                            style={{ backgroundColor: 'var(--danger-color)' }}
                          >
                            Pay Fine
                          </button>
                        ) : null;
                      })()}
                      <button
                        onClick={() => handleReturn(b)}
                        className="btn-secondary"
                      >
                        Request Return
                      </button>
                    </div>
                  )}
                  {b.status === 'return_requested' && (
                    <span className="pending-badge">
                      Pending Admin Approval
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </div>
  );
};

export default UserDashboard;
