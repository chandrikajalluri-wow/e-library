import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProfile } from '../services/userService';
import '../styles/Home.css';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = React.useState<any>(null);
  const isAuthenticated = !!localStorage.getItem('token');

  React.useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
    }
  }, [isAuthenticated]);

  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setUser(data);
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

  const genres = [
    {
      name: 'Fiction',
      description: 'Explore imaginative stories and narrative works from classic literature to modern thrillers.',
      icon: '📚'
    },
    {
      name: 'Science & Technology',
      description: 'Stay ahead with the latest in physics, biology, software engineering, and space exploration.',
      icon: '🧪'
    },
    {
      name: 'History & Culture',
      description: 'Dive into the past and understand the civilizations and events that shaped our world.',
      icon: '🏛️'
    },
    {
      name: 'Business & Finance',
      description: 'Master the markets and learn from the leaders in entrepreneurship and economics.',
      icon: '📈'
    }
  ];

  return (
    <div className="home-page">
      {/* Navbar */}
      <nav className="home-nav">
        <div className="home-logo-container">
          <div className="home-logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v15.661a2.5 2.5 0 0 1-2.261 2.482L5 20.5a2.5 2.5 0 0 1-1-5z"></path></svg>
          </div>
          <h1 className="home-logo-text">E-Library</h1>
        </div>
        <div className="home-nav-links">
          <Link to="/contact" className="home-contact-link">Contact Us</Link>
          {isAuthenticated ? (
            <Link to="/profile" className="home-profile-link">
              <div className="home-profile-icon">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="home-user-name">{user?.name || 'Profile'}</span>
            </Link>
          ) : (
            <Link to="/login" className="home-login-btn">Login</Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <header className="home-hero">
        <div className="home-hero-blob"></div>

        <h2 className="home-hero-title">
          Ignite Your Imagination <br />
          With Our <span className="home-highlight">Global Collection.</span>
        </h2>
        <p className="home-hero-subtitle">
          Access thousands of books from anywhere in the world. From timeless classics to the latest scientific breakthroughs, your next great read starts here.
        </p>
        <button
          onClick={handleExplore}
          className="home-explore-btn"
        >
          Explore Collection
        </button>
      </header>

      {/* About Section */}
      <section className="home-about-section">
        <div className="home-about-grid">
          <div>
            <h3 className="home-about-title">Empowering Knowledge Everywhere</h3>
            <p className="home-about-text">
              Our digital library is committed to providing universal access to high-quality educational resources and literature. We believe that everyone, regardless of their location, should have the tools to learn and grow.
            </p>
            <p className="home-about-text">
              With a curated collection spanning multiple languages and domains, we bridges the gap between traditional libraries and the modern digital age.
            </p>
          </div>
          <div className="home-quote-card">
            <div className="home-quote-icon">💡</div>
            <p className="home-quote-text">
              "Libraries were full of ideas—perhaps the most dangerous and powerful of all weapons."
            </p>
            <span className="home-quote-author">— Sarah J. Maas</span>
          </div>
        </div>
      </section>

      {/* Genres Section */}
      <section className="home-genres-section">
        <div className="home-genres-container">
          <div className="home-genres-header">
            <h3 className="home-genres-title">Our Diverse Catalog</h3>
            <p className="home-genres-subtitle">Something for every curious mind.</p>
          </div>
          <div className="home-genres-grid">
            {genres.map((genre, idx) => (
              <div key={idx} className="card home-genre-card">
                <div className="home-genre-icon">{genre.icon}</div>
                <h4 className="home-genre-name">{genre.name}</h4>
                <p className="home-genre-desc">{genre.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <p className="home-footer-copy">© 2025 E-Library Global System</p>
        <div className="home-footer-links">
          <Link to="/contact" className="home-footer-link">Contact</Link>
          <a href="#" className="home-footer-link">Privacy Policy</a>
          <a href="#" className="home-footer-link">Terms of Service</a>
        </div>
        <p className="home-footer-tagline">Making the world's knowledge accessible to everyone, everywhere.</p>
      </footer>
    </div>
  );
};

export default Home;
