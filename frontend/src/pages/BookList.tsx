/* eslint-disable react-hooks/immutability */
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getBooks } from '../services/bookService';
import { getCategories } from '../services/categoryService';
import { getProfile } from '../services/userService';
import type { Book } from '../types';

import '../styles/BookList.css';

const BookList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') || '';
  const searchSectionRef = React.useRef<HTMLHeadingElement>(null);

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
  }, [search, selectedCategory, page, filterType]);

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
  }, [selectedCategory, filterType]);

  useEffect(() => {
    loadRecommendations();
    loadPersonalizedRecs();
  }, []);

  const loadPersonalizedRecs = async () => {
    try {
      const userData = await getProfile();
      if (userData.favoriteGenres && userData.favoriteGenres.length > 0) {
        const query = `category=${userData.favoriteGenres.join(',')}&limit=4`;
        const data = await getBooks(query);
        setPersonalizedRecs(data.books || data);
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
      let query = `search=${search}&page=${page}&limit=10`;
      if (selectedCategory) query += `&category=${selectedCategory}`;
      if (filterType === 'premium') query += `&isPremium=true`;
      if (filterType === 'free') query += `&isPremium=false`;
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

  return (
    <div className="dashboard-container saas-reveal">
      <div className="filter-container">
        <input
          type="text"
          placeholder="Search books, authors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="category-select"
        >
          <option value="">All Categories</option>
          {categories.map((c: any) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="category-select"
        >
          <option value="all">All Books</option>
          <option value="free">Free Only</option>
          <option value="premium">Premium Only</option>
        </select>
      </div>

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
                    {book.status}
                  </span>
                  <span className="book-copies-info">
                    {book.noOfCopies}{' '}
                    {book.noOfCopies === 1 ? 'copy' : 'copies'} available
                  </span>
                </div>
                <Link
                  to={`/books/${book._id}`}
                  className="btn-primary view-book-btn"
                >
                  View
                </Link>
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
