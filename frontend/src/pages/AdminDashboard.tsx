import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [activeTab, setActiveTab] = useState('stats');
  const [categories, setCategories] = useState<Category[]>([]);
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [userRequests, setUserRequests] = useState<any[]>([]);
  const [borrowStatusFilter, setBorrowStatusFilter] = useState('all');
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
    title: '',
    author: '',
    category_id: '',
    price: '',
    status: 'available',
    isbn: '',
    description: '',
    pages: '',
    publishedYear: '',
    cover_image_url: '',
    pdf_url: '',
    genre: '',
    language: '',
    noOfCopies: '1',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });

  // Pagination state
  const [bookPage, setBookPage] = useState(1);
  const [bookTotalPages, setBookTotalPages] = useState(1);
  const [borrowPage, setBorrowPage] = useState(1);
  const [borrowTotalPages, setBorrowTotalPages] = useState(1);

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
    isLoading: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    type: 'info',
    isLoading: false
  });

  const fetchCommonData = async () => {
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const fetchBorrows = async () => {
    try {
      const data = await getAllBorrows(`page=${borrowPage}&limit=10`);
      setBorrows(data.borrows);
      setBorrowTotalPages(data.pages);
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const fetchUserRequests = async () => {
    try {
      const data = await getAllBookRequests();
      setUserRequests(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch user requests');
    }
  };

  const fetchBooks = async () => {
    try {
      const data = await getBooks(`page=${bookPage}&limit=10&showArchived=true`);
      setAllBooks(data.books);
      setBookTotalPages(data.pages);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch books');
    }
  };

  const fetchLogs = async () => {
    try {
      const data = await getActivityLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch activity logs');
    }
  };

  const fetchStats = async () => {
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
        arr: any[],
        keyExtractor: (item: any) => string | undefined,
        valExtractor: (item: any) => number
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

      console.log('Calculated Stats:', newStats);
      setStats(newStats);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    fetchCommonData();
  }, []);

  useEffect(() => {
    if (activeTab === 'stats') fetchStats();
    if (activeTab === 'books') fetchBooks();
    if (activeTab === 'borrows') fetchBorrows();
    if (activeTab === 'user-requests') fetchUserRequests();
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab, bookPage, borrowPage]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, []);

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
    // Scroll to categories section if needed, or just let users scroll
  };

  const handleCancelCategoryEdit = () => {
    setEditingCategoryId(null);
    setNewCategory({ name: '', description: '' });
  };

  const handleDeleteCategory = (cat: Category) => {
    // Check if any book is using this category
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

          if (coverImageFile) {
            formData.append('cover_image', coverImageFile);
          } else {
            formData.append('cover_image_url', newBook.cover_image_url);
          }

          if (editingBookId) {
            await updateBook(editingBookId, formData);
            toast.success('Book updated successfully');
            setEditingBookId(null);
          } else {
            await createBook(formData);
            toast.success('Book created successfully');
          }

          setNewBook({
            title: '',
            author: '',
            category_id: '',
            price: '',
            status: 'available',
            isbn: '',
            description: '',
            pages: '',
            publishedYear: '',
            cover_image_url: '',
            pdf_url: '',
            genre: '',
            language: '',
            noOfCopies: '1',
          });
          setCoverImageFile(null);
          fetchBooks();
          setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err: unknown) {
          toast.error(editingBookId ? 'Failed to update book' : 'Failed to create book');
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  };

  const handleEditBook = (book: Book) => {
    setEditingBookId(book._id);
    setNewBook({
      title: book.title,
      author: book.author,
      category_id: typeof book.category_id === 'string' ? book.category_id : book.category_id?._id || '',
      price: book.price.toString(),
      status: book.status,
      isbn: book.isbn || '',
      description: book.description || '',
      pages: book.pages?.toString() || '',
      publishedYear: book.publishedYear?.toString() || '',
      cover_image_url: book.cover_image_url || '',
      pdf_url: book.pdf_url || '',
      genre: book.genre || '',
      language: book.language || '',
      noOfCopies: book.noOfCopies.toString(),
    });
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingBookId(null);
    setNewBook({
      title: '',
      author: '',
      category_id: '',
      price: '',
      status: 'available',
      isbn: '',
      description: '',
      pages: '',
      publishedYear: '',
      cover_image_url: '',
      pdf_url: '',
      genre: '',
      language: '',
      noOfCopies: '1',
    });
    setCoverImageFile(null);
  };

  const handleDeleteBook = (id: string) => {
    const book = allBooks.find(b => b._id === id);
    if (book && book.status === 'issued') {
      toast.error('Cannot delete a book that is currently issued/borrowed.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Delete Book',
      message: 'Are you sure you want to delete this book? This action cannot be undone.',
      type: 'danger',
      isLoading: false,
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
      isOpen: true,
      title: 'Accept Return',
      message: 'Are you sure you want to accept this return request?',
      type: 'info',
      isLoading: false,
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
      const msg = err.response?.data?.error || 'Failed to send reminder';
      toast.error(msg);
    }
  };

  const handleBookRequestStatus = (id: string, status: string) => {
    setConfirmModal({
      isOpen: true,
      title: `${status.charAt(0).toUpperCase() + status.slice(1)} Request`,
      message: `Are you sure you want to ${status} this book request?`,
      type: status === 'rejected' ? 'danger' : 'info',
      isLoading: false,
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
      isOpen: true,
      title: 'Confirm Logout',
      message: 'Are you sure you want to log out from the admin panel?',
      type: 'warning',
      isLoading: false,
      onConfirm: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        toast.info('Logged out');
        navigate('/');
      }
    });
  };

  const NavItem = ({ id, label, icon }: { id: string; label: string; icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`admin-nav-item ${activeTab === id ? 'admin-nav-item-active' : 'admin-nav-item-inactive'}`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-logo-section">
          <div className="admin-logo-box">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v15.661a2.5 2.5 0 0 1-2.261 2.482L5 20.5a2.5 2.5 0 0 1-1-5z"></path></svg>
          </div>
          <span className="admin-logo-text">E-Library Admin</span>
        </div>

        <nav className="admin-nav">
          <NavItem id="stats" label="Statistics" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>} />
          <NavItem id="books" label="Manage Books" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>} />
          <NavItem id="categories" label="Categories" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>} />
          <NavItem id="requests" label="Return Requests" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>} />
          <NavItem id="user-requests" label="Book Suggestions" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>} />
          <NavItem id="borrows" label="Borrow History" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>} />
          <NavItem id="logs" label="Activity Logs" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>} />
        </nav>

        <button
          onClick={handleLogout}
          className="admin-logout-btn"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="9" y2="12"></line></svg>
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="admin-main-content">
        <header className="admin-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
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
            <div className="admin-header-actions-container">
              {activeTab === 'stats' && (
                <button
                  onClick={fetchStats}
                  className="admin-refresh-stats-btn"
                >
                  Refresh Stats
                </button>
              )}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="admin-notification-toggle"
              >
                {showNotifications ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                )}
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span className="notification-badge-icon">
                    {notifications.filter(n => !n.is_read).length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="admin-notification-panel">
                  <div className="notification-panel-header">
                    <h4>Notifications</h4>
                    <button onClick={handleMarkAllRead} className="mark-read-btn">Mark all as read</button>
                  </div>
                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n._id} onClick={() => handleMarkRead(n._id)} className="notification-item-container" style={{ opacity: n.is_read ? 0.6 : 1 }}>
                          <div className="notification-item-message" style={{ fontWeight: n.is_read ? 400 : 600 }}>{n.message}</div>
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
              <span className="stats-label">Total Books</span>
              <span className="stats-value">{stats.totalBooks}</span>
            </div>
            <div className="card stats-card-content">
              <span className="stats-label">Active Borrowers</span>
              <span className="stats-value">{stats.totalUsers}</span>
            </div>
            <div className="card stats-card-content">
              <span className="stats-label">Currently Borrowed</span>
              <span className="stats-value stats-value-accent">{stats.activeBorrows}</span>
            </div>
            <div className="card stats-card-content">
              <span className="stats-label">Overdue Books</span>
              <span className="stats-value stats-value-danger">{stats.overdueBooks}</span>
            </div>
            <div className="card stats-card-content">
              <span className="stats-label">Total Categories</span>
              <span className="stats-value">{categories.length}</span>
            </div>
            <div className="card stats-card-content">
              <span className="stats-label">Pending Returns</span>
              <span className="stats-value stats-value-warning">{stats.pendingReturns}</span>
            </div>
            <div className="card stats-card-content">
              <span className="stats-label">Pending Suggestions</span>
              <span className="stats-value stats-value-info">{stats.pendingSuggestions}</span>
            </div>
            <div className="card stats-card-content">
              <span className="stats-label">Most Borrowed Book</span>
              <span className="stats-value-text">{stats.mostBorrowedBook}</span>
            </div>
            <div className="card stats-card-content">
              <span className="stats-label">Most Wishlisted Book</span>
              <span className="stats-value-text">{stats.mostWishlistedBook}</span>
            </div>
            <div className="card stats-card-content">
              <span className="stats-label">Most Active User</span>
              <span className="stats-value-text">{stats.mostActiveUser}</span>
            </div>
            <div className="card stats-card-content">
              <span className="stats-label">Most Fined User</span>
              <span className="stats-value-text">{stats.mostFinedUser}</span>
            </div>
          </div>
        )}

        {activeTab === 'books' && (
          <div className="admin-section-grid">
            <section className="card admin-form-section">
              <div className="admin-form-header">
                <h3 className="admin-form-title">
                  {editingBookId ? 'Edit Book Details' : 'Add New Book to Collection'}
                </h3>
                {editingBookId && (
                  <button
                    onClick={handleCancelEdit}
                    className="admin-cancel-btn"
                  >
                    Cancel Editing
                  </button>
                )}
              </div>
              <form onSubmit={handleCreateBook} className="admin-book-form">
                <div className="form-group"><label>Title</label><input type="text" value={newBook.title} onChange={(e) => setNewBook({ ...newBook, title: e.target.value })} required /></div>
                <div className="form-group"><label>Author</label><input type="text" value={newBook.author} onChange={(e) => setNewBook({ ...newBook, author: e.target.value })} required /></div>
                <div className="form-group">
                  <label>Category</label>
                  <select value={newBook.category_id} onChange={(e) => setNewBook({ ...newBook, category_id: e.target.value })} required>
                    <option value="">Select Category</option>
                    {categories.map((c) => (<option key={c._id} value={c._id}>{c.name}</option>))}
                  </select>
                </div>
                <div className="form-group"><label>Genre</label><input type="text" value={newBook.genre} onChange={(e) => setNewBook({ ...newBook, genre: e.target.value })} /></div>
                <div className="form-group"><label>Price (₹)</label><input type="number" value={newBook.price} onChange={(e) => setNewBook({ ...newBook, price: e.target.value })} /></div>
                <div className="form-group"><label>Pages</label><input type="number" value={newBook.pages} onChange={(e) => setNewBook({ ...newBook, pages: e.target.value })} /></div>
                <div className="form-group"><label>ISBN</label><input type="text" value={newBook.isbn} onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })} /></div>
                <div className="form-group"><label>No. of Copies</label><input type="number" value={newBook.noOfCopies} onChange={(e) => setNewBook({ ...newBook, noOfCopies: e.target.value })} required /></div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={newBook.status} onChange={(e) => setNewBook({ ...newBook, status: e.target.value })} required>
                    <option value="available">Available</option>
                    <option value="issued">Issued</option>
                    <option value="archived">Archived</option>
                    <option value="damaged">Damaged</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Cover Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCoverImageFile(e.target.files ? e.target.files[0] : null)}
                  />
                  {newBook.cover_image_url && !coverImageFile && (
                    <div style={{ fontSize: '0.8rem', marginTop: '5px' }}>
                      Current: <a href={newBook.cover_image_url} target="_blank" rel="noreferrer">View Image</a>
                    </div>
                  )}
                </div>
                <div style={{ gridColumn: 'span 3' }}>
                  <label>Description</label>
                  <textarea
                    value={newBook.description}
                    onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
                    className="admin-form-textarea"
                  />
                </div>
                <button type="submit" className="btn-primary admin-submit-btn">
                  {editingBookId ? 'Update Book Record' : 'Add Book to Inventory'}
                </button>
              </form>
            </section>

            <section className="card admin-table-section">
              <div className="admin-table-header-box admin-header-flex">
                <h3 className="admin-table-title">Library Inventory</h3>
                <input
                  type="text"
                  placeholder="Search by title or author..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="admin-search-input"
                />
              </div>
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: '200px' }}>Book Details</th>
                      <th>Category</th>
                      <th>Pages</th>
                      <th>Price</th>
                      <th>Copies</th>
                      <th>Status</th>
                      <th className="admin-actions-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allBooks.filter(b =>
                      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      b.author.toLowerCase().includes(searchTerm.toLowerCase())
                    ).map((book) => (
                      <tr key={book._id}>
                        <td data-label="Book Details">
                          <div className="admin-book-title">{book.title}</div>
                          <div className="admin-book-meta">by {book.author} | {book.genre}</div>
                        </td>
                        <td data-label="Category" style={{ fontSize: '0.9rem' }}>{typeof book.category_id === 'string' ? book.category_id : book.category_id?.name}</td>
                        <td data-label="Pages" style={{ fontSize: '0.9rem' }}>{book.pages || '-'}</td>
                        <td data-label="Price" style={{ fontSize: '0.9rem' }}>₹{book.price}</td>
                        <td data-label="Copies" style={{ fontSize: '0.9rem' }}>{book.noOfCopies}</td>
                        <td data-label="Status"><span className={`status-badge status-${book.status}`}>{book.status}</span></td>
                        <td data-label="Actions" className="admin-actions-cell">
                          <div className="admin-actions-flex">
                            <button
                              onClick={() => handleEditBook(book)}
                              className="admin-btn-edit"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteBook(book._id)}
                              className="admin-btn-delete"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {allBooks.length === 0 && (
                <div className="admin-empty-state">No books in the collection yet.</div>
              )}
              {bookTotalPages > 1 && (
                <div className="pagination-controls">
                  <button
                    disabled={bookPage === 1}
                    onClick={() => setBookPage(prev => prev - 1)}
                    className="btn-secondary"
                  >
                    Previous
                  </button>
                  <span className="page-info">Page {bookPage} of {bookTotalPages}</span>
                  <button
                    disabled={bookPage === bookTotalPages}
                    onClick={() => setBookPage(prev => prev + 1)}
                    className="btn-primary"
                  >
                    Next
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="admin-categories-grid">
            <section className="card admin-form-section">
              <h3 style={{ marginBottom: '1.5rem' }}>
                {editingCategoryId ? 'Edit Category' : 'Create New Category'}
              </h3>
              <form onSubmit={handleCreateCategory}>
                <div className="form-group"><label>Name</label><input type="text" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} required /></div>
                <div className="form-group"><label>Description</label><textarea value={newCategory.description} onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })} className="admin-form-textarea" /></div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.75rem' }}>
                    {editingCategoryId ? 'Update Category' : 'Create Category'}
                  </button>
                  {editingCategoryId && (
                    <button type="button" onClick={handleCancelCategoryEdit} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                  )}
                </div>
              </form>
            </section>
            <section className="card admin-form-section">
              <h3 style={{ marginBottom: '1.5rem' }}>Existing Categories</h3>
              <div className="admin-categories-list">
                {categories.map((c) => (
                  <div key={c._id} className="admin-category-card" title={c.description}>
                    <div className="category-name">{c.name}</div>
                    <div className="category-desc">{c.description || 'No description'}</div>
                    <div className="category-actions">
                      <button onClick={() => handleEditCategory(c)} className="btn-icon-edit">Edit</button>
                      <button onClick={() => handleDeleteCategory(c)} className="btn-icon-delete">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'requests' && (
          <section className="card admin-table-section">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Book</th>
                  <th>Status</th>
                  <th className="admin-actions-cell">Action</th>
                </tr>
              </thead>
              <tbody>
                {borrows.filter((b) => b.status === 'return_requested').map((b) => (
                  <tr key={b._id}>
                    <td data-label="User" style={{ fontWeight: '500' }}>{b.user_id?.name || 'Unknown'}</td>
                    <td data-label="Book">{b.book_id?.title || 'Unknown'}</td>
                    <td data-label="Status"><span className={`status-badge status-${b.status}`}>{b.status}</span></td>
                    <td data-label="Action" className="admin-actions-cell">
                      <button onClick={() => handleAcceptReturn(b._id)} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Accept Return</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {borrows.filter((b) => b.status === 'return_requested').length === 0 && (
              <div className="admin-empty-state">No pending return requests.</div>
            )}
          </section>
        )}

        {activeTab === 'user-requests' && (
          <section className="card admin-table-section">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Book Title</th>
                  <th>Author</th>
                  <th>Status</th>
                  <th className="admin-actions-cell">Action</th>
                </tr>
              </thead>
              <tbody>
                {userRequests.map((req: any) => (
                  <tr key={req._id}>
                    <td data-label="User">
                      <div style={{ fontWeight: '500' }}>{req.user_id?.name || 'Unknown'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{req.user_id?.email}</div>
                    </td>
                    <td data-label="Book Title">{req.title}</td>
                    <td data-label="Author">{req.author}</td>
                    <td data-label="Status"><span className={`status-badge status-${req.status}`}>{req.status}</span></td>
                    <td data-label="Action" className="admin-actions-cell">
                      {req.status === 'pending' ? (
                        <div className="admin-actions-flex">
                          <button onClick={() => handleBookRequestStatus(req._id, 'approved')} style={{ padding: '0.4rem 0.8rem', backgroundColor: '#10b981', color: 'white', borderRadius: '6px', fontSize: '0.875rem' }}>Approve</button>
                          <button onClick={() => handleBookRequestStatus(req._id, 'rejected')} style={{ padding: '0.4rem 0.8rem', color: '#ef4444', border: '1px solid #ef4444', backgroundColor: 'transparent', borderRadius: '6px', fontSize: '0.875rem' }}>Reject</button>
                        </div>
                      ) : <span className="admin-processed-text">Processed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {userRequests.length === 0 && (
              <div className="admin-empty-state">No book suggestions yet.</div>
            )}
          </section>
        )}

        {activeTab === 'borrows' && (
          <section className="card admin-table-section">
            <div className="admin-table-header-box admin-header-with-filter">
              <h3 className="admin-table-title">Borrow Records</h3>
              <div className="admin-filter-section">
                <span className="admin-filter-label">Filter by Status:</span>
                <select
                  value={borrowStatusFilter}
                  onChange={(e) => setBorrowStatusFilter(e.target.value)}
                  className="admin-filter-select"
                >
                  <option value="all">All Statuses</option>
                  <option value="borrowed">Borrowed</option>
                  <option value="returned">Returned</option>
                  <option value="return_requested">Return Requested</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Borrower Details</th>
                  <th>Book</th>
                  <th>Dates</th>
                  <th>Fine</th>
                  <th>Status</th>
                  <th className="admin-actions-cell">Action</th>
                </tr>
              </thead>
              <tbody>
                {borrows
                  .filter(b => borrowStatusFilter === 'all' || b.status === borrowStatusFilter)
                  .map((b) => (
                    <tr key={b._id}>
                      <td data-label="Borrower Details" className="user-cell-name">
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{b.user_id?.name || 'Unknown'}</span>
                          <span className="user-cell-email">{b.user_id?.email}</span>
                          {/* We could potentially fetch more user details or just show this */}
                        </div>
                      </td>
                      <td data-label="Book">{b.book_id?.title || 'Unknown'}</td>
                      <td data-label="Dates">
                        <div style={{ fontSize: '0.85rem' }}>
                          <div>Issued: {b.issued_date ? new Date(b.issued_date as string).toLocaleDateString() : 'N/A'}</div>
                          <div>Due: {new Date(b.return_date).toLocaleDateString()}</div>
                        </div>
                      </td>
                      <td data-label="Fine">
                        <span className={`admin-fine-amount ${(b.fine_amount || 0) > 0 || new Date() > new Date(b.return_date) ? 'admin-fine-danger' : ''}`}>
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
                      <td data-label="Status"><span className={`status-badge status-${b.status}`}>{b.status}</span></td>
                      <td data-label="Action" className="admin-actions-cell">
                        <div className="admin-actions-flex">
                          {b.status === 'return_requested' && (
                            <button
                              onClick={() => handleAcceptReturn(b._id)}
                              className="btn-primary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                            >
                              Accept Return
                            </button>
                          )}
                          {(() => {
                            let fine = b.fine_amount || 0;
                            if (b.status !== 'returned' && b.status !== 'archived' && new Date() > new Date(b.return_date)) {
                              const diffTime = Math.abs(new Date().getTime() - new Date(b.return_date).getTime());
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              fine += diffDays * 10;
                            }
                            return fine > 50;
                          })() && (
                              <button
                                onClick={() => handleSendReminder(b._id)}
                                className="btn-secondary admin-reminder-btn"
                                title="Fine exceeds ₹50"
                              >
                                Send Reminder
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {borrows.filter(b => borrowStatusFilter === 'all' || b.status === borrowStatusFilter).length === 0 && (
              <div className="admin-empty-state">
                No borrow records found matching this status.
              </div>
            )}
            {borrowTotalPages > 1 && (
              <div className="pagination-controls">
                <button
                  disabled={borrowPage === 1}
                  onClick={() => setBorrowPage(prev => prev - 1)}
                  className="btn-secondary"
                >
                  Previous
                </button>
                <span className="page-info">Page {borrowPage} of {borrowTotalPages}</span>
                <button
                  disabled={borrowPage === borrowTotalPages}
                  onClick={() => setBorrowPage(prev => prev + 1)}
                  className="btn-primary"
                >
                  Next
                </button>
              </div>
            )}
          </section>
        )}

        {activeTab === 'logs' && (
          <section className="card admin-table-section">
            <div className="admin-table-header-box">
              <h3 className="admin-table-title">Recent Activities</h3>
            </div>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Action</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td data-label="User">
                        <div style={{ fontWeight: '500' }}>{log.user_id?.name || 'Unknown'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.user_id?.email}</div>
                      </td>
                      <td data-label="Action">{log.action}</td>
                      <td data-label="Timestamp">{new Date(log.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {logs.length === 0 && (
              <div className="admin-empty-state">No activity logs found.</div>
            )}
          </section>
        )}
      </main>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        isLoading={confirmModal.isLoading}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default AdminDashboard;
