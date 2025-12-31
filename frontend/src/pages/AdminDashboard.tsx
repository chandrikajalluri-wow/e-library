import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createBook, getBooks, updateBook, deleteBook } from '../services/bookService';
import { createCategory, getCategories } from '../services/categoryService';
import { getAllBorrows, acceptReturn } from '../services/borrowService';
import { getAllBookRequests, updateBookRequestStatus, sendFineReminder } from '../services/userService';
import type { Book, Category, Borrow } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';
import '../styles/AdminDashboard.css';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('books');
  const [categories, setCategories] = useState<Category[]>([]);
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [userRequests, setUserRequests] = useState<any[]>([]);
  const [borrowStatusFilter, setBorrowStatusFilter] = useState('all');
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);

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

  useEffect(() => {
    fetchCommonData();
  }, []);

  useEffect(() => {
    if (activeTab === 'books') fetchBooks();
  }, [activeTab, bookPage]);

  useEffect(() => {
    if (activeTab === 'borrows') fetchBorrows();
  }, [activeTab, borrowPage]);

  useEffect(() => {
    if (activeTab === 'user-requests') fetchUserRequests();
  }, [activeTab]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCategory(newCategory);
      toast.success('Category created');
      setNewCategory({ name: '', description: '' });
      fetchCommonData();
    } catch (err: unknown) {
      toast.error('Failed to create category');
    }
  };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Partial<Book> = {
        ...newBook,
        price: parseFloat(newBook.price) || 0,
        pages: parseInt(newBook.pages) || 0,
        publishedYear: parseInt(newBook.publishedYear) || 0,
        noOfCopies: parseInt(newBook.noOfCopies) || 1,
      };

      if (editingBookId) {
        await updateBook(editingBookId, payload);
        toast.success('Book updated successfully');
        setEditingBookId(null);
      } else {
        await createBook(payload);
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
      fetchBooks();
    } catch (err: unknown) {
      toast.error(editingBookId ? 'Failed to update book' : 'Failed to create book');
    }
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
  };

  const handleDeleteBook = (id: string) => {
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
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    toast.info('Logged out');
    navigate('/');
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
          <NavItem id="books" label="Manage Books" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>} />
          <NavItem id="categories" label="Categories" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>} />
          <NavItem id="requests" label="Return Requests" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>} />
          <NavItem id="user-requests" label="Book Suggestions" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>} />
          <NavItem id="borrows" label="Borrow History" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>} />
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
          <h2 className="admin-header-title">
            {activeTab === 'books' && 'Manage Books'}
            {activeTab === 'categories' && 'Manage Categories'}
            {activeTab === 'requests' && 'Return Requests'}
            {activeTab === 'user-requests' && 'Book Suggestions'}
            {activeTab === 'borrows' && 'Borrow History'}
          </h2>
          <p className="admin-header-subtitle">Welcome back, Administrator</p>
        </header>

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
                  <label>Cover Image URL</label>
                  <input
                    type="text"
                    value={newBook.cover_image_url}
                    onChange={(e) => setNewBook({ ...newBook, cover_image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
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
              <div className="admin-table-header-box">
                <h3 className="admin-table-title">Library Inventory ({allBooks.length} Books)</h3>
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
                    {allBooks.map((book) => (
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
              <h3 style={{ marginBottom: '1.5rem' }}>Create New Category</h3>
              <form onSubmit={handleCreateCategory}>
                <div className="form-group"><label>Name</label><input type="text" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} required /></div>
                <div className="form-group"><label>Description</label><textarea value={newCategory.description} onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })} className="admin-form-textarea" /></div>
                <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.75rem' }}>Create Category</button>
              </form>
            </section>
            <section className="card admin-form-section">
              <h3 style={{ marginBottom: '1.5rem' }}>Existing Categories</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {categories.map((c) => (
                  <div key={c._id} className="admin-category-badge">
                    {c.name}
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
                  <th>User</th>
                  <th>Book</th>
                  <th>Due Date</th>
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
                      <td data-label="User" style={{ fontWeight: '500' }}>
                        <div>{b.user_id?.name || 'Unknown'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.user_id?.email}</div>
                      </td>
                      <td data-label="Book">{b.book_id?.title || 'Unknown'}</td>
                      <td data-label="Due Date">{new Date(b.return_date).toLocaleDateString()}</td>
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
