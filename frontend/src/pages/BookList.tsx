/* eslint-disable react-hooks/immutability */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBooks } from '../services/bookService';
import { getCategories } from '../services/categoryService';
import type { Book } from '../types';
import Loader from '../components/Loader';
import ScrollToTop from '../components/ScrollToTop';
import UserNavbar from '../components/UserNavbar';
import '../styles/BookList.css';

const BookList: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (search === '') {
      loadData();
      return;
    }
    const timeoutId = setTimeout(() => {
      loadData();
    }, 500); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [search, selectedCategory, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, selectedCategory]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Build query string
      let query = `search=${search}&page=${page}&limit=10`;
      if (selectedCategory) query += `&category=${selectedCategory}`;

      const data = await getBooks(query);

      if (page === 1) {
        setBooks(data.books);
      } else {
        setBooks((prev) => [...prev, ...data.books]);
      }
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
    <div className="dashboard-container">
      <UserNavbar />
      <div className="filter-container" style={{ marginTop: '2rem' }}>
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
      </div>

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
              <h3 className="book-title-h3">{book.title}</h3>
              <p className="book-author-p">{book.author}</p>

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
      {books.length === 0 && (
        <p className="no-books-msg">
          No books found matching your criteria.
        </p>
      )}
      {books.length < total && (
        <div style={{ textAlign: 'center', margin: '20px' }}>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? <Loader small /> : 'Load More'}
          </button>
        </div>
      )}
      <ScrollToTop />
    </div>
  );
};

export default BookList;
