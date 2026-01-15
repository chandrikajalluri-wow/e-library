import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createBook, getBooks, updateBook, deleteBook } from '../services/bookService';
import { getCategories, updateCategory, deleteCategory as removeCategory, createCategory } from '../services/categoryService';
import { getAllBorrows, acceptReturn } from '../services/borrowService';
import { getAllBookRequests, updateBookRequestStatus, sendFineReminder } from '../services/userService';
import { getAllWishlists } from '../services/wishlistService';
import { getActivityLogs } from '../services/logService';
import { getNotifications, markAsRead, markAllAsRead } from '../services/notificationService';
import type { Book, Category, Borrow } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';
import '../styles/AdminDashboard.css';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'stats';

  const [categories, setCategories] = useState<Category[]>([]);
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [userRequests, setUserRequests] = useState<any[]>([]);
  const [borrowStatusFilter, setBorrowStatusFilter] = useState('all');
  const [membershipFilter, setMembershipFilter] = useState('all');
  const [bookTypeFilter, setBookTypeFilter] = useState('all');
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalUsers: 0,
    totalBorrows: 0,
    activeBorrows: 0,
    overdueBooks: 0,
    pendingReturns: 0,
    pendingSuggestions: 0,
    mostBorrowedBook: 'N/A',
    mostWishlistedBook: 'N/A',
    mostActiveUser: 'N/A',
    mostFinedUser: 'N/A'
  });

  const [newBook, setNewBook] = useState({
    title: '', author: '', category_id: '', price: '', status: 'available', isbn: '',
    description: '', pages: '', publishedYear: '', cover_image_url: '', pdf_url: '',
    genre: '', language: '', noOfCopies: '1', isPremium: false, author_description: '',
    author_image_url: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [authorImageFile, setAuthorImageFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });

  const [bookPage, setBookPage] = useState(1);
  const [bookTotalPages, setBookTotalPages] = useState(1);
  const [borrowPage, setBorrowPage] = useState(1);
  const [borrowTotalPages, setBorrowTotalPages] = useState(1);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
    type: 'danger' | 'warning' | 'info'; isLoading: boolean;
  }>({
    isOpen: false, title: '', message: '', onConfirm: () => { }, type: 'info', isLoading: false
  });

  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [isNotifLoading, setIsNotifLoading] = useState(false);

  const fetchCommonData = async () => {
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const fetchBorrows = async () => {
    setIsDataLoading(true);
    try {
      const data = await getAllBorrows(`page=${borrowPage}&limit=10&status=${borrowStatusFilter}&membership=${membershipFilter}`);
      setBorrows(data.borrows);
      setBorrowTotalPages(data.pages);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsDataLoading(false);
    }
  };

  const fetchUserRequests = async () => {
    setIsDataLoading(true);
    try {
      const data = await getAllBookRequests();
      setUserRequests(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch user requests');
    } finally {
      setIsDataLoading(false);
    }
  };

  const fetchBooks = async () => {
    setIsDataLoading(true);
    try {
      const isPremiumParam = bookTypeFilter === 'all' ? '' : (bookTypeFilter === 'premium' ? '&isPremium=true' : '&isPremium=false');
      const data = await getBooks(`page=${bookPage}&limit=10&showArchived=true&search=${searchTerm}${isPremiumParam}`);
      setAllBooks(data.books);
      setBookTotalPages(data.pages);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch books');
    } finally {
      setIsDataLoading(false);
    }
  };

  const fetchLogs = async () => {
    setIsDataLoading(true);
    try {
      const data = await getActivityLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch activity logs');
    } finally {
      setIsDataLoading(false);
    }
  };

  const fetchStats = async () => {
    setIsStatsLoading(true);
    try {
      const booksData = await getBooks('limit=1000&showArchived=true');
      const borrowsData = await getAllBorrows('limit=1000');
      const requestsData = await getAllBookRequests();
      const wishlistData = await getAllWishlists();

      const getMostFrequent = (arr: any[], keyExtractor: (item: any) => string | undefined): string => {
        const counts: Record<string, number> = {};
        arr.forEach((item) => {
          const key = keyExtractor(item);
          if (key) counts[key] = (counts[key] || 0) + 1;
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        return sorted.length > 0 ? `${sorted[0][0]} (${sorted[0][1]})` : 'N/A';
      };

      const getMaxSum = (
        arr: any[], keyExtractor: (item: any) => string | undefined, valExtractor: (item: any) => number
      ): string => {
        const sums: Record<string, number> = {};
        arr.forEach((item) => {
          const key = keyExtractor(item);
          const val = valExtractor(item);
          if (key && val) sums[key] = (sums[key] || 0) + val;
        });
        const sorted = Object.entries(sums).sort((a, b) => b[1] - a[1]);
        return sorted.length > 0 ? `${sorted[0][0]} (₹${sorted[0][1].toFixed(2)})` : 'N/A';
      };

      const newStats = {
        totalBooks: booksData.total || 0,
        totalUsers: new Set(borrowsData.borrows.map((b: any) => b.user_id?._id)).size,
        totalBorrows: borrowsData.total || 0,
        activeBorrows: borrowsData.borrows.filter((b: any) =>
          ['borrowed', 'overdue', 'return_requested'].includes(b.status)
        ).length,
        overdueBooks: borrowsData.borrows.filter((b: any) => b.status === 'overdue').length,
        pendingReturns: borrowsData.borrows.filter((b: any) => b.status === 'return_requested').length,
        pendingSuggestions: requestsData.filter((r: any) => r.status === 'pending').length,
        mostBorrowedBook: getMostFrequent(borrowsData.borrows, (b) => b.book_id?.title),
        mostWishlistedBook: getMostFrequent(wishlistData, (w) => w.book_id?.title),
        mostActiveUser: getMostFrequent(borrowsData.borrows, (b) => b.user_id?.name),
        mostFinedUser: getMaxSum(borrowsData.borrows, (b) => b.user_id?.name, (b) => b.fine_amount || 0),
      };

      setStats(newStats);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    } finally {
      setIsStatsLoading(false);
    }
  };

  const fetchNotifications = async () => {
    setIsNotifLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setIsNotifLoading(false);
    }
  };

  useEffect(() => {
    fetchCommonData();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'borrows') fetchBorrows();
  }, [activeTab, borrowPage, borrowStatusFilter, membershipFilter]);

  useEffect(() => {
    if (activeTab === 'books') fetchBooks();
  }, [activeTab, bookPage, bookTypeFilter]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (activeTab === 'books') {
        setBookPage(1);
        fetchBooks();
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  useEffect(() => {
    if (activeTab === 'stats') fetchStats();
    if (activeTab === 'user-requests') fetchUserRequests();
    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'requests') fetchBorrows();
  }, [activeTab]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmModal({
      isOpen: true,
      title: editingCategoryId ? 'Confirm Update' : 'Confirm New Category',
      message: editingCategoryId
        ? `Are you sure you want to update the category "${newCategory.name}"?`
        : `Are you sure you want to create the category "${newCategory.name}"?`,
      type: 'info',
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
          if (editingCategoryId) {
            await updateCategory(editingCategoryId, newCategory);
            toast.success('Category updated');
          } else {
            await createCategory(newCategory);
            toast.success('Category created');
          }
          setNewCategory({ name: '', description: '' });
          setEditingCategoryId(null);
          fetchCommonData();
          setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err: any) {
          toast.error(err.response?.data?.error || 'Failed to process category');
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategoryId(cat._id);
    setNewCategory({ name: cat.name, description: cat.description || '' });
  };

  const handleCancelCategoryEdit = () => {
    setEditingCategoryId(null);
    setNewCategory({ name: '', description: '' });
  };

  const handleDeleteCategory = (cat: Category) => {
    const hasBooks = allBooks.some(b => {
      const catId = typeof b.category_id === 'string' ? b.category_id : b.category_id?._id;
      return catId === cat._id;
    });

    if (hasBooks) {
      toast.error(`Cannot delete category "${cat.name}" because it contains books.`);
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Delete Category',
      message: `Are you sure you want to delete the category "${cat.name}"?`,
      type: 'danger',
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
          await removeCategory(cat._id);
          toast.success('Category deleted');
          fetchCommonData();
          setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err: any) {
          toast.error(err.response?.data?.error || 'Failed to delete category');
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markAsRead(id);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmModal({
      isOpen: true,
      title: editingBookId ? 'Confirm Update' : 'Confirm Add Book',
      message: editingBookId
        ? `Are you sure you want to update the details for "${newBook.title}"?`
        : `Are you sure you want to add "${newBook.title}" to the library?`,
      type: 'info',
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
          const formData = new FormData();
          formData.append('title', newBook.title);
          formData.append('author', newBook.author);
          formData.append('category_id', newBook.category_id);
          formData.append('price', newBook.price || '0');
          formData.append('pages', newBook.pages || '0');
          formData.append('publishedYear', newBook.publishedYear || '0');
          formData.append('noOfCopies', newBook.noOfCopies || '1');
          formData.append('status', newBook.status);
          formData.append('isbn', newBook.isbn);
          formData.append('description', newBook.description);
          formData.append('genre', newBook.genre);
          formData.append('language', newBook.language);
          formData.append('isPremium', String(newBook.isPremium));
          formData.append('author_description', newBook.author_description);

          if (coverImageFile) formData.append('cover_image', coverImageFile);
          else formData.append('cover_image_url', newBook.cover_image_url);

          if (authorImageFile) formData.append('author_image', authorImageFile);
          else formData.append('author_image_url', newBook.author_image_url);

          if (pdfFile) formData.append('pdf', pdfFile);
          else formData.append('pdf_url', newBook.pdf_url);

          if (editingBookId) {
            await updateBook(editingBookId, formData);
            toast.success('Book updated successfully');
            setEditingBookId(null);
          } else {
            await createBook(formData);
            toast.success('Book created successfully');
          }

          setNewBook({
            title: '', author: '', category_id: '', price: '', status: 'available', isbn: '',
            description: '', pages: '', publishedYear: '', cover_image_url: '', pdf_url: '',
            genre: '', language: '', noOfCopies: '1', isPremium: false, author_description: '',
            author_image_url: ''
          });
          setCoverImageFile(null);
          setAuthorImageFile(null);
          setPdfFile(null);
          fetchBooks();
          setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err: any) {
          console.error('Update Error:', err);
          let errMsg = err.response?.data?.error || (editingBookId ? 'Failed to update book' : 'Failed to create book');
          if (typeof errMsg === 'object') {
            errMsg = JSON.stringify(errMsg);
          }
          toast.error(errMsg);
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  };

  const handleEditBook = (book: Book) => {
    setEditingBookId(book._id);
    setNewBook({
      title: book.title, author: book.author,
      category_id: typeof book.category_id === 'string' ? book.category_id : book.category_id?._id || '',
      price: book.price?.toString() || '0', status: book.status || 'available', isbn: book.isbn || '',
      description: book.description || '', pages: book.pages?.toString() || '0',
      publishedYear: book.publishedYear?.toString() || '', cover_image_url: book.cover_image_url || '',
      pdf_url: book.pdf_url || '', genre: book.genre || '', language: book.language || '',
      noOfCopies: book.noOfCopies?.toString() || '1', isPremium: book.isPremium || false,
      author_description: book.author_description || '', author_image_url: book.author_image_url || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingBookId(null);
    setNewBook({
      title: '', author: '', category_id: '', price: '', status: 'available', isbn: '',
      description: '', pages: '', publishedYear: '', cover_image_url: '', pdf_url: '',
      genre: '', language: '', noOfCopies: '1', isPremium: false, author_description: '',
      author_image_url: ''
    });
    setCoverImageFile(null);
    setAuthorImageFile(null);
    setPdfFile(null);
  };

  const handleDeleteBook = (id: string) => {
    const book = allBooks.find(b => b._id === id);
    if (book && book.status === 'issued') {
      toast.error(`Cannot delete "${book.title}" because it is currently issued.`);
      return;
    }

    setConfirmModal({
      isOpen: true, title: 'Delete Book', message: 'Are you sure you want to delete this book? This action cannot be undone.',
      type: 'danger', isLoading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
          await deleteBook(id);
          toast.success('Book deleted');
          fetchBooks();
          setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err) {
          toast.error('Failed to delete book');
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  };

  const handleAcceptReturn = (borrowId: string) => {
    setConfirmModal({
      isOpen: true, title: 'Accept Return', message: 'Are you sure you want to accept this return request?',
      type: 'info', isLoading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
          await acceptReturn(borrowId);
          toast.success('Return request accepted');
          fetchBorrows();
          setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err) {
          toast.error('Failed to accept return');
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  };

  const handleSendReminder = async (borrowId: string) => {
    try {
      await sendFineReminder(borrowId);
      toast.success('Reminder email sent successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send reminder');
    }
  };

  const handleBookRequestStatus = (id: string, status: string) => {
    setConfirmModal({
      isOpen: true, title: `${status.charAt(0).toUpperCase() + status.slice(1)} Request`,
      message: `Are you sure you want to ${status} this book request?`,
      type: status === 'rejected' ? 'danger' : 'info', isLoading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
          await updateBookRequestStatus(id, status);
          toast.success(`Request ${status}`);
          fetchUserRequests();
          setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err) {
          toast.error('Failed to update request status');
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  };

  const handleLogout = () => {
    setConfirmModal({
      isOpen: true, title: 'Confirm Logout', message: 'Are you sure you want to log out from the admin panel?',
      type: 'warning', isLoading: false,
      onConfirm: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        toast.info('Logged out');
        navigate('/');
      }
    });
  };

  return (
    <div className="admin-layout">
      <main className="admin-main-content">
        <header className="admin-header">
          <div className="admin-header-flex">
            <div className="admin-header-titles">
              <h2 className="admin-header-title">
                {activeTab === 'stats' && 'Dashboard Overview'}
                {activeTab === 'books' && 'Manage Books'}
                {activeTab === 'categories' && 'Manage Categories'}
                {activeTab === 'requests' && 'Return Requests'}
                {activeTab === 'user-requests' && 'Book Suggestions'}
                {activeTab === 'borrows' && 'Borrow History'}
                {activeTab === 'logs' && 'Activity Logs'}
              </h2>
              <p className="admin-header-subtitle">Welcome back, Administrator</p>
            </div>
            <div className="admin-header-actions">
              {activeTab === 'stats' && (
                <button
                  onClick={fetchStats}
                  className="admin-refresh-stats-btn"
                  disabled={isStatsLoading}
                >
                  {isStatsLoading ? (
                    <span className="button-loader-flex">
                      <div className="spinner-mini"></div>
                      Refreshing...
                    </span>
                  ) : 'Refresh Stats'}
                </button>
              )}
              <button onClick={() => setShowNotifications(!showNotifications)} className="admin-notification-toggle">
                {showNotifications ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                )}
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span className="notification-badge-icon">{notifications.filter(n => !n.is_read).length}</span>
                )}
              </button>
              <button onClick={handleLogout} className="admin-notification-toggle" title="Logout">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              </button>

              {showNotifications && (
                <div className="admin-notification-panel">
                  <div className="notification-panel-header">
                    <h4>Notifications</h4>
                    <button onClick={handleMarkAllRead} className="mark-read-btn">Mark all as read</button>
                  </div>
                  <div className="notification-list">
                    {isNotifLoading && notifications.length === 0 ? (
                      <div className="notification-loading-state">
                        <div className="spinner-mini" style={{ borderTopColor: 'var(--primary-color)' }}></div>
                        Fetching notifications...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="notification-empty-state">No notifications yet</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n._id} onClick={() => handleMarkRead(n._id)} className={`notification-item-container ${!n.is_read ? 'unread' : ''}`}>
                          <div className="notification-item-message">{n.message}</div>
                          <div className="notification-item-time">{new Date(n.timestamp).toLocaleString()}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {activeTab === 'stats' && (
          <div className="admin-stats-grid-container">
            <div className="card stats-card-content">
              <div className="stats-icon-box"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg></div>
              <span className="stats-label">Total Volume</span>
              <span className="stats-value">{stats.totalBooks}</span>
            </div>
            <div className="card stats-card-content">
              <div className="stats-icon-box"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
              <span className="stats-label">Total Users</span>
              <span className="stats-value stats-value-accent">{stats.totalUsers}</span>
            </div>
            <div className="card stats-card-content">
              <div className="stats-icon-box"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg></div>
              <span className="stats-label">Active Borrows</span>
              <span className="stats-value stats-value-accent">{stats.activeBorrows}</span>
            </div>
            <div className="card stats-card-content">
              <div className="stats-icon-box"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></div>
              <span className="stats-label">Overdue</span>
              <span className="stats-value stats-value-danger">{stats.overdueBooks}</span>
            </div>
            <div className="card stats-card-content">
              <div className="stats-icon-box"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></div>
              <span className="stats-label">Pending Returns</span>
              <span className="stats-value stats-value-warning">{stats.pendingReturns}</span>
            </div>
            <div className="card stats-card-content">
              <div className="stats-icon-box"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5"></circle><path d="M20 21a8 8 0 1 0-16 0"></path></svg></div>
              <span className="stats-label">Most Active User</span>
              <div className="user-main-name" style={{ marginTop: '0.5rem' }}>{stats.mostActiveUser}</div>
            </div>
          </div>
        )}

        {activeTab === 'books' && (
          <div className="admin-section-grid">
            <section className="card admin-form-section">
              <div className="admin-form-header">
                <h3 className="admin-table-title" style={{ marginBottom: '2rem' }}>{editingBookId ? 'Edit Book Record' : 'Add New Book'}</h3>
                {editingBookId && <button onClick={handleCancelEdit} className="admin-reminder-btn" style={{ marginBottom: '1.5rem' }}>Cancel Editing</button>}
              </div>
              <form onSubmit={handleCreateBook} className="admin-book-form">
                <div className="form-group"><label>Title</label><input type="text" value={newBook.title} onChange={(e) => setNewBook({ ...newBook, title: e.target.value })} required /></div>
                <div className="form-group"><label>Author</label><input type="text" value={newBook.author} onChange={(e) => setNewBook({ ...newBook, author: e.target.value })} required /></div>
                <div className="form-group"><label>Category</label><select value={newBook.category_id} onChange={(e) => setNewBook({ ...newBook, category_id: e.target.value })} required><option value="">Select Category</option>{categories.map((c) => (<option key={c._id} value={c._id}>{c.name}</option>))}</select></div>
                <div className="form-group"><label>ISBN (Required & Unique)</label><input type="text" value={newBook.isbn} onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })} required /></div>
                <div className="form-group"><label>Genre</label><input type="text" value={newBook.genre} onChange={(e) => setNewBook({ ...newBook, genre: e.target.value })} /></div>
                <div className="form-group"><label>Language</label><input type="text" value={newBook.language} onChange={(e) => setNewBook({ ...newBook, language: e.target.value })} /></div>
                <div className="form-group"><label>Price (₹)</label><input type="number" value={newBook.price} onChange={(e) => setNewBook({ ...newBook, price: e.target.value })} /></div>
                <div className="form-group"><label>Pages</label><input type="number" value={newBook.pages} onChange={(e) => setNewBook({ ...newBook, pages: e.target.value })} /></div>
                <div className="form-group"><label>Published Year</label><input type="number" value={newBook.publishedYear} onChange={(e) => setNewBook({ ...newBook, publishedYear: e.target.value })} /></div>
                <div className="form-group"><label>Copies</label><input type="number" value={newBook.noOfCopies} onChange={(e) => setNewBook({ ...newBook, noOfCopies: e.target.value })} required /></div>
                <div className="form-group"><label>Status</label><select value={newBook.status} onChange={(e) => setNewBook({ ...newBook, status: e.target.value })} required><option value="available">Available</option><option value="issued">Issued</option><option value="damaged">Damaged</option></select></div>
                <div className="form-group">
                  <label>Cover Image</label>
                  <input type="file" accept="image/*" onChange={(e) => setCoverImageFile(e.target.files?.[0] || null)} className="admin-file-input" />
                </div>
                <div className="form-group">
                  <label>Author's Photo</label>
                  <input type="file" accept="image/*" onChange={(e) => setAuthorImageFile(e.target.files?.[0] || null)} className="admin-file-input" />
                </div>
                <div className="form-group">
                  <label>Book PDF Content</label>
                  <input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} className="admin-file-input" />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 3' }}><label>Description</label><textarea value={newBook.description} onChange={(e) => setNewBook({ ...newBook, description: e.target.value })} rows={3} style={{ width: '100%', borderRadius: '12px', padding: '0.75rem', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }} /></div>
                <div className="form-group" style={{ gridColumn: 'span 3' }}><label>About the Author</label><textarea value={newBook.author_description} onChange={(e) => setNewBook({ ...newBook, author_description: e.target.value })} rows={3} style={{ width: '100%', borderRadius: '12px', padding: '0.75rem', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }} /></div>
                <div className="form-group checkbox-group" style={{ gridColumn: 'span 3' }}><label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="checkbox" checked={newBook.isPremium} onChange={(e) => setNewBook({ ...newBook, isPremium: e.target.checked })} style={{ width: 'auto' }} />Mark as Premium Book</label></div>
                <div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'flex-start' }}>
                  <button type="submit" className="admin-btn-edit" style={{ padding: '0.75rem 2rem', minWidth: '200px' }}>{editingBookId ? 'Update Record' : 'Add to Collection'}</button>
                </div>
              </form>
            </section>
            <section className="card admin-table-section">
              <div className="admin-table-header-box">
                <h3 className="admin-table-title">Inventory</h3>
                <div className="admin-filter-group">
                  <div className="admin-filter-item">
                    <span className="admin-filter-label">Search</span>
                    <input type="text" placeholder="Title/Author..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="admin-search-input" />
                  </div>
                  <div className="admin-filter-item">
                    <span className="admin-filter-label">Type</span>
                    <select value={bookTypeFilter} onChange={(e) => setBookTypeFilter(e.target.value)} className="admin-filter-select">
                      <option value="all">All Books</option>
                      <option value="premium">Premium Only</option>
                      <option value="normal">Basic Only</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="admin-table-wrapper">
                {isDataLoading ? (
                  <div className="admin-loading-container">
                    <div className="spinner"></div>
                    <p>Updating Collection...</p>
                  </div>
                ) : (
                  <table className="admin-table">
                    <thead><tr><th>Book Details</th><th>Category</th><th>Copies</th><th>Status</th><th className="admin-actions-cell">Actions</th></tr></thead>
                    <tbody>
                      {allBooks.map((book) => (
                        <tr key={book._id}>
                          <td><div className="book-info-box"><span className="book-main-title">{book.title}</span><span className="book-sub-meta">by {book.author} {book.isPremium && <span className="admin-premium-label">PREMIUM</span>}</span></div></td>
                          <td>{typeof book.category_id === 'string' ? book.category_id : book.category_id?.name}</td>
                          <td style={{ fontWeight: 700 }}>{book.noOfCopies}</td>
                          <td><span className={`status-badge status-${book.status}`}>{book.status}</span></td>
                          <td className="admin-actions-cell"><div className="admin-actions-flex"><button onClick={() => handleEditBook(book)} className="admin-btn-edit">Edit</button><button onClick={() => handleDeleteBook(book._id)} className="admin-btn-delete">Delete</button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {!isDataLoading && allBooks.length === 0 && (
                <div className="admin-empty-state">No books found matching your criteria.</div>
              )}
              {bookTotalPages > 1 && (
                <div className="pagination-controls">
                  <button disabled={bookPage === 1} onClick={() => setBookPage(prev => prev - 1)} className="admin-reminder-btn">Previous</button>
                  <span className="page-info">Page {bookPage} of {bookTotalPages}</span>
                  <button disabled={bookPage === bookTotalPages} onClick={() => setBookPage(prev => prev + 1)} className="admin-btn-edit" style={{ padding: '0.45rem 1.5rem' }}>Next</button>
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="admin-categories-layout">
            <section className="card admin-form-section">
              <h3 className="admin-table-title" style={{ marginBottom: '2rem' }}>{editingCategoryId ? 'Edit Category' : 'Create Category'}</h3>
              <form onSubmit={handleCreateCategory}>
                <div className="form-group"><label>Name</label><input type="text" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} required /></div>
                <div className="form-group"><label>Description</label><textarea className="admin-textarea" value={newCategory.description} onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })} rows={5} /></div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}><button type="submit" className="admin-btn-edit" style={{ flex: 1 }}>{editingCategoryId ? 'Save' : 'Create'}</button>{editingCategoryId && <button type="button" onClick={handleCancelCategoryEdit} className="admin-reminder-btn">Cancel</button>}</div>
              </form>
            </section>
            <section className="admin-categories-list-section">
              <div className="admin-table-header-box" style={{ borderRadius: '24px 24px 0 0', borderBottom: 'none' }}><h3 className="admin-table-title">Existing Categories</h3></div>
              <div className="admin-categories-grid" style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem',
                padding: '1.5rem', background: 'rgba(99, 102, 241, 0.02)', border: '1px solid var(--border-color)', borderRadius: '0 0 24px 24px'
              }}>
                {categories.map((c) => (
                  <div key={c._id} className="admin-category-card">
                    <div className="category-header"><span className="category-name">{c.name}</span><div className="admin-actions-flex"><button onClick={() => handleEditCategory(c)} className="admin-btn-edit" style={{ padding: '0.4rem 0.8rem' }}>Edit</button><button onClick={() => handleDeleteCategory(c)} className="admin-btn-delete" style={{ padding: '0.4rem 0.8rem' }}>Delete</button></div></div>
                    <p className="category-desc">{c.description || 'No description provided.'}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'requests' && (
          <section className="card admin-table-section">
            <div className="admin-table-header-box"><h3 className="admin-table-title">Return Requests</h3></div>
            <div className="admin-table-wrapper">
              {isDataLoading ? (
                <div className="admin-loading-container">
                  <div className="spinner"></div>
                  <p>Fetching Requests...</p>
                </div>
              ) : (
                <table className="admin-table">
                  <thead><tr><th>Borrower</th><th>Book</th><th>Status</th><th className="admin-actions-cell">Action</th></tr></thead>
                  <tbody>{borrows.filter(b => b.status === 'return_requested').map(b => (
                    <tr key={b._id}>
                      <td>
                        <div className="user-info-box">
                          <span className="user-main-name">{b.user_id?.name || 'Unknown'}</span>
                          <span className={`membership-pill ${((b.user_id as any)?.membership_id?.name || '').toLowerCase().includes('premium') ? 'membership-premium' : ''}`}>
                            {(b.user_id as any)?.membership_id?.name || 'Basic'}
                          </span>
                        </div>
                      </td>
                      <td><div className="book-info-box"><span className="book-main-title">{b.book_id?.title || 'Unknown'}</span></div></td>
                      <td><span className="status-badge status-return_requested">Return Requested</span></td>
                      <td className="admin-actions-cell"><button onClick={() => handleAcceptReturn(b._id)} className="admin-btn-edit">Accept Return</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
            {!isDataLoading && borrows.filter(b => b.status === 'return_requested').length === 0 && <div className="admin-empty-state">No pending returns.</div>}
          </section>
        )}

        {activeTab === 'user-requests' && (
          <section className="card admin-table-section">
            <div className="admin-table-header-box"><h3 className="admin-table-title">Book Suggestions</h3></div>
            <div className="admin-table-wrapper">
              {isDataLoading ? (
                <div className="admin-loading-container">
                  <div className="spinner"></div>
                  <p>Loading Suggestions...</p>
                </div>
              ) : (
                <table className="admin-table">
                  <thead><tr><th>User</th><th>Book Details</th><th>Status</th><th className="admin-actions-cell">Action</th></tr></thead>
                  <tbody>{userRequests.map(req => (
                    <tr key={req._id}>
                      <td>
                        <div className="user-info-box">
                          <span className="user-main-name">{req.user_id?.name || 'Unknown'}</span>
                          <span className="user-sub-email">{req.user_id?.email}</span>
                          <span className={`membership-pill ${((req.user_id as any)?.membership_id?.name || '').toLowerCase().includes('premium') ? 'membership-premium' : ''}`}>
                            {(req.user_id as any)?.membership_id?.name || 'Basic'}
                          </span>
                        </div>
                      </td>
                      <td><div className="book-info-box"><span className="book-main-title">{req.title}</span><span className="book-sub-meta">by {req.author}</span></div></td>
                      <td><span className={`status-badge status-${req.status}`}>{req.status}</span></td>
                      <td className="admin-actions-cell">{req.status === 'pending' ? (<div className="admin-actions-flex"><button onClick={() => handleBookRequestStatus(req._id, 'approved')} className="admin-btn-edit">Approve</button><button onClick={() => handleBookRequestStatus(req._id, 'rejected')} className="admin-btn-delete">Reject</button></div>) : <span className="admin-processed-text">Processed</span>}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
            {!isDataLoading && userRequests.length === 0 && <div className="admin-empty-state">No suggestions yet.</div>}
          </section>
        )}

        {activeTab === 'borrows' && (
          <section className="card admin-table-section">
            <div className="admin-table-header-box">
              <h3 className="admin-table-title">Borrow History</h3>
              <div className="admin-filter-group">
                <div className="admin-filter-item">
                  <span className="admin-filter-label">Status</span>
                  <select value={borrowStatusFilter} onChange={(e) => setBorrowStatusFilter(e.target.value)} className="admin-filter-select">
                    <option value="all">All Records</option>
                    <option value="borrowed">Borrowed</option>
                    <option value="returned">Returned</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div className="admin-filter-item">
                  <span className="admin-filter-label">Tier</span>
                  <select value={membershipFilter} onChange={(e) => setMembershipFilter(e.target.value)} className="admin-filter-select">
                    <option value="all">All Tiers</option>
                    <option value="basic">Basic</option>
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="admin-table-wrapper">
              {isDataLoading ? (
                <div className="admin-loading-container">
                  <div className="spinner"></div>
                  <p>Processing Records...</p>
                </div>
              ) : (
                <table className="admin-table">
                  <thead><tr><th>Borrower</th><th>Book</th><th>Dates</th><th>Fine</th><th>Status</th><th className="admin-actions-cell">Action</th></tr></thead>
                  <tbody>{borrows.map(b => {
                    const membershipName = (b.user_id as any)?.membership_id?.name || 'Basic';
                    const isPremiumUser = membershipName.toLowerCase().includes('premium');

                    return (
                      <tr key={b._id}>
                        <td>
                          <div className="user-info-box">
                            <span className="user-main-name">{b.user_id?.name}</span>
                            <span className={`membership-pill ${isPremiumUser ? 'membership-premium' : ''}`}>
                              {membershipName}
                            </span>
                          </div>
                        </td>
                        <td><div className="book-info-box"><span className="book-main-title">{b.book_id?.title}</span></div></td>
                        <td><div className="book-info-box"><div>Issued: {b.issued_date ? new Date(b.issued_date).toLocaleDateString() : 'N/A'}</div><div>Due: {b.return_date ? new Date(b.return_date).toLocaleDateString() : 'N/A'}</div></div></td>
                        <td><span className={`admin-fine-amount ${(b.fine_amount || 0) > 0 ? 'admin-fine-danger' : ''}`}>₹{(b.fine_amount || 0).toFixed(2)}</span></td>
                        <td><span className={`status-badge status-${b.status}`}>{b.status.replace(/_/g, ' ')}</span></td>
                        <td className="admin-actions-cell">{(b.fine_amount || 0) > 50 && <button onClick={() => handleSendReminder(b._id)} className="admin-reminder-btn">Remind</button>}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              )}
            </div>
            {borrowTotalPages > 1 && (
              <div className="pagination-controls">
                <button disabled={borrowPage === 1} onClick={() => setBorrowPage(prev => prev - 1)} className="admin-reminder-btn">Previous</button>
                <span className="page-info">Page {borrowPage} of {borrowTotalPages}</span>
                <button disabled={borrowPage === borrowTotalPages} onClick={() => setBorrowPage(prev => prev + 1)} className="admin-btn-edit" style={{ padding: '0.45rem 1.5rem' }}>Next</button>
              </div>
            )}
          </section>
        )}

        {activeTab === 'logs' && (
          <section className="card admin-table-section">
            <div className="admin-table-header-box"><h3 className="admin-table-title">Activity Logs</h3></div>
            <div className="admin-table-wrapper">
              {isDataLoading ? (
                <div className="admin-loading-container">
                  <div className="spinner"></div>
                  <p>Loading System Logs...</p>
                </div>
              ) : (
                <table className="admin-table">
                  <thead><tr><th>User</th><th>Action</th><th>Timestamp</th></tr></thead>
                  <tbody>{logs.map(log => (
                    <tr key={log._id}>
                      <td>
                        <div className="user-info-box">
                          <span className="user-main-name">{log.user_id?.name}</span>
                          <span className="user-sub-email">{log.user_id?.email}</span>
                          <span className={`membership-pill ${((log.user_id as any)?.membership_id?.name || '').toLowerCase().includes('premium') ? 'membership-premium' : ''}`}>
                            {(log.user_id as any)?.membership_id?.name || 'Basic'}
                          </span>
                        </div>
                      </td>
                      <td><span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{log.action}</span></td>
                      <td><span className="book-sub-meta">{new Date(log.timestamp).toLocaleString()}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
            {!isDataLoading && logs.length === 0 && <div className="admin-empty-state">No logs found.</div>}
          </section>
        )}
      </main>

      <ConfirmationModal
        isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message}
        type={confirmModal.type} isLoading={confirmModal.isLoading} onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default AdminDashboard;
