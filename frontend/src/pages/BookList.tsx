/* eslint-disable react-hooks/immutability */
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, ChevronDown, SlidersHorizontal, Search as SearchIcon, RotateCcw, Clock, ArrowUpNarrowWide, ArrowDownWideNarrow, Star, Type } from 'lucide-react';
import { getBooks, getRecommendedBooks } from '../services/bookService';
import { getCategories } from '../services/categoryService';
import { getMyMembership, type Membership } from '../services/membershipService';

import type { Book } from '../types';
import { BookStatus } from '../types/enums';
import { useBorrowCart } from '../context/BorrowCartContext';
import { toast } from 'react-toastify';

import '../styles/BookList.css';

const BookList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const categoryParam = searchParams.get('category') || '';
  const searchSectionRef = React.useRef<HTMLHeadingElement>(null);
  const { addToCart, isInCart } = useBorrowCart();

  const ensureHttps = (url: string) => {
    if (!url) return url;
    return url.replace(/^http:\/\//i, 'https://');
  };

  const [books, setBooks] = useState<Book[]>([]);
  const [recommendations, setRecommendations] = useState<Book[]>([]);
  const [personalizedRecs, setPersonalizedRecs] = useState<Book[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all', 'premium', 'free'
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [sortOrder, setSortOrder] = useState(''); // Default empty for placeholder
  const [userMembership, setUserMembership] = useState<Membership | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Pending filter states for sidebar (not applied until "Apply" is clicked)
  const [pendingCategory, setPendingCategory] = useState(selectedCategory);
  const [pendingLanguage, setPendingLanguage] = useState(selectedLanguage);
  const [pendingFilterType, setPendingFilterType] = useState(filterType);

  const languages = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Bengali', 'Tamil', 'Arabic', 'Chinese', 'Japanese'];

  // Sync state with URL parameter
  useEffect(() => {
    setSelectedCategory(categoryParam);
  }, [categoryParam]);

  useEffect(() => {
    if (search === '') {
      loadData();
      return;
    }
    const timeoutId = setTimeout(() => {
      loadData();
    }, 500); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [search, selectedCategory, page, filterType, selectedLanguage, sortOrder]);

  // Reset page and update URL when filters change
  useEffect(() => {
    setPage(1);

    // Update URL if category changed from dropdown
    if (selectedCategory !== categoryParam) {
      if (selectedCategory) {
        setSearchParams({ category: selectedCategory });
      } else {
        setSearchParams({});
      }
    }

    // Scroll to results when filter changes
    if (searchSectionRef.current) {
      const yOffset = -100; // Offset for fixed header
      const element = searchSectionRef.current;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, [selectedCategory, filterType, selectedLanguage, sortOrder]);

  useEffect(() => {
    loadRecommendations();
    loadPersonalizedRecs();
    fetchUserMembership();
  }, []);

  const fetchUserMembership = async () => {
    try {
      const data = await getMyMembership();
      setUserMembership(data);
    } catch (err) {
      console.error('Error fetching membership:', err);
    }
  };

  const loadPersonalizedRecs = async () => {
    try {
      if (localStorage.getItem('token')) {
        const data = await getRecommendedBooks();
        setPersonalizedRecs(data);
      }
    } catch (err) {
      console.error('Failed to load personalized recommendations', err);
    }
  };

  const loadRecommendations = async () => {
    try {
      const data = await getBooks('limit=4&sort=-rating');
      setRecommendations(data.books || data);
    } catch (err) {
      console.error('Failed to load recommendations', err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      // Build query string
      let query = `search=${search}&page=${page}&limit=10&sort=${sortOrder || '-createdAt'}`;
      if (selectedCategory) query += `&category=${selectedCategory}`;
      if (filterType === 'premium') query += `&isPremium=true`;
      if (filterType === 'free') query += `&isPremium=false`;
      if (selectedLanguage) query += `&language=${selectedLanguage}`;

      const data = await getBooks(query);

      setBooks(data.books);
      setTotal(data.total);

      if (categories.length === 0) {
        const catData = await getCategories();
        setCategories(catData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const activeFiltersCount =
    (selectedCategory ? 1 : 0) +
    (filterType !== 'all' ? 1 : 0) +
    (selectedLanguage ? 1 : 0);

  const resetFilters = () => {
    setPendingCategory('');
    setPendingLanguage('');
    setPendingFilterType('all');
  };

  const applyFilters = () => {
    setSelectedCategory(pendingCategory);
    setSelectedLanguage(pendingLanguage);
    setFilterType(pendingFilterType);
    setPage(1);
    setIsFilterOpen(false);
  };

  const handleOpenFilters = () => {
    setPendingCategory(selectedCategory);
    setPendingLanguage(selectedLanguage);
    setPendingFilterType(filterType);
    setIsFilterOpen(true);
  };

  const sortOptions = [
    { label: 'Newest Arrivals', value: '-createdAt', icon: <Clock size={16} /> },
    { label: 'Price: Low to High', value: 'price', icon: <ArrowUpNarrowWide size={16} /> },
    { label: 'Price: High to Low', value: '-price', icon: <ArrowDownWideNarrow size={16} /> },
    { label: 'Top Rated', value: '-rating', icon: <Star size={16} /> },
    { label: 'Title: A-Z', value: 'title', icon: <Type size={16} /> },
  ];

  return (
    <div className="dashboard-container saas-reveal">
      {/* Search & Actions Bar */}
      <div className="catalog-action-bar">
        <div className="compact-search">
          <SearchIcon className="search-icon-inside" size={18} />
          <input
            type="text"
            placeholder="Search books..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="compact-search-input"
          />
        </div>

        <div className="action-buttons-group">
          <button
            className={`action-btn filter-trigger ${activeFiltersCount > 0 ? 'active' : ''}`}
            onClick={handleOpenFilters}
          >
            <SlidersHorizontal size={18} />
            <span>Filters</span>
            {activeFiltersCount > 0 && <span className="filter-badge">{activeFiltersCount}</span>}
          </button>

          <div className="sort-dropdown-container">
            <button
              className="action-btn sort-trigger"
              onClick={() => setIsSortOpen(!isSortOpen)}
            >
              <div className="sort-label-group">
                <span className="current-sort">
                  {sortOrder ? sortOptions.find(o => o.value === sortOrder)?.label.replace('Price: ', '').replace('Arrivals', '') : 'Sort'}
                </span>
              </div>
              <ChevronDown size={16} className={`chevron ${isSortOpen ? 'open' : ''}`} />
            </button>

            <AnimatePresence>
              {isSortOpen && (
                <>
                  <div className="dropdown-overlay" onClick={() => setIsSortOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="sort-dropdown-menu"
                  >
                    {sortOptions.map((opt) => (
                      <button
                        key={opt.value}
                        className={`sort-option ${sortOrder === opt.value ? 'selected' : ''}`}
                        onClick={() => {
                          setSortOrder(opt.value);
                          setIsSortOpen(false);
                        }}
                      >
                        {opt.icon}
                        <span>{opt.label}</span>
                        {sortOrder === opt.value && <div className="selected-dot" />}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Filter Sidebar */}
      <AnimatePresence>
        {isFilterOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="sidebar-overlay"
              onClick={() => setIsFilterOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="filter-sidebar"
            >
              <div className="sidebar-header">
                <div className="header-title-group">
                  <Filter size={20} />
                  <h3>Filters</h3>
                </div>
                <button className="close-sidebar" onClick={() => setIsFilterOpen(false)}>
                  <X size={24} />
                </button>
              </div>

              <div className="sidebar-content">
                <div className="filter-group">
                  <h4>Category</h4>
                  <div className="filter-options-grid">
                    <button
                      className={`filter-chip ${!pendingCategory ? 'active' : ''}`}
                      onClick={() => setPendingCategory('')}
                    >
                      All
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat._id}
                        className={`filter-chip ${pendingCategory === cat._id ? 'active' : ''}`}
                        onClick={() => setPendingCategory(cat._id)}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="filter-group">
                  <h4>Language</h4>
                  <div className="filter-options-grid">
                    <button
                      className={`filter-chip ${!pendingLanguage ? 'active' : ''}`}
                      onClick={() => setPendingLanguage('')}
                    >
                      All
                    </button>
                    {languages.map((lang) => (
                      <button
                        key={lang}
                        className={`filter-chip ${pendingLanguage === lang ? 'active' : ''}`}
                        onClick={() => setPendingLanguage(lang)}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="filter-group">
                  <h4>Access Level</h4>
                  <div className="access-toggle-group">
                    <button
                      className={`access-btn ${pendingFilterType === 'all' ? 'active' : ''}`}
                      onClick={() => setPendingFilterType('all')}
                    >
                      All
                    </button>
                    <button
                      className={`access-btn ${pendingFilterType === 'free' ? 'active' : ''}`}
                      onClick={() => setPendingFilterType('free')}
                    >
                      Free
                    </button>
                    <button
                      className={`access-btn ${pendingFilterType === 'premium' ? 'active' : ''}`}
                      onClick={() => setPendingFilterType('premium')}
                    >
                      Premium
                    </button>
                  </div>
                </div>
              </div>

              <div className="sidebar-footer">
                <button className="reset-btn" onClick={resetFilters}>
                  <RotateCcw size={18} />
                  <span>Reset All</span>
                </button>
                <button className="apply-btn" onClick={applyFilters}>
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Top Recommendations Section */}
      {!search && !selectedCategory && recommendations.length > 0 && (
        <section className="recommendations-section">
          <h2 className="section-title-h2">Top Recommendations</h2>
          <div className="recommendations-grid">
            {recommendations.map((book) => (
              <Link to={`/books/${book._id}`} key={`rec-${book._id}`} className="rec-card">
                <div className="rec-cover">
                  <img src={book.cover_image_url || 'https://via.placeholder.com/150x225?text=No+Cover'} alt={book.title} />
                  <div className="rec-badge">⭐ {book.rating}</div>
                </div>
                <div className="rec-info">
                  <h4>{book.title}</h4>
                  <p>{book.author}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Personalized Recommendations Section */}
      {!search && !selectedCategory && personalizedRecs.length > 0 && (
        <section className="recommendations-section personalized-section">
          <h2 className="section-title-h2">Recommended for You</h2>
          <div className="recommendations-grid">
            {personalizedRecs.map((book) => (
              <Link to={`/books/${book._id}`} key={`pers-rec-${book._id}`} className="rec-card">
                <div className="rec-cover">
                  <img src={book.cover_image_url || 'https://via.placeholder.com/150x225?text=No+Cover'} alt={book.title} />
                  <div className="rec-badge">⭐ {book.rating}</div>
                </div>
                <div className="rec-info">
                  <h4>{book.title}</h4>
                  <p>{book.author}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <h2 ref={searchSectionRef} className="section-title-h2">{search || selectedCategory || filterType !== 'all' ? 'Search Results' : 'All Books'}</h2>

      <div className="grid-books">
        {books.map((book) => (
          <div key={book._id} className="card book-card">
            <div className="book-cover-container">
              {book.cover_image_url ? (
                <img
                  src={ensureHttps(book.cover_image_url)}
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
                {typeof book.category_id === 'object' &&
                  book.category_id !== null
                  ? (book.category_id as any).name
                  : 'Uncategorized'}
              </div>
              {book.isPremium && (
                <div className="premium-badge-tag">Premium</div>
              )}
              <h3 className="book-title-h3">{book.title}</h3>
              <p className="book-author-p">by {book.author}</p>

              <div className="book-meta-info">
                <span className="book-price-tag">₹{book.price}</span>
                <span className="book-year-tag">• {book.publishedYear}</span>
              </div>

              <div className="book-footer">
                <div className="book-status-info">
                  <span className={`status-badge status-${book.status} book-status-badge`}>
                    {book.status === BookStatus.OUT_OF_STOCK ? 'OUT OF STOCK' : book.status.toUpperCase()}
                  </span>
                  <span className="book-copies-info">
                    {book.noOfCopies}{' '}
                    {book.noOfCopies === 1 ? 'copy' : 'copies'} available
                  </span>
                </div>
                <div className="book-actions-row">
                  {book.isPremium && !userMembership?.canAccessPremiumBooks ? (
                    <button
                      onClick={() => navigate('/memberships')}
                      className="btn-primary book-action-btn premium-upgrade-btn"
                    >
                      Upgrade to Premium
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (book.noOfCopies > 0) {
                          addToCart(book);
                          toast.success(`${book.title} added to cart!`);
                        } else {
                          toast.error('Out of stock');
                        }
                      }}
                      disabled={book.noOfCopies === 0 || isInCart(book._id)}
                      className={`btn-primary book-action-btn ${isInCart(book._id) ? 'btn-in-cart' : ''}`}
                    >
                      {isInCart(book._id) ? 'In Cart ✓' : 'Add to Cart'}
                    </button>
                  )}
                  <Link
                    to={`/books/${book._id}`}
                    className="btn-primary view-book-btn book-action-btn"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {
        books.length === 0 && (
          <p className="no-books-msg">
            No books found matching your criteria.
          </p>
        )
      }
      {
        books.length > 0 && total > 10 && (
          <div className="pagination-container">
            {Array.from({ length: Math.ceil(total / 10) }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => {
                  setPage(pageNum);
                  setTimeout(() => {
                    if (searchSectionRef.current) {
                      const yOffset = -120; // Slightly more offset for better visibility
                      const element = searchSectionRef.current;
                      const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
                      window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                  }, 100);
                }}
                className={`pagination-btn ${page === pageNum ? 'active' : ''}`}
                disabled={loading}
              >
                {pageNum}
              </button>
            ))}
          </div>
        )
      }

    </div >
  );
};

export default BookList;
