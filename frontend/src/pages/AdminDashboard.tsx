import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { CircleSlash, RefreshCw, Plus, Minus, Search, Filter, BookOpen, Layers, Tag, FileText, Download, Eye, XCircle, X, TrendingUp } from 'lucide-react';
import { createBook, getBooks, getBook, updateBook, deleteBook, checkBookDeletionSafety } from '../services/bookService';
import { getCategories, updateCategory, createCategory, deleteCategory as removeCategory } from '../services/categoryService';
import { getAllOrders, updateOrderStatus } from '../services/adminOrderService';
import { getAllBookRequests, updateBookRequestStatus, getProfile, getAllReadlistEntries, getAdminDashboardStats } from '../services/userService';

import { getActivityLogs } from '../services/logService';
import { getAdmins } from '../services/superAdminService';
import { generateBookContent } from '../services/aiService';
import { exportBooksToCSV } from '../utils/csvExport';
import { RoleName, BookStatus, RequestStatus, MembershipName } from '../types/enums';
import type { Book, Category, User } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';
import Loader from '../components/Loader';
import { motion, AnimatePresence } from 'framer-motion';
import AdminSupportManager from '../components/AdminSupportManager';
import '../styles/AdminDashboard.css';
import '../styles/Pagination.css';

interface AdminDashboardProps {
  hideHeader?: boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ hideHeader = false }) => {
  const [searchParams] = useSearchParams();
  // const navigate = useNavigate();
  const activeTab = searchParams.get('tab') || 'stats';

  const [categories, setCategories] = useState<Category[]>([]);
  const [readHistory, setReadHistory] = useState<any[]>([]);
  const [userRequests, setUserRequests] = useState<any[]>([]);
  const [orderReturns, setOrderReturns] = useState<any[]>([]);
  const [exchangePage, setExchangePage] = useState(1);
  const [exchangeTotalPages, setExchangeTotalPages] = useState(1);
  const [exchangeTotalOrders, setExchangeTotalOrders] = useState(0);
  const [membershipFilter, setMembershipFilter] = useState('all');
  const [bookTypeFilter, setBookTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [readHistoryStatusFilter, setReadHistoryStatusFilter] = useState('all');
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [admins, setAdmins] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalUsers: 0,
    totalReads: 0,
    activeReads: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    pendingSuggestions: 0,
    mostReadBook: 'N/A',
    mostWishlistedBook: 'N/A',
    mostActiveUser: 'N/A',
    topBuyer: 'N/A',
    totalCategories: 0
  });

  const [newBook, setNewBook] = useState({
    title: '', author: '', category_id: '', price: '', status: BookStatus.AVAILABLE, isbn: '',
    description: '', pages: '', publishedYear: '', cover_image_url: '', pdf_url: '',
    genre: '', language: '', noOfCopies: '1', isPremium: false, author_description: '',
    author_image_url: '', addedBy: '', rating: '0'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [authorImageFile, setAuthorImageFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsTotalCount, setLogsTotalCount] = useState(0);
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('all');
  const [logSortOrder, setLogSortOrder] = useState('desc');
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });

  const [bookPage, setBookPage] = useState(1);
  const [bookTotalPages, setBookTotalPages] = useState(1);
  const [readHistoryPage, setReadHistoryPage] = useState(1);
  const [readHistoryTotalPages, setReadHistoryTotalPages] = useState(1);
  const [showAddBookForm, setShowAddBookForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
    type: 'danger' | 'warning' | 'info'; isLoading: boolean;
  }>({
    isOpen: false, title: '', message: '', onConfirm: () => { }, type: 'info', isLoading: false
  });

  const [isDataLoading, setIsDataLoading] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab, bookPage, exchangePage, logsPage, readHistoryPage]);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [exchangeStatusFilter, setExchangeStatusFilter] = useState('return_requested');
  const [suggestionSearch, setSuggestionSearch] = useState('');
  const [suggestionStatusFilter, setSuggestionStatusFilter] = useState('all');
  const [suggestionSort, setSuggestionSort] = useState('newest');
  const [exchangeReasonFilter, setExchangeReasonFilter] = useState('all');
  const [exchangeSort, setExchangeSort] = useState('desc');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const inventoryRef = useRef<HTMLDivElement>(null);
  const readHistoryRef = useRef<HTMLDivElement>(null);

  const [exchangeSearch, setExchangeSearch] = useState('');
  const delayDebounceFn = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (activeTab === 'requests') {
      if (delayDebounceFn.current) clearTimeout(delayDebounceFn.current);
      delayDebounceFn.current = setTimeout(() => {
        fetchOrderReturns();
      }, 500);
    }
    return () => {
      if (delayDebounceFn.current) clearTimeout(delayDebounceFn.current);
    };
  }, [exchangeSearch]);

  const fetchCommonData = async () => {
    try {
      setIsInitialLoading(true);
      const profile = await getProfile();
      setCurrentUser(profile);

      const cats = await getCategories();
      setCategories(cats);

      // Fetch stats for all admins so header counts are accurate
      fetchStats();

      if (profile.role === RoleName.SUPER_ADMIN) {
        const adminList = await getAdmins();
        setAdmins(adminList);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'books' && bookPage > 1) {
      inventoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (activeTab === 'read-history' && readHistoryPage > 1) {
      readHistoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (activeTab === 'requests' && exchangePage > 1) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [bookPage, readHistoryPage, exchangePage, activeTab]);

  // Handle deep-linking for editing a book
  useEffect(() => {
    const editBookId = searchParams.get('editBookId');
    if (editBookId) {
      const bookToEdit = allBooks.find(b => b._id === editBookId);
      if (bookToEdit) {
        if (editingBookId !== editBookId) {
          handleEditBook(bookToEdit);
        }
      } else {
        // Fetch book if not in current list
        const loadAndEdit = async () => {
          try {
            const book = await getBook(editBookId);
            handleEditBook(book);
          } catch (err) {
            console.error("Failed to fetch book for editing", err);
          }
        };
        loadAndEdit();
      }
    }
  }, [searchParams, allBooks]);

  const fetchReadHistory = async () => {
    setIsDataLoading(true);
    try {
      const data = await getAllReadlistEntries(`page=${readHistoryPage}&limit=10&membership=${membershipFilter}&status=${readHistoryStatusFilter}`);
      setReadHistory(data.readlist);
      setReadHistoryTotalPages(data.pages);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsDataLoading(false);
    }
  };

  const fetchUserRequests = async () => {
    setIsDataLoading(true);
    try {
      const data = await getAllBookRequests(suggestionSort);
      setUserRequests(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch user requests');
    } finally {
      setIsDataLoading(false);
    }
  };

  const fetchOrderReturns = async () => {
    setIsDataLoading(true);
    try {
      const statusToSend = exchangeStatusFilter === 'all_exchanges' ? 'return_requested,return_accepted,returned,return_rejected,refund_initiated,refunded' : exchangeStatusFilter;
      const data = await getAllOrders({
        status: statusToSend,
        search: exchangeSearch,
        page: exchangePage,
        limit: 10,
        reason: exchangeReasonFilter,
        sort: exchangeSort === 'asc' ? 'oldest' : 'newest'
      });
      console.log('Fetched exchange orders:', data);

      // Handle paginated response
      if (data && data.orders) {
        setOrderReturns(data.orders);
        setExchangeTotalPages(data.totalPages || 1);
        setExchangeTotalOrders(data.totalOrders || 0);
      } else {
        setOrderReturns(Array.isArray(data) ? data : []);
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error('Failed to fetch order returns');
    } finally {
      setIsDataLoading(false);
    }
  };


  const fetchBooks = async () => {
    setIsDataLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', bookPage.toString());
      params.append('limit', '10');
      params.append('showArchived', 'true');
      params.append('search', searchTerm);

      if (bookTypeFilter === MembershipName.PREMIUM.toLowerCase()) {
        params.append('isPremium', 'true');
      } else if (bookTypeFilter === MembershipName.BASIC.toLowerCase()) {
        params.append('isPremium', 'false');
      }

      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }

      if (stockFilter !== 'all') {
        params.append('stock', stockFilter);
      }

      const data = await getBooks(params.toString());
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
      const params = new URLSearchParams();
      params.append('page', logsPage.toString());
      params.append('limit', '15');
      params.append('role', 'admin');
      params.append('sort', logSortOrder);
      if (logSearchTerm) params.append('search', logSearchTerm);
      if (logActionFilter !== 'all') params.append('action', logActionFilter);

      const data = await getActivityLogs(params.toString());
      setLogs(data.logs);
      setLogsTotalPages(data.totalPages);
      setLogsTotalCount(data.totalLogs);
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
      const data = await getAdminDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
      toast.error('Failed to update statistics');
    } finally {
      setIsStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchCommonData();
  }, []);

  useEffect(() => {
    fetchOrderReturns();
  }, [exchangeStatusFilter, exchangeSearch, exchangePage, exchangeReasonFilter, exchangeSort]);

  // Reset page on filter change
  useEffect(() => {
    setExchangePage(1);
  }, [exchangeStatusFilter, exchangeSearch, exchangeReasonFilter, exchangeSort]);

  useEffect(() => {
    setLogsPage(1);
  }, [logActionFilter, logSearchTerm, logSortOrder]);

  useEffect(() => {
    if (activeTab === 'read-history') fetchReadHistory();
    if (activeTab === 'requests') fetchOrderReturns();
    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'user-requests') fetchUserRequests();
  }, [activeTab, readHistoryPage, logsPage, membershipFilter, readHistoryStatusFilter, logActionFilter, logSearchTerm, logSortOrder, suggestionSort]);

  useEffect(() => {
    if (activeTab === 'books') fetchBooks();
  }, [activeTab, bookPage, currentUser, bookTypeFilter, categoryFilter, stockFilter]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (activeTab === 'books') {
        setBookPage(1);
        fetchBooks();
      }
      if (activeTab === 'logs') {
        setLogsPage(1);
        fetchLogs();
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, logSearchTerm]);

  // Filter resets
  useEffect(() => { setBookPage(1); }, [bookTypeFilter, categoryFilter, stockFilter]);
  useEffect(() => { setReadHistoryPage(1); }, [membershipFilter, readHistoryStatusFilter]);
  useEffect(() => { setLogsPage(1); }, [activeTab]); // Reset logs page when entering tab

  useEffect(() => {
    // Prevent fetching until currentUser is loaded to avoid "flicker" with global stats
    if (!currentUser) return;

    if (activeTab === 'read-history') fetchReadHistory();
    else if (activeTab === 'user-requests') fetchUserRequests();
    else if (activeTab === 'requests') fetchOrderReturns();
    else if (activeTab === 'books') fetchBooks();
    else if (activeTab === 'logs') fetchLogs();
    else if (activeTab === 'stats') fetchStats();
  }, [activeTab, bookPage, readHistoryPage, logsPage, currentUser]);

  const handleGenerateWithAI = async () => {
    if (!newBook.title || !newBook.author) {
      toast.error('Please enter both book title and author name first');
      return;
    }

    setIsGeneratingAI(true);
    try {
      const generatedContent = await generateBookContent(newBook.title, newBook.author);

      setNewBook({
        ...newBook,
        description: generatedContent.description,
        author_description: generatedContent.authorBio
      });

      toast.success('AI content generated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate content with AI');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmModal({
      isOpen: true,
      title: editingCategoryId ? 'Confirm Update' : 'Confirm New Category',
      message: editingCategoryId
        ? `Are you sure you want to update the category "${newCategory.name}" ? `
        : `Are you sure you want to create the category "${newCategory.name}" ? `,
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
    setShowCategoryForm(false);
  };

  const handleDeleteCategory = (category: Category) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Category',
      message: `Are you sure you want to delete the category "${category.name}" ? This action cannot be undone.`,
      type: 'danger',
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
          await removeCategory(category._id);
          toast.success('Category deleted successfully');
          fetchCommonData();
          setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err: any) {
          console.error(err);
          toast.error(err.response?.data?.error || 'Failed to delete category');
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  };


  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmModal({
      isOpen: true,
      title: editingBookId ? 'Confirm Update' : 'Confirm Add Book',
      message: editingBookId
        ? `Are you sure you want to update the details for "${newBook.title}" ? `
        : `Are you sure you want to add "${newBook.title}" to the library ? `,
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
          formData.append('rating', (newBook as any).rating || '0');
          formData.append('author_description', newBook.author_description);

          if ((newBook as any).addedBy) {
            formData.append('addedBy', (newBook as any).addedBy);
          }

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

            // Auto-approve if coming from a suggestion
            if (selectedRequestId) {
              handleBookRequestStatus(selectedRequestId, RequestStatus.APPROVED, true);
              setSelectedRequestId(null);
            }
          }

          setNewBook({
            title: '', author: '', category_id: '', price: '', status: BookStatus.AVAILABLE, isbn: '',
            description: '', pages: '', publishedYear: '', cover_image_url: '', pdf_url: '',
            genre: '', language: '', noOfCopies: '1', isPremium: false, author_description: '',
            author_image_url: '', addedBy: '', rating: '0'
          });
          setCoverImageFile(null);
          setAuthorImageFile(null);
          setPdfFile(null);
          setShowAddBookForm(false);
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
      price: book.price?.toString() || '0', status: book.status || BookStatus.AVAILABLE, isbn: book.isbn || '',
      description: book.description || '', pages: book.pages?.toString() || '0',
      publishedYear: book.publishedYear?.toString() || '', cover_image_url: book.cover_image_url || '',
      pdf_url: book.pdf_url || '', genre: book.genre || '', language: book.language || '',
      noOfCopies: book.noOfCopies?.toString() || '1', isPremium: book.isPremium || false,
      author_description: book.author_description || '', author_image_url: book.author_image_url || '',
      addedBy: typeof book.addedBy === 'string' ? book.addedBy : (book.addedBy as any)?._id || '',
      rating: book.rating?.toString() || '0'
    } as any);
    setShowAddBookForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingBookId(null);
    setNewBook({
      title: '', author: '', category_id: '', price: '', status: BookStatus.AVAILABLE, isbn: '',
      description: '', pages: '', publishedYear: '', cover_image_url: '', pdf_url: '',
      genre: '', language: '', noOfCopies: '1', isPremium: false, author_description: '',
      author_image_url: '', addedBy: '', rating: '0'
    });
    setCoverImageFile(null);
    setAuthorImageFile(null);
    setPdfFile(null);
    setSelectedRequestId(null);
    setShowAddBookForm(false);
  };

  const handleDeleteBook = async (id: string) => {
    const book = allBooks.find(b => b._id === id);
    if (book) {
      if (book.status === BookStatus.OUT_OF_STOCK) {
        toast.error(`Cannot delete "${book.title}" because it is currently issued.`);
        return;
      }

      try {
        const safetyCheck = await checkBookDeletionSafety(id);
        if (!safetyCheck.canDelete) {
          toast.error(safetyCheck.reason || `Cannot delete "${book.title}" as it is currently in use.`);
          return;
        }
      } catch (err) {
        console.error('Safety check failed', err);
        // On error, we proceed to modal and let final delete handle it
      }
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
        } catch (err: any) {
          const errMsg = err.response?.data?.error || 'Failed to delete book';
          toast.error(errMsg);
          setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        }
      }
    });
  };

  const handleExportBooks = async () => {
    try {
      toast.info('Preparing export...');
      // Fetch ALL books without pagination
      const data = await getBooks('showArchived=true&limit=10000');

      if (!data.books || data.books.length === 0) {
        toast.info('No books to export');
        return;
      }

      exportBooksToCSV(data.books);
      toast.success(`Exported ${data.books.length} books successfully`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export books');
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setBookTypeFilter('all');
    setCategoryFilter('all');
    setStockFilter('all');
    setBookPage(1);
    toast.info('Filters cleared');
  };




  const handleBookRequestStatus = (id: string, status: string, silent = false) => {
    if (silent) {
      return updateBookRequestStatus(id, status)
        .then(() => fetchUserRequests())
        .catch(err => console.error('Failed to update request status silently', err));
    }

    setConfirmModal({
      isOpen: true, title: `${status.charAt(0).toUpperCase() + status.slice(1)} Request`,
      message: `Are you sure you want to ${status} this book request ? `,
      type: status === RequestStatus.REJECTED ? 'danger' : 'info', isLoading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
          await updateBookRequestStatus(id, status);
          toast.success(`Request ${status} `);
          fetchUserRequests();
          setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err) {
          toast.error('Failed to update request status');
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  };

  const handleApproveOrderReturn = async (orderId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Approve Return Request',
      message: 'Are you sure you want to approve this return request?',
      type: 'info',
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
          await updateOrderStatus(orderId, 'return_accepted');
          toast.success('Return request approved');
          fetchOrderReturns();
          setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err: any) {
          toast.error(err || 'Failed to approve return');
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  };

  const handleDeclineOrderReturn = async (orderId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Decline Return Request',
      message: 'Are you sure you want to decline this return request?',
      type: 'danger',
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
          await updateOrderStatus(orderId, 'return_rejected');
          toast.success('Return request declined');
          fetchOrderReturns();
          setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err: any) {
          toast.error(err || 'Failed to decline return');
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  };

  if (isInitialLoading) {
    return <Loader />;
  }

  return (
    <div className={hideHeader ? "admin-nested-layout" : "admin-layout"}>
      <main className={hideHeader ? "admin-nested-content" : "admin-main-content"}>
        <header className="admin-header">
          {(activeTab === 'books' || activeTab === 'categories') && currentUser?.role === 'super_admin' && (
            <div className="admin-super-banner" style={{ margin: '0 0 1rem 0', borderRadius: '16px' }}>
              <div className="banner-icon-box">
                <BookOpen size={20} />
              </div>
              {activeTab === 'books' ? (
                <span><strong>Super Admin View:</strong> You are viewing the global book collection.</span>
              ) : (
                <span><strong>Super Admin View:</strong> You are viewing the global category collection.</span>
              )}
            </div>
          )}
          <div className="admin-header-flex" style={
            (hideHeader && (activeTab === 'books' || activeTab === 'categories') && currentUser?.role === RoleName.SUPER_ADMIN)
              ? { display: 'none' }
              : {}
          }>
            {!hideHeader && (
              <div className="admin-header-titles">
                <h1 className="admin-header-title">
                  {activeTab === 'stats' && 'Dashboard Overview'}
                  {activeTab === 'books' && 'Manage Books'}
                  {activeTab === 'categories' && 'Manage Categories'}
                  {activeTab === 'requests' && 'Exchange Requests'}
                  {activeTab === 'user-requests' && 'Book Requests'}
                  {activeTab === 'read-history' && 'Read History'}
                  {activeTab === 'support' && 'Customer Support'}
                  {activeTab === 'logs' && 'Admin Activity Logs'}
                </h1>
                <p className="admin-header-subtitle">
                  Welcome back, {currentUser?.role === RoleName.SUPER_ADMIN ? 'Super Administrator' : 'Administrator'}
                </p>
              </div>
            )}
            <div className={`admin - header - actions ${hideHeader ? 'actions-standalone' : ''} `}>
              {activeTab === 'books' && currentUser?.role !== RoleName.SUPER_ADMIN && (
                <button
                  onClick={() => setShowAddBookForm(!showAddBookForm)}
                  className={`admin - refresh - stats - btn ${showAddBookForm ? 'admin-btn-negative' : 'admin-btn-positive'} `}
                >
                  {showAddBookForm ? (
                    <>
                      <Minus size={18} />
                      <span>Hide Form</span>
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      <span>{editingBookId ? 'Edit Book' : 'Add New Book'}</span>
                    </>
                  )}
                </button>
              )}
              {activeTab === 'categories' && currentUser?.role !== RoleName.SUPER_ADMIN && (
                <button
                  onClick={() => setShowCategoryForm(!showCategoryForm)}
                  className={`admin - refresh - stats - btn ${showCategoryForm ? 'admin-btn-negative' : 'admin-btn-positive'} `}
                >
                  {showCategoryForm ? (
                    <>
                      <Minus size={18} />
                      <span>Hide Form</span>
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      <span>Add Category</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </header>

        {activeTab === 'stats' && (
          <div className="admin-stats-container">
            <div className="admin-stats-header">
              <h3 className="admin-table-title">Performance Insights</h3>
              <button
                onClick={() => fetchStats()}
                className="admin-refresh-stats-btn"
                disabled={isStatsLoading}
              >
                {isStatsLoading ? (
                  <span className="button-loader-flex">
                    <div className="spinner-mini"></div>
                    Refreshing...
                  </span>
                ) : (
                  <span className="button-loader-flex">
                    <RefreshCw size={18} />
                    Refresh Stats
                  </span>
                )}
              </button>
            </div>
            <div className="admin-stats-grid-container">
              {/* Row 1: Core Metrics */}

              <div className="card stats-card-content">
                <div className="stats-icon-box">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                    <path d="M8 7h6" />
                    <path d="M8 11h8" />
                    <path d="M8 15h6" />
                  </svg>
                </div>
                <span className="stats-label">Total Books</span>
                <span className="stats-value">{stats.totalBooks.toLocaleString()}</span>
              </div>
              <div className="card stats-card-content">
                <div className="stats-icon-box">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </div>
                <span className="stats-label">Total Categories</span>
                <span className="stats-value">{stats.totalCategories.toLocaleString()}</span>
              </div>
              <div className="card stats-card-content">
                <div className="stats-icon-box"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg></div>
                <span className="stats-label">Total Reads</span>
                <span className="stats-value stats-value-accent">{stats.totalReads}</span>
              </div>
              <div className="card stats-card-content">
                <div className="stats-icon-box"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>
                <span className="stats-label">Active Reads</span>
                <span className="stats-value stats-value-success">{stats.activeReads}</span>
              </div>

              {/* Row 2: Order Metrics */}
              <div className="card stats-card-content">
                <div className="stats-icon-box"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg></div>
                <span className="stats-label">Total Orders</span>
                <span className="stats-value">{stats.totalOrders}</span>
              </div>
              <div className="card stats-card-content">
                <div className="stats-icon-box"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>
                <span className="stats-label">Pending Orders</span>
                <span className="stats-value stats-value-warning">{stats.pendingOrders}</span>
              </div>
              <div className="card stats-card-content">
                <div className="stats-icon-box"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div>
                <span className="stats-label">Completed Orders</span>
                <span className="stats-value stats-value-success">{stats.completedOrders}</span>
              </div>

              {/* Row 3: Insights */}
              <div className="card stats-card-content">
                <div className="stats-icon-box"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></div>
                <span className="stats-label">Pending Suggestions</span>
                <span className="stats-value stats-value-warning">{stats.pendingSuggestions}</span>
              </div>
              <div className="card stats-card-content">
                <div className="stats-icon-box"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg></div>
                <span className="stats-label">Most Read Book</span>
                <div className="user-main-name" style={{ marginTop: '0.5rem' }}>{stats.mostReadBook}</div>
              </div>
              <div className="card stats-card-content">
                <div className="stats-icon-box"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.509 4.048 3 5.5L12 21l7-7Z"></path></svg></div>
                <span className="stats-label">Most Wishlisted</span>
                <div className="user-main-name" style={{ marginTop: '0.5rem' }}>{stats.mostWishlistedBook}</div>
              </div>
              <div className="card stats-card-content">
                <div className="stats-icon-box"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg></div>
                <span className="stats-label">Top Buyer</span>
                <div className="user-main-name" style={{ marginTop: '0.5rem' }}>{stats.topBuyer}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'books' && (
          <div className="admin-section-container saas-reveal">

            {showAddBookForm && (
              <section className="card admin-form-section saas-reveal">
                <div className="admin-form-header">
                  <h3 className="admin-table-title">{editingBookId ? 'Edit Book Record' : 'Add New Book'}</h3>

                </div>
                <form onSubmit={handleCreateBook} className="admin-book-form-grid">
                  <div className="form-group"><label>Title</label><input type="text" value={newBook.title} onChange={(e) => setNewBook({ ...newBook, title: e.target.value })} placeholder="Enter book title" required /></div>
                  <div className="form-group"><label>Author</label><input type="text" value={newBook.author} onChange={(e) => setNewBook({ ...newBook, author: e.target.value })} placeholder="Author name" required /></div>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={newBook.category_id} onChange={(e) => setNewBook({ ...newBook, category_id: e.target.value })} required>
                      <option value="">Select Category</option>
                      {categories.map((c) => (<option key={c._id} value={c._id}>{c.name}</option>))}
                    </select>
                  </div>
                  <div className="form-group"><label>ISBN</label><input type="text" value={newBook.isbn} onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })} placeholder="Unique ISBN number" required /></div>
                  <div className="form-group"><label>Genre</label><input type="text" value={newBook.genre} onChange={(e) => setNewBook({ ...newBook, genre: e.target.value })} placeholder="e.g. Fiction" /></div>
                  <div className="form-group"><label>Language</label><input type="text" value={newBook.language} onChange={(e) => setNewBook({ ...newBook, language: e.target.value })} placeholder="e.g. English" /></div>
                  <div className="form-group"><label>Price (₹)</label><input type="number" value={newBook.price} onChange={(e) => setNewBook({ ...newBook, price: e.target.value })} placeholder="0.00" /></div>
                  <div className="form-group"><label>Pages</label><input type="number" value={newBook.pages} onChange={(e) => setNewBook({ ...newBook, pages: e.target.value })} placeholder="Number of pages" /></div>
                  <div className="form-group"><label>Published Year</label><input type="number" value={newBook.publishedYear} onChange={(e) => setNewBook({ ...newBook, publishedYear: e.target.value })} placeholder="YYYY" /></div>
                  <div className="form-group"><label>Copies</label><input type="number" value={newBook.noOfCopies} onChange={(e) => setNewBook({ ...newBook, noOfCopies: e.target.value })} placeholder="Quantity" required /></div>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={newBook.status} onChange={(e) => setNewBook({ ...newBook, status: e.target.value as any })} required>
                      <option value={BookStatus.AVAILABLE}>Available</option>
                      <option value={BookStatus.OUT_OF_STOCK}>Out of Stock</option>
                      <option value={BookStatus.DAMAGED}>Damaged</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Rating (0-5)</label><input type="number" step="0.1" min="0" max="5" value={(newBook as any).rating} onChange={(e) => setNewBook({ ...newBook, rating: e.target.value } as any)} /></div>

                  <div className="form-group file-group">
                    <label>Cover Image</label>
                    <div className="file-input-wrapper">
                      <input type="file" accept="image/*" onChange={(e) => setCoverImageFile(e.target.files?.[0] || null)} />
                    </div>
                  </div>
                  <div className="form-group file-group">
                    <label>Author's Photo</label>
                    <div className="file-input-wrapper">
                      <input type="file" accept="image/*" onChange={(e) => setAuthorImageFile(e.target.files?.[0] || null)} />
                    </div>
                  </div>
                  <div className="form-group file-group">
                    <label>Book PDF</label>
                    <div className="file-input-wrapper">
                      <input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
                    </div>
                  </div>

                  {/* AI Generation Button */}
                  <div className="form-group full-width ai-generate-section">
                    <button
                      type="button"
                      onClick={handleGenerateWithAI}
                      disabled={isGeneratingAI || !newBook.title || !newBook.author}
                      className="admin-btn-generate ai-generate-btn"
                    >
                      {isGeneratingAI ? (
                        <>
                          <div className="spinner-mini"></div>
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                          </svg>
                          <span>Generate with AI</span>
                        </>
                      )}
                    </button>
                    <p className="ai-helper-text">
                      ✨ Let AI generate book description and author biography based on title and author name
                    </p>
                  </div>

                  <div className="form-group full-width"><label>Book Description</label><textarea value={newBook.description} onChange={(e) => setNewBook({ ...newBook, description: e.target.value })} rows={3} placeholder="Write a short summary of the book..." /></div>
                  <div className="form-group full-width"><label>About the Author</label><textarea value={newBook.author_description} onChange={(e) => setNewBook({ ...newBook, author_description: e.target.value })} rows={3} placeholder="Brief biography of the author..." /></div>

                  <div className="form-group full-width checkbox-row">
                    <label className="saas-checkbox">
                      <input type="checkbox" checked={newBook.isPremium} onChange={(e) => setNewBook({ ...newBook, isPremium: e.target.checked })} />
                      <span className="checkmark"></span>
                      Mark as Premium Book
                    </label>
                  </div>

                  {currentUser?.role === 'super_admin' && (
                    <div className="form-group full-width">
                      <label>Added By (On behalf of Admin)</label>
                      <select
                        value={(newBook as any).addedBy || ''}
                        onChange={(e) => setNewBook({ ...newBook, addedBy: e.target.value } as any)}
                        className="admin-filter-select"
                      >
                        <option value="">Myself (Super Admin)</option>
                        {admins.map(admin => (
                          <option key={admin._id} value={admin._id}>{admin.name} ({admin.email})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-actions-row">
                    <button type="submit" className="admin-btn-execute">
                      {editingBookId ? 'Update Book Record' : 'Save Book to Collection'}
                    </button>
                    {editingBookId && (
                      <button type="button" onClick={handleCancelEdit} className="admin-btn-secondary">
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </section>
            )}

            <section className="inventory-section card" ref={inventoryRef}>
              <div className="toolbar-header">
                <div className="toolbar-title-box">
                  <h3 className="admin-table-title">Inventory Management</h3>
                  <div className="toolbar-title-actions">
                    <button onClick={handleExportBooks} className="admin-export-csv-btn">
                      <Download size={16} />
                      <span>Export CSV</span>
                    </button>
                    <span className="total-count-badge">{stats.totalBooks} Total Books</span>
                  </div>
                </div>

                <div className="admin-two-line-toolbar">
                  {/* Row 1: Search */}
                  <div className="toolbar-row">
                    <div className="toolbar-search-box">
                      <Search size={18} className="search-icon" />
                      <input
                        type="text"
                        placeholder="Search by title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          className="admin-search-clear-btn"
                          onClick={() => setSearchTerm('')}
                          aria-label="Clear book search"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Filters */}
                  <div className="toolbar-row toolbar-filters-row">
                    <div className="filter-item-box">
                      <Layers size={16} />
                      <select value={bookTypeFilter} onChange={(e) => setBookTypeFilter(e.target.value)} className="admin-filter-select">
                        <option value="all">All Books</option>
                        <option value="premium">Premium Only</option>
                        <option value="normal">Free Books</option>
                      </select>
                    </div>
                    <div className="filter-item-box">
                      <Filter size={16} />
                      <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="admin-filter-select">
                        <option value="all">All Categories</option>
                        {categories.map(c => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="filter-item-box">
                      <CircleSlash size={16} />
                      <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="admin-filter-select">
                        <option value="all">Stock Status</option>
                        <option value="inStock">In Stock</option>
                        <option value="outOfStock">Out of Stock</option>
                        <option value="lowStock">Low Stock (≤ 2)</option>
                      </select>
                    </div>
                    {(searchTerm || bookTypeFilter !== 'all' || categoryFilter !== 'all' || stockFilter !== 'all') && (
                      <button
                        onClick={handleClearFilters}
                        className="admin-btn-secondary clear-filters-btn"
                        title="Clear all filters"
                      >
                        <XCircle size={18} />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="admin-table-outer">
                {isDataLoading ? (
                  <div className="admin-loading-state">
                    <div className="spinner"></div>
                    <p>Fetching inventory...</p>
                  </div>
                ) : (
                  <div className="admin-table-scroll">
                    <table className="admin-premium-table">
                      <thead>
                        <tr>
                          <th>Book Details</th>
                          <th>Category</th>
                          <th>Added By</th>
                          <th>Rating</th>
                          <th>Stock</th>
                          <th>Status</th>
                          {currentUser?.role !== RoleName.SUPER_ADMIN && <th className="actions-header">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {allBooks.map((book) => (
                          <tr key={book._id} className="admin-table-row">
                            <td className="book-cell">
                              <div className="book-meta-info">
                                <span className="book-title-primary">{book.title}</span>
                                <span className="book-author-secondary">by {book.author}</span>
                                {book.isPremium && (
                                  <div className="premium-tag-mini">
                                    <span>PREMIUM</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="category-info-only">
                                <span className="category-text">
                                  {typeof book.category_id === 'string' ? book.category_id : book.category_id?.name}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div className="added-by-info">
                                <span className="admin-name">{(book.addedBy as any)?.name || 'N/A'}</span>
                              </div>
                            </td>
                            <td>
                              <div className="rating-pill-box">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                                <span>{book.rating || 0}</span>
                              </div>
                            </td>
                            <td>
                              <div className="stock-info">
                                <span className={`stock - count ${book.noOfCopies <= 2 ? 'low-stock' : ''} `}>
                                  {book.noOfCopies}
                                </span>
                                <span className="stock-label">Copies</span>
                              </div>
                            </td>
                            <td>
                              <span className={`saas - status - badge status - ${book.status.toLowerCase().replace(' ', '-')} `}>
                                {book.status === BookStatus.OUT_OF_STOCK ? 'OUT OF STOCK' : book.status}
                              </span>
                            </td>
                            {currentUser?.role !== RoleName.SUPER_ADMIN && (
                              <td className="actions-cell">
                                <div className="actions-button-group">
                                  <button onClick={() => handleEditBook(book)} className="btn-action-icon btn-edit-icon" title="Edit Book">
                                    Edit
                                  </button>
                                  <button onClick={() => handleDeleteBook(book._id)} className="btn-action-icon btn-delete-icon" title="Delete Book">
                                    Delete
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {!isDataLoading && allBooks.length === 0 && (
                  <div className="admin-nothing-found">
                    <Search size={40} />
                    <p>No books found matching your criteria.</p>
                  </div>
                )}
              </div>

              {
                bookTotalPages > 1 && (
                  <div className="admin-pagination">
                    <button
                      disabled={bookPage === 1}
                      onClick={() => setBookPage(prev => prev - 1)}
                      className="pagination-btn"
                    >
                      Previous
                    </button>
                    <div className="pagination-info">
                      <div className="pagination-info-pages">
                        Page <span>{bookPage}</span> of <span>{bookTotalPages}</span>
                      </div>
                    </div>
                    <button
                      disabled={bookPage === bookTotalPages}
                      onClick={() => setBookPage(prev => prev + 1)}
                      className="pagination-btn"
                    >
                      Next
                    </button>
                  </div>
                )
              }
            </section >
          </div >
        )
        }

        {
          activeTab === 'categories' && (
            <div className={`admin - categories - split - layout ${showCategoryForm ? 'form-open' : ''} ${currentUser?.role === RoleName.SUPER_ADMIN ? 'super-admin-categories' : ''} saas - reveal`}>
              {showCategoryForm && (
                <aside className="category-sidebar-panel saas-reveal-left">
                  <div className="card admin-form-section sticky-form">
                    <div className="admin-form-header">
                      <div className="form-header-title">
                        <h3 className="admin-table-title">{editingCategoryId ? 'Edit Record' : 'Create New'}</h3>
                        <p className="form-subtitle">Category Architecture</p>
                      </div>
                      <button onClick={() => { handleCancelCategoryEdit(); setShowCategoryForm(false); }} className="admin-btn-close-mini">
                        <Minus size={16} />
                      </button>
                    </div>
                    <form onSubmit={handleCreateCategory} className="admin-category-form-premium">
                      <div className="form-group-premium">
                        <label><div className="label-icon"><Tag size={14} /></div> Category Name</label>
                        <input
                          type="text"
                          value={newCategory.name}
                          onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                          placeholder="e.g. History & Politics"
                          className="premium-input"
                          required
                        />
                      </div>
                      <div className="form-group-premium">
                        <label><div className="label-icon"><FileText size={14} /></div> Description</label>
                        <textarea
                          className="premium-textarea"
                          value={newCategory.description}
                          onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                          rows={6}
                          placeholder="Provide details about this library category..."
                        />
                      </div>
                      <div className="category-form-actions-premium">
                        <button type="submit" className="admin-btn-generate full-width">
                          {editingCategoryId ? 'Update Category' : 'Save Category'}
                        </button>
                        {editingCategoryId && (
                          <button type="button" onClick={handleCancelCategoryEdit} className="admin-btn-dim full-width">
                            Cancel Modification
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </aside>
              )}

              <div className="category-main-view">
                <div className="admin-section-header">
                  <div className="admin-search-wrapper premium-search-box">
                    <div className="search-icon-inside">
                      <Search size={20} />
                    </div>
                    <input
                      type="text"
                      placeholder="Search by category name..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="admin-search-input-premium"
                    />
                    {categorySearch && (
                      <button
                        className="admin-search-clear-btn"
                        onClick={() => setCategorySearch('')}
                        aria-label="Clear category search"
                        style={{
                          position: 'absolute',
                          right: '18px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </div>

                <section className="admin-categories-list-section">
                  <div className="admin-categories-grid-premium">
                    {categories
                      .filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
                      .map((c) => (
                        <div key={c._id} className={`category - orb - card ${editingCategoryId === c._id ? 'is-editing' : ''} `}>
                          <div className="orb-card-glow"></div>
                          <div className="orb-card-content">
                            <div className="orb-header">
                              <div className="orb-icon-container">
                                <Layers size={22} />
                              </div>
                              <div className="orb-stats">
                                <span className="count-num">{(c as any).bookCount || 0}</span>
                                <span className="count-label">Items</span>
                              </div>
                            </div>

                            <div className="orb-body">
                              <h4 className="orb-title">{c.name}</h4>
                              <p className="orb-description">{c.description || 'No description provided.'}</p>
                            </div>

                            {currentUser?.role !== RoleName.SUPER_ADMIN && (
                              <div className="orb-footer">
                                <button onClick={() => {
                                  handleEditCategory(c);
                                  setShowCategoryForm(true);
                                }} className="orb-action-btn edit-orb">
                                  Modify
                                </button>
                                {currentUser?.role === RoleName.ADMIN && (
                                  <button onClick={() => handleDeleteCategory(c)} className="orb-action-btn delete-orb">
                                    Remove
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>

                  {!isDataLoading && categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                    <div className="admin-nothing-found">
                      <Search size={40} />
                      <p>No categories match "{categorySearch}"</p>
                    </div>
                  )}
                </section>
              </div>
            </div>
          )
        }

        {
          activeTab === 'requests' && (
            <section className="card admin-table-section saas-reveal">
              <div className="admin-table-header-box">
                <h3 className="admin-table-title">Exchange Requests</h3>
                <div className="admin-actions-column">
                  <div className="admin-search-row">
                    <div className="admin-search-box">
                      <Search size={18} className="search-icon" />
                      <input
                        type="text"
                        placeholder="Search Order ID, User..."
                        value={exchangeSearch}
                        onChange={(e) => setExchangeSearch(e.target.value)}
                      />
                      {exchangeSearch && (
                        <button
                          className="search-clear-btn"
                          onClick={() => setExchangeSearch('')}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="admin-filters-row">
                    <div className="admin-filter-box">
                      <Filter size={18} className="filter-icon" />
                      <select
                        value={exchangeStatusFilter}
                        onChange={(e) => setExchangeStatusFilter(e.target.value)}
                      >
                        <option value="all_exchanges">Show All</option>
                        <option value="return_requested">Pending approval</option>
                        <option value="return_accepted">Accepted</option>
                        <option value="returned">Exchanged</option>
                        <option value="return_rejected">Rejected</option>
                        <option value="refund_initiated">Refund Initiated</option>
                      </select>
                    </div>
                    <div className="admin-filter-box">
                      <BookOpen size={18} className="filter-icon" />
                      <select
                        value={exchangeReasonFilter}
                        onChange={(e) => setExchangeReasonFilter(e.target.value)}
                      >
                        <option value="all">All Reasons</option>
                        <option value="Damaged Book">Damaged Book</option>
                        <option value="Pages Missing">Pages Missing</option>
                        <option value="Print Error">Print Error</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div className="admin-filter-box">
                      <TrendingUp size={18} className="filter-icon" />
                      <select
                        value={exchangeSort}
                        onChange={(e) => setExchangeSort(e.target.value)}
                      >
                        <option value="desc">Newest First</option>
                        <option value="asc">Oldest First</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="admin-table-wrapper">
                {isDataLoading ? (
                  <div className="admin-loading-container">
                    <div className="spinner"></div>
                    <p>Fetching Exchange Requests...</p>
                  </div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Order ID</th>
                        <th>Items</th>
                        <th>Total</th>
                        <th>Exchange Reason</th>
                        <th>Proof</th>
                        {exchangeStatusFilter === 'return_requested' && (
                          <th className="admin-actions-cell">Action</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {orderReturns.map(order => (
                        <tr key={order._id}>
                          <td>
                            <div className="user-info-box">
                              <span className="user-main-name">{order.user_id?.name || 'Unknown'}</span>
                              <span className="user-sub-email">{order.user_id?.email}</span>
                            </div>
                          </td>
                          <td><span className="book-main-title">#{order._id.slice(-8).toUpperCase()}</span></td>
                          <td><span className="book-sub-meta">{order.items?.length || 0} items</span></td>
                          <td><span className="admin-fine-amount">₹{order.totalAmount?.toFixed(2)}</span></td>
                          <td>
                            <div className="book-info-box">
                              <span className="book-sub-meta">{order.returnReason || 'No reason provided'}</span>
                            </div>
                          </td>
                          <td>
                            {order.exchangeImageUrl ? (
                              <div
                                className="admin-proof-thumb"
                                onClick={() => setPreviewImage(order.exchangeImageUrl)}
                              >
                                <img src={order.exchangeImageUrl} alt="Proof" />
                                <div className="thumb-overlay">
                                  <Eye size={12} />
                                </div>
                              </div>
                            ) : (
                              <span className="no-proof-text">No Proof</span>
                            )}
                          </td>
                          {exchangeStatusFilter === 'return_requested' && (
                            <td className="admin-actions-cell">
                              <div className="admin-actions-flex">
                                <button onClick={() => handleApproveOrderReturn(order._id)} className="admin-btn-edit">Approve</button>
                                <button onClick={() => handleDeclineOrderReturn(order._id)} className="admin-btn-delete">Reject</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Added pagination for exchanges */}
              {!isDataLoading && exchangeTotalPages > 1 && (
                <div className="admin-pagination">
                  <button
                    className="pagination-btn"
                    onClick={() => setExchangePage(prev => Math.max(1, prev - 1))}
                    disabled={exchangePage === 1}
                  >
                    Previous
                  </button>
                  <div className="pagination-info">
                    <div className="pagination-info-pages">
                      Page <span>{exchangePage}</span> of <span>{exchangeTotalPages}</span>
                    </div>
                    <div className="total-count-mini">Total {exchangeTotalOrders} requests</div>
                  </div>
                  <button
                    className="pagination-btn"
                    onClick={() => setExchangePage(prev => Math.min(exchangeTotalPages, prev + 1))}
                    disabled={exchangePage === exchangeTotalPages}
                  >
                    Next
                  </button>
                </div>
              )}

              {!isDataLoading && orderReturns.length === 0 && (
                <div className="admin-empty-state">
                  {exchangeStatusFilter === 'return_requested'
                    ? 'No pending exchange requests.'
                    : exchangeStatusFilter === 'return_accepted'
                      ? 'No accepted requests awaiting item return.'
                      : exchangeStatusFilter === 'returned'
                        ? 'No processed exchanges found.'
                        : exchangeStatusFilter === 'refund_initiated'
                          ? 'No active refunds found.'
                          : 'No rejected exchange requests found.'}
                </div>
              )}
            </section>
          )
        }


        {
          activeTab === 'user-requests' && (
            <section className="card admin-table-section">
              <div className="admin-table-header-box">
                <h3 className="admin-table-title">Book Requests</h3>
                <div className="admin-filter-group">
                  <div className="admin-filter-pill">
                    <Search size={16} className="text-gray-400" />
                    <input
                      type="text"
                      className="admin-filter-field"
                      placeholder="Search requests..."
                      value={suggestionSearch}
                      onChange={(e) => setSuggestionSearch(e.target.value)}
                    />
                  </div>
                  <div className="admin-filter-pill">
                    <Filter size={16} className="text-gray-400" />
                    <select
                      value={suggestionStatusFilter}
                      onChange={(e) => setSuggestionStatusFilter(e.target.value)}
                      className="admin-filter-field"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="admin-filter-pill">
                    <TrendingUp size={16} className="text-gray-400" />
                    <select
                      value={suggestionSort}
                      onChange={(e) => setSuggestionSort(e.target.value)}
                      className="admin-filter-field"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="admin-table-wrapper">
                {isDataLoading ? (
                  <div className="admin-loading-container">
                    <div className="spinner"></div>
                    <p>Loading Suggestions...</p>
                  </div>
                ) : (
                  <table className="admin-table">
                    <thead><tr><th>User</th><th>Book Details</th><th>Reason</th><th>Status</th><th className="admin-actions-cell">Action</th></tr></thead>
                    <tbody>
                      {userRequests
                        .filter(req => {
                          const matchesSearch = req.title.toLowerCase().includes(suggestionSearch.toLowerCase()) ||
                            req.author.toLowerCase().includes(suggestionSearch.toLowerCase()) ||
                            (req.user_id?.name || '').toLowerCase().includes(suggestionSearch.toLowerCase());
                          const matchesStatus = suggestionStatusFilter === 'all' || req.status === suggestionStatusFilter;
                          return matchesSearch && matchesStatus;
                        })
                        .map(req => (
                          <tr key={req._id}>
                            <td>
                              <div className="user-info-box">
                                <span className="user-main-name">{req.user_id?.name || 'Unknown'}</span>
                                <span className="user-sub-email">{req.user_id?.email}</span>
                                <span className={`membership-pill ${((req.user_id as any)?.membership_id?.name || '').toLowerCase().includes(MembershipName.PREMIUM.toLowerCase()) ? 'membership-premium' : ''}`}>
                                  {(req.user_id as any)?.membership_id?.name || MembershipName.BASIC.charAt(0).toUpperCase() + MembershipName.BASIC.slice(1)}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div className="book-info-box">
                                <span className="book-main-title">
                                  {req.title}
                                </span>
                                <span className="book-sub-meta">
                                  by {req.author}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div className="book-info-box">
                                <span className="book-sub-meta" style={{ maxWidth: '200px', display: 'block' }}>
                                  {req.reason || 'No reason provided'}
                                </span>
                              </div>
                            </td>
                            <td><span className={`status-badge status-${req.status}`}>{req.status}</span></td>
                            <td className="admin-actions-cell" style={{ paddingLeft: '4rem' }}>
                              <div className="admin-actions-flex">
                                {req.status === RequestStatus.PENDING ? (
                                  <>
                                    <button
                                      onClick={() => {
                                        setNewBook({
                                          ...newBook,
                                          title: req.title,
                                          author: req.author,
                                        });
                                        setSelectedRequestId(req._id);
                                        setShowAddBookForm(true);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                      }}
                                      className="admin-btn-edit"
                                      style={{ backgroundColor: '#4f46e5', color: 'white' }}
                                    >
                                      Add to Library
                                    </button>
                                    <button onClick={() => handleBookRequestStatus(req._id, RequestStatus.REJECTED)} className="admin-btn-delete">Reject</button>
                                  </>
                                ) : (
                                  <span className="admin-processed-text">
                                    {req.status === RequestStatus.APPROVED ? 'Approved' : 'Rejected'}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
              {!isDataLoading && (
                userRequests.filter(req => {
                  const matchesSearch = req.title.toLowerCase().includes(suggestionSearch.toLowerCase()) ||
                    req.author.toLowerCase().includes(suggestionSearch.toLowerCase()) ||
                    (req.user_id?.name || '').toLowerCase().includes(suggestionSearch.toLowerCase());
                  const matchesStatus = suggestionStatusFilter === 'all' || req.status === suggestionStatusFilter;
                  return matchesSearch && matchesStatus;
                }).length === 0
              ) && (
                  <div className="admin-empty-state">
                    {suggestionSearch ? (
                      <>No requests match "<span>{suggestionSearch}</span>"</>
                    ) : suggestionStatusFilter !== 'all' ? (
                      <>No <span>{suggestionStatusFilter}</span> book requests found.</>
                    ) : (
                      "No book requests found in the record."
                    )}
                  </div>
                )}
            </section>
          )
        }


        {
          activeTab === 'read-history' && (
            <section className="card admin-table-section" ref={readHistoryRef}>
              <div className="admin-table-header-box">
                <h3 className="admin-table-title">Read History</h3>
                <div className="admin-filter-group">
                  <div className="admin-filter-item">
                    <span className="admin-filter-label">Tier</span>
                    <select value={membershipFilter} onChange={(e) => setMembershipFilter(e.target.value)} className="admin-filter-select">
                      <option value="all">All Tiers</option>
                      <option value={MembershipName.BASIC.toLowerCase()}>{MembershipName.BASIC.charAt(0).toUpperCase() + MembershipName.BASIC.slice(1)}</option>
                      <option value={MembershipName.PREMIUM.toLowerCase()}>{MembershipName.PREMIUM.charAt(0).toUpperCase() + MembershipName.PREMIUM.slice(1)}</option>
                    </select>
                  </div>
                  <div className="admin-filter-item">
                    <span className="admin-filter-label">Status</span>
                    <select value={readHistoryStatusFilter} onChange={(e) => setReadHistoryStatusFilter(e.target.value)} className="admin-filter-select">
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="expired">Expired</option>
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
                    <thead><tr><th>Reader</th><th>Book</th><th>Dates</th><th>Status</th></tr></thead>
                    <tbody>{readHistory.map((r: any) => {
                      const membershipName = (r.user_id as any)?.membership_id?.name || MembershipName.BASIC.charAt(0).toUpperCase() + MembershipName.BASIC.slice(1);
                      const isPremiumUser = membershipName.toLowerCase().includes(MembershipName.PREMIUM.toLowerCase());

                      return (
                        <tr key={r._id}>
                          <td>
                            <div className="user-info-box">
                              <span className="user-main-name">{r.user_id?.name}</span>
                              <span className={`membership-pill ${isPremiumUser ? 'membership-premium' : ''}`}>
                                {membershipName}
                              </span>
                            </div>
                          </td>
                          <td><div className="book-info-box"><span className="book-main-title">{r.book_id?.title}</span></div></td>
                          <td><div className="book-info-box"><div>Started: {r.addedAt ? new Date(r.addedAt).toLocaleDateString() : 'N/A'}</div><div>Due: {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : 'N/A'}</div></div></td>
                          <td><span className={`status-badge status-${r.status}`}>{r.status}</span></td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                )}
              </div>
              {!isDataLoading && readHistory.length === 0 && (
                <div className="admin-empty-state">No read history records found.</div>
              )}
              {readHistoryTotalPages > 1 && (
                <div className="admin-pagination">
                  <button
                    disabled={readHistoryPage === 1}
                    onClick={() => setReadHistoryPage((prev: number) => prev - 1)}
                    className="pagination-btn"
                  >
                    Previous
                  </button>
                  <div className="pagination-info">
                    <div className="pagination-info-pages">
                      Page <span>{readHistoryPage}</span> of <span>{readHistoryTotalPages}</span>
                    </div>
                  </div>
                  <button
                    disabled={readHistoryPage === readHistoryTotalPages}
                    onClick={() => setReadHistoryPage((prev: number) => prev + 1)}
                    className="pagination-btn"
                  >
                    Next
                  </button>
                </div>
              )}
            </section>
          )
        }

        {
          activeTab === 'logs' && (
            <section className="card admin-table-section">
              <div className="admin-table-header-box">
                <h3 className="admin-table-title">Admin Activity Logs</h3>
                <div className="admin-actions-column">
                  <div className="admin-search-row">
                    <div className="admin-search-box">
                      <Search size={18} className="search-icon" />
                      <input
                        type="text"
                        placeholder="Search name or email..."
                        value={logSearchTerm}
                        onChange={(e) => setLogSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="admin-filters-row">
                    <div className="admin-filter-box">
                      <Filter size={18} className="filter-icon" />
                      <select
                        value={logActionFilter}
                        onChange={(e) => setLogActionFilter(e.target.value)}
                      >
                        <option value="all">All Actions</option>
                        <option value="BOOK_CREATED">Book Created</option>
                        <option value="BOOK_UPDATED">Book Updated</option>
                        <option value="BOOK_DELETED">Book Deleted</option>
                        <option value="CATEGORY_CREATED">Category Created</option>
                        <option value="CATEGORY_UPDATED">Category Updated</option>
                        <option value="CATEGORY_DELETED">Category Deleted</option>
                        <option value="ORDER_STATUS_UPDATED">Order Updates</option>
                        <option value="BOOK_REQUEST_STATUS_UPDATED">Book Requests</option>
                        <option value="EXCHANGE_REQUEST_UPDATED">Exchange Request</option>
                      </select>
                    </div>
                    <div className="admin-filter-box">
                      <TrendingUp size={18} className="filter-icon" />
                      <select
                        value={logSortOrder}
                        onChange={(e) => setLogSortOrder(e.target.value)}
                      >
                        <option value="desc">Newest First</option>
                        <option value="asc">Oldest First</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="admin-table-wrapper">
                {isDataLoading ? (
                  <div className="admin-loading-container">
                    <div className="spinner"></div>
                    <p>Loading User Logs...</p>
                  </div>
                ) : (
                  <table className="admin-table">
                    <thead><tr><th>User</th><th>Action</th><th>Timestamp</th></tr></thead>
                    <tbody>{logs.map(log => (
                      <tr key={log._id}>
                        <td>
                          <div className="user-info-box">
                            <span className="user-main-name">{log.user_id?.name || 'Unknown Admin'}</span>
                            <span className="user-sub-email">{log.user_id?.email || 'System Action'}</span>
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
              {!isDataLoading && logsTotalPages > 1 && (
                <div className="admin-pagination">
                  <button
                    className="pagination-btn"
                    onClick={() => setLogsPage(prev => Math.max(1, prev - 1))}
                    disabled={logsPage === 1}
                  >
                    Previous
                  </button>
                  <div className="pagination-info">
                    <div className="pagination-info-pages">
                      Page <span>{logsPage}</span> of <span>{logsTotalPages}</span>
                    </div>
                    <div className="total-count-mini">Total {logsTotalCount} logs</div>
                  </div>
                  <button
                    className="pagination-btn"
                    onClick={() => setLogsPage(prev => Math.min(logsTotalPages, prev + 1))}
                    disabled={logsPage === logsTotalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </section>
          )
        }
        {
          activeTab === 'support' && (
            <AdminSupportManager />
          )
        }
      </main >

      <ConfirmationModal
        isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message}
        type={confirmModal.type} isLoading={confirmModal.isLoading} onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Exchange Proof Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            className="image-preview-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              className="image-preview-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <button className="close-preview" onClick={() => setPreviewImage(null)}>
                <XCircle size={24} />
              </button>
              <img src={previewImage} alt="Exchange Proof Large" />
              <div className="preview-caption">Exchange Evidence Proof</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
};

export default AdminDashboard;
