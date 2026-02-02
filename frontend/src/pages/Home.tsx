import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Wand2, Calculator, Hourglass, Heart, Rocket, Cpu, Sparkles, BookOpen, ArrowRight } from 'lucide-react';
import { RoleName } from '../types/enums';
import { getProfile } from '../services/userService';
import { getBooks } from '../services/bookService';
import { getMembershipPlans, getMyMembership, upgradeMembership, type Membership } from '../services/membershipService';
import { getCategories } from '../services/categoryService';
import type { Book, Category } from '../types';
import Footer from '../components/Footer';
import UserNavbar from '../components/UserNavbar';
import ConfirmationModal from '../components/ConfirmationModal';
import MembershipCard from '../components/MembershipCard';
import PaymentModal from '../components/PaymentModal';
import { toast } from 'react-toastify';
import '../styles/Home.css';




const Home: React.FC = () => {
  const navigate = useNavigate();

  const [books, setBooks] = React.useState<Book[]>([]);
  const [memberships, setMemberships] = React.useState<Membership[]>([]);
  const [currentMembership, setCurrentMembership] = React.useState<Membership | null>(null);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [selectedMembership, setSelectedMembership] = React.useState<Membership | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = React.useState(false);
  const [isDowngradeModalOpen, setIsDowngradeModalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const isAuthenticated = !!localStorage.getItem('token');

  React.useEffect(() => {
    const role = localStorage.getItem('role');
    if (role === RoleName.ADMIN) {
      navigate('/admin-dashboard');
    } else if (role === RoleName.SUPER_ADMIN) {
      navigate('/super-admin-dashboard');
    }
  }, []);

  React.useEffect(() => {
    const isAdmin = localStorage.getItem('role') === RoleName.ADMIN || localStorage.getItem('role') === RoleName.SUPER_ADMIN;

    if (!isAdmin) {
      loadAllData();
    }
  }, [isAuthenticated]);

  // Scroll Reveal Observer
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    setTimeout(() => {
      const elements = document.querySelectorAll('.saas-reveal');
      elements.forEach((el) => observer.observe(el));
    }, 100); // Small delay to ensure DOM is ready

    return () => observer.disconnect();
  }, [books, categories, memberships]);

  // Parallel data loading for optimal performance
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      // Fetch public data in parallel
      const publicDataPromises = [
        getBooks('limit=8&sort=-rating').catch(err => {
          console.error('Failed to load books for carousel', err);
          return { books: [] };
        }),
        getMembershipPlans().catch(err => {
          console.error('Failed to load memberships', err);
          return [];
        }),
        getCategories().catch(err => {
          console.error('Failed to load categories', err);
          return [];
        })
      ];

      // Add authenticated user data if logged in
      if (isAuthenticated) {
        const role = localStorage.getItem('role');
        if (role === RoleName.USER) {
          publicDataPromises.push(
            getProfile().catch(err => {
              console.error('Failed to load profile', err);
              return null;
            }),
            getMyMembership().catch(err => {
              console.error('Failed to load current membership', err);
              return null;
            })
          );
        }
      }

      const results = await Promise.all(publicDataPromises);

      // Set data from parallel requests
      const booksData = results[0];
      setBooks(booksData.books || booksData || []);
      setMemberships(results[1] || []);
      setCategories(results[2] || []);

      // Handle authenticated user data
      if (isAuthenticated && results.length > 3) {
        const profileData = results[3];
        if (profileData) {
          if (profileData.role === RoleName.ADMIN) {
            navigate('/admin-dashboard');
            return;
          } else if (profileData.role === RoleName.SUPER_ADMIN) {
            navigate('/super-admin-dashboard');
            return;
          }
        }

        if (results[4]) {
          setCurrentMembership(results[4]);
        }
      }
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setIsLoading(false);
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
      navigate('/login');
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
      toast.success(response.message || 'Membership downgraded successfully');
    } catch (err) {
      console.error('Failed to downgrade membership:', err);
      toast.error('Failed to downgrade membership. Please try again.');
    }
  };

  const handlePaymentSuccess = async () => {
    // Reload membership data after payment
    if (isAuthenticated) {
      try {
        const data = await getMyMembership();
        setCurrentMembership(data);
      } catch (err) {
        console.error('Failed to reload membership', err);
      }
    }
    setIsPaymentModalOpen(false);
    setSelectedMembership(null);
  };

  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('business')) return <Briefcase width="32" height="32" />;
    if (lower.includes('fantasy')) return <Wand2 width="32" height="32" />;
    if (lower.includes('finance')) return <Calculator width="32" height="32" />;
    if (lower.includes('history')) return <Hourglass width="32" height="32" />;
    if (lower.includes('rom')) return <Heart width="32" height="32" />;
    if (lower.includes('sci')) return <Rocket width="32" height="32" />;
    if (lower.includes('tech')) return <Cpu width="32" height="32" />;
    if (lower.includes('fiction')) return <Sparkles width="32" height="32" />;
    return <BookOpen width="32" height="32" />;
  };

  return (
    <div className="home-page saas-theme">
      {/* Dynamic Navbar */}
      <UserNavbar />

      {/* Hero: Vibrant & Educational */}
      <header className="saas-hero">
        <div className="hero-backdrop">
          <div className="glow glow-1"></div>
          <div className="glow glow-2"></div>
        </div>
        <div className="saas-container hero-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 0.9fr',
          gap: '2rem',
          alignItems: 'center',
          minHeight: '600px'
        }}>
          <div className="hero-stack text-left" style={{ minWidth: 0 }}>
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

          <div className="hero-carousel-container saas-reveal" style={{
            width: '100%',
            height: '450px',
            display: 'flex',
            justifyContent: 'flex-start'
          }}>
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

      {/* Trust Badges / Service Guarantee */}

      {/* Purpose Section: How it Works */}
      <section className="saas-section purple-bg">
        <div className="saas-container">
          <div className="section-head text-center saas-reveal">
            <h2 className="section-title">Experience the modern library</h2>
            <p className="section-sub">The best of both worlds: Physical books delivered & instant digital access.</p>
          </div>

          <div className="how-it-works-grid">
            <div className="work-card saas-reveal">
              <div className="icon-circ">📚</div>
              <h3>Browse & Discover</h3>
              <p>Explore our vast catalog of physical books and e-books, curated for every interest.</p>
            </div>
            <div className="work-card saas-reveal">
              <div className="icon-circ">🚚</div>
              <h3>Doorstep Delivery</h3>
              <p>Order physical books online and get them delivered to your home. Easy returns included.</p>
            </div>
            <div className="work-card saas-reveal">
              <div className="icon-circ">📱</div>
              <h3>Read Instantly</h3>
              <p>Access premium e-books anytime, anywhere. Your personalized digital library awaits.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges / Service Guarantee */}
      <section className="trust-badges-section">
        <div className="saas-container">
          <div className="trust-grid">
            <div className="trust-item saas-reveal">
              <div className="trust-icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 18 1 18 1 3"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
              </div>
              <div className="trust-text">
                <h4>Fast Delivery</h4>
                <p>2-3 Day Shipping</p>
              </div>
            </div>
            <div className="trust-item saas-reveal">
              <div className="trust-icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              </div>
              <div className="trust-text">
                <h4>Hygiene Verified</h4>
                <p>Sanitized & Clean</p>
              </div>
            </div>
            <div className="trust-item saas-reveal">
              <div className="trust-icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
              </div>
              <div className="trust-text">
                <h4>Easy Returns</h4>
                <p>7-Day Policy</p>
              </div>
            </div>
            <div className="trust-item saas-reveal">
              <div className="trust-icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <div className="trust-text">
                <h4>Secure Payment</h4>
                <p>100% Protected</p>
              </div>
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
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 3 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="saas-reveal active">
                  <div className="membership-card-skeleton" style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '16px',
                    padding: '2rem',
                    minHeight: '400px',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }}>
                    <div style={{
                      height: '24px',
                      width: '60%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '4px',
                      marginBottom: '1rem'
                    }}></div>
                    <div style={{
                      height: '48px',
                      width: '40%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '4px',
                      marginBottom: '2rem'
                    }}></div>
                    <div style={{
                      height: '16px',
                      width: '80%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '4px',
                      marginBottom: '0.5rem'
                    }}></div>
                    <div style={{
                      height: '16px',
                      width: '70%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '4px',
                      marginBottom: '0.5rem'
                    }}></div>
                  </div>
                </div>
              ))
            ) : (
              memberships.map((membership) => (
                <div key={membership._id} className="saas-reveal">
                  <MembershipCard
                    membership={membership}
                    currentMembership={currentMembership}
                    isAuthenticated={isAuthenticated}
                    onUpgrade={handleUpgrade}
                  />
                </div>
              ))
            )}
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
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 8 }).map((_, index) => (
                <div key={`cat-skeleton-${index}`} className="category-card saas-reveal active">
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    marginBottom: '1rem',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }}></div>
                  <div style={{
                    height: '20px',
                    width: '70%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px',
                    marginBottom: '0.5rem'
                  }}></div>
                  <div style={{
                    height: '14px',
                    width: '90%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px'
                  }}></div>
                </div>
              ))
            ) : (
              <>
                {categories.slice(0, 7).map((category) => (
                  <div
                    key={category._id}
                    onClick={() => {
                      if (!isAuthenticated) {
                        toast.info('Please sign in to explore categories');
                        navigate('/login');
                      } else {
                        navigate(`/books?category=${category._id}`);
                      }
                    }}
                    className="category-card saas-reveal"
                    data-category={category.name.toLowerCase().replace(/\s+/g, '-')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="category-icon">
                      {getCategoryIcon(category.name)}
                    </div>
                    <h3>{category.name}</h3>
                    <p>{category.description || 'Explore this collection'}</p>
                  </div>
                ))}

                {/* View All Card */}
                <div
                  onClick={handleExplore}
                  className="category-card saas-reveal"
                  style={{
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.1) 100%)',
                    borderColor: 'var(--saas-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center'
                  }}
                >
                  <div
                    className="category-icon"
                    style={{
                      background: 'var(--saas-primary)',
                      marginBottom: '1rem',
                      borderRadius: '50%'
                    }}
                  >
                    <ArrowRight width="32" height="32" />
                  </div>
                  <h3>View All</h3>
                  <p style={{ transform: 'none', opacity: 1 }}>Explore our full catalog</p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="saas-cta-section">
        <div className="saas-container saas-reveal">
          <div className="cta-box">
            <h2>Ready to start reading?</h2>
            <p>Join thousands of knowledge seekers today. Your first book is just a click away.</p>
            <div className="cta-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <button onClick={handleExplore} className="btn-vibrant large">Join Bookstack Now</button>
              <button onClick={() => {
                const element = document.querySelector('.membership-plans-grid');
                if (element) element.scrollIntoView({ behavior: 'smooth' });
              }} className="btn-outline large" style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}>View Plans</button>
            </div>

            {/* Visual Decor */}
            <div className="cta-decor" style={{ position: 'absolute', top: '-50px', right: '-50px', opacity: 0.1, transform: 'rotate(15deg)' }}>
              <BookOpen width="200" height="200" color="white" />
            </div>
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
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          localStorage.removeItem('userId');
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
