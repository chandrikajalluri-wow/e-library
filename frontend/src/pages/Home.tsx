import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProfile } from '../services/userService';
import { getBooks } from '../services/bookService';
import { getMembershipPlans, getMyMembership, upgradeMembership, type Membership } from '../services/membershipService';
import { getCategories } from '../services/categoryService';
import type { Book, Category } from '../types';
import Footer from '../components/Footer';
import ConfirmationModal from '../components/ConfirmationModal';
import MembershipCard from '../components/MembershipCard';
import PaymentModal from '../components/PaymentModal';
import '../styles/Home.css';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = React.useState<any>(null);
  const [books, setBooks] = React.useState<Book[]>([]);
  const [memberships, setMemberships] = React.useState<Membership[]>([]);
  const [currentMembership, setCurrentMembership] = React.useState<Membership | null>(null);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [selectedMembership, setSelectedMembership] = React.useState<Membership | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = React.useState(false);
  const [isDowngradeModalOpen, setIsDowngradeModalOpen] = React.useState(false);
  const isAuthenticated = !!localStorage.getItem('token');

  React.useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
      loadCurrentMembership();
    }
    loadBooks();
    loadMemberships();
    loadCategories();
  }, [isAuthenticated]);

  const loadBooks = async () => {
    try {
      const data = await getBooks('limit=8');
      setBooks(data.books || data);
    } catch (err) {
      console.error('Failed to load books for carousel', err);
    }
  };

  const loadMemberships = async () => {
    try {
      const data = await getMembershipPlans();
      setMemberships(data);
    } catch (err) {
      console.error('Failed to load memberships', err);
    }
  };

  const loadCurrentMembership = async () => {
    try {
      const data = await getMyMembership();
      setCurrentMembership(data);
    } catch (err) {
      console.error('Failed to load current membership', err);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setUser(data);
      if (data.role === 'admin') {
        navigate('/admin-dashboard');
      }
    } catch (err) {
      console.error('Failed to load profile', err);
    }
  };

  const handleExplore = () => {
    if (isAuthenticated) {
      navigate('/books');
    } else {
      navigate('/login');
    }
  };

  const handleUpgrade = (membership: Membership) => {
    if (!isAuthenticated) {
      navigate('/signup');
      return;
    }

    if (membership.price === 0) {
      setSelectedMembership(membership);
      setIsDowngradeModalOpen(true);
      return;
    }

    setSelectedMembership(membership);
    setIsPaymentModalOpen(true);
  };

  const handleDowngrade = async () => {
    if (!selectedMembership) return;

    try {
      const response = await upgradeMembership(selectedMembership._id);
      setCurrentMembership(response.membership);
      setIsDowngradeModalOpen(false);
      setSelectedMembership(null);
      alert(response.message || 'Membership downgraded successfully');
    } catch (err) {
      console.error('Failed to downgrade membership:', err);
      alert('Failed to downgrade membership. Please try again.');
    }
  };

  const handlePaymentSuccess = () => {
    loadCurrentMembership();
    setIsPaymentModalOpen(false);
    setSelectedMembership(null);
  };

  return (
    <div className="home-page saas-theme">
      {/* Dynamic Navbar */}
      <nav className="saas-nav">
        <div className="nav-wrapper">
          <Link to="/" className="saas-logo">
            <div className="logo-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v15.661a2.5 2.5 0 0 1-2.261 2.482L5 20.5a2.5 2.5 0 0 1-1-5z"></path>
                <path d="M8 7h8"></path>
                <path d="M8 11h8"></path>
              </svg>
            </div>
            <span>Bookstack</span>
          </Link>
          <div className="nav-actions">
            <Link to="/books">Books</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Support</Link>
            {isAuthenticated ? (
              <div className="home-user-actions">
                <Link to="/profile" className="nav-user-chip">
                  <div className="chip-avatar">
                    {user?.profileImage ? (
                      <img src={user.profileImage} alt="Profile" />
                    ) : (
                      user?.name?.charAt(0) || 'U'
                    )}
                  </div>
                  <span>{user?.name || 'Reader'}</span>
                </Link>
                <button
                  onClick={() => setIsLogoutModalOpen(true)}
                  className="home-logout-btn"
                  title="Logout"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                </button>
              </div>
            ) : (
              <Link to="/login" className="nav-cta">Get Started</Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero: Vibrant & Educational */}
      <header className="saas-hero">
        <div className="hero-backdrop">
          <div className="glow glow-1"></div>
          <div className="glow glow-2"></div>
        </div>
        <div className="saas-container hero-grid">
          <div className="hero-stack text-left">
            <div className="hero-badge saas-reveal">✨ Your Digital Lending Library</div>
            <h1 className="hero-main-title saas-reveal">
              The smartest way to <br />
              <span className="gradient-highlight">Borrow & Read.</span>
            </h1>
            <p className="hero-description saas-reveal">
              Bookstack is a premium e-library that brings thousands of verified books to your fingertips. Join our community of readers and start exploring today.
            </p>
            <div className="hero-btns saas-reveal">
              <button onClick={handleExplore} className="btn-vibrant">Browse Library</button>
              <Link to="/about" className="btn-outline">Watch how it works</Link>
            </div>

            <div className="hero-stats-row saas-reveal">
              <div className="mini-stat"><b>10k+</b> Titles</div>
              <div className="mini-stat"><b>5k+</b> Authors</div>
            </div>
          </div>

          <div className="hero-carousel-container saas-reveal">
            <div className="carousel-track">
              {books.length > 0 ? (
                [...books, ...books].map((book, index) => (
                  <div key={`${book._id}-${index}`} className="carousel-item">
                    <img
                      src={book.cover_image_url || 'https://via.placeholder.com/150x225?text=No+Cover'}
                      alt={book.title}
                      className="carousel-book-cover"
                    />
                    <div className="book-card-glass">
                      <h4>{book.title}</h4>
                      <p>{book.author}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="carousel-placeholder">
                  <div className="placeholder-book"></div>
                  <div className="placeholder-book"></div>
                  <div className="placeholder-book"></div>
                </div>
              )}
            </div>
            <div className="carousel-track track-2">
              {books.length > 0 ? (
                [...books, ...books].reverse().map((book, index) => (
                  <div key={`${book._id}-rev-${index}`} className="carousel-item">
                    <img
                      src={book.cover_image_url || 'https://via.placeholder.com/150x225?text=No+Cover'}
                      alt={book.title}
                      className="carousel-book-cover"
                    />
                  </div>
                ))
              ) : (
                <div className="carousel-placeholder">
                  <div className="placeholder-book"></div>
                  <div className="placeholder-book"></div>
                  <div className="placeholder-book"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Purpose Section: How it Works */}
      <section className="saas-section purple-bg">
        <div className="saas-container">
          <div className="section-head text-center saas-reveal">
            <h2 className="section-title">Experience the modern library</h2>
            <p className="section-sub">Simple, fast, and completely digital.</p>
          </div>

          <div className="how-it-works-grid">
            <div className="work-card saas-reveal">
              <div className="icon-circ">📚</div>
              <h3>Browse the Collection</h3>
              <p>Search through curated genres from classics to the latest tech breakthroughs.</p>
            </div>
            <div className="work-card saas-reveal">
              <div className="icon-circ">🔖</div>
              <h3>Borrow Instantly</h3>
              <p>No waiting in line. Click borrow and your digital copy is ready on your dashboard.</p>
            </div>
            <div className="work-card saas-reveal">
              <div className="icon-circ">📖</div>
              <h3>Read Anywhere</h3>
              <p>Access your borrowed books from any device. Your personalized library, always with you.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Membership Plans Section */}
      <section className="saas-section">
        <div className="saas-container">
          <div className="section-head text-center saas-reveal">
            <h2 className="section-title">Choose Your Plan</h2>
            <p className="section-sub">Flexible membership options for every reader</p>
          </div>

          <div className="membership-plans-grid">
            {memberships.map((membership) => (
              <div key={membership._id} className="saas-reveal">
                <MembershipCard
                  membership={membership}
                  currentMembership={currentMembership}
                  isAuthenticated={isAuthenticated}
                  onUpgrade={handleUpgrade}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="saas-section purple-bg">
        <div className="saas-container">
          <div className="section-head text-center saas-reveal">
            <h2 className="section-title">Explore by Category</h2>
            <p className="section-sub">Discover books across diverse genres</p>
          </div>

          <div className="categories-grid">
            {categories.slice(0, 8).map((category) => (
              <Link
                key={category._id}
                to={`/books?category=${category._id}`}
                className="category-card saas-reveal"
                data-category={category.name.toLowerCase().replace(/\s+/g, '-')}
              >
                <div className="category-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                  </svg>
                </div>
                <h3>{category.name}</h3>
                <p>{category.description || 'Explore this collection'}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="saas-cta-section">
        <div className="saas-container saas-reveal">
          <div className="cta-box">
            <h2>Ready to start reading?</h2>
            <p>Join thousands of knowledge seekers today. Your first book is just a click away.</p>
            <button onClick={handleExplore} className="btn-vibrant large">Join Bookstack Now</button>
          </div>
        </div>
      </section>

      <Footer />

      {isPaymentModalOpen && selectedMembership && (
        <PaymentModal
          membership={selectedMembership}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        title="Sign Out"
        message="Are you sure you want to sign out from Bookstack?"
        onConfirm={() => {
          localStorage.clear();
          window.location.reload();
        }}
        onCancel={() => setIsLogoutModalOpen(false)}
        type="warning"
        confirmText="Sign Out"
      />

      <ConfirmationModal
        isOpen={isDowngradeModalOpen}
        title="Downgrade Membership"
        message={`Are you sure you want to downgrade to the ${selectedMembership?.displayName} plan? This will take effect immediately.`}
        onConfirm={handleDowngrade}
        onCancel={() => setIsDowngradeModalOpen(false)}
        type="warning"
        confirmText="Confirm Downgrade"
      />
    </div>
  );
};

export default Home;
