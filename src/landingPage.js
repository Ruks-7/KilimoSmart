import React, { useState, useEffect } from 'react';
import './landingPage.css';
import { FaLeaf, FaHandshake, FaChartLine, FaUsers, FaMobile } from 'react-icons/fa';
import { IoMdArrowRoundForward } from 'react-icons/io';

// Import images
import farmer1 from './Images/Farmer1.jpg';
import technology from './Images/Technology.jpg';
import produce from './Images/Produce.jpg';

const LandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoginMenuOpen, setIsLoginMenuOpen] = useState(false);
  
  // Define slideshow images
  const slideshowImages = [
    {
      src: farmer1,
      alt: "Kenyan farmer with harvest"
    },
    {
      src: technology,
      alt: "Farmers market in Kenya"
    },
    {
      src: produce,
      alt: "Fresh Kenyan produce"
    }
  ];

  // Auto-advance slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prevSlide => 
        prevSlide === slideshowImages.length - 1 ? 0 : prevSlide + 1
      );
    }, 5000); // Change slide every 5 seconds 
    
    return () => clearInterval(interval);
  }, [slideshowImages.length]);

  // Navigate to previous slide
  const prevSlide = () => {
    setCurrentSlide(prevSlide => 
      prevSlide === 0 ? slideshowImages.length - 1 : prevSlide - 1
    );
  };

  // Navigate to next slide
  const nextSlide = () => {
    setCurrentSlide(prevSlide => 
      prevSlide === slideshowImages.length - 1 ? 0 : prevSlide + 1
    );
  };

  return (
    <div className="landing-page-wrapper" id="landing-page">
      {/* Navigation */}
      <nav className="navbar">
        <div className="container">
          <div className="logo">
            <span className="logo-kilimo">Kilimo</span>
            <span className="logo-smart">Smart</span>
          </div>
          
          <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#testimonials">Success Stories</a>
            <a href="/faq">Help & FAQ</a>
            <a href="#contact">Contact</a>
            
            {/* Mobile Auth Buttons - Only shown in mobile menu */}
            <div className="mobile-auth-section">
              <div className="mobile-auth-label">Get Started</div>
              <a href="/login" className="btn btn-login buyer">
                <span className="btn-icon">🛒</span>
                <span>Buyer Login</span>
              </a>
              <a href="/loginF" className="btn btn-login farmer">
                <span className="btn-icon">🌾</span>
                <span>Farmer Login</span>
              </a>
              <a href="/signup" className="btn btn-signup buyer">
                <span className="btn-icon">🛒</span>
                <span>Join as Buyer</span>
              </a>
              <a href="/signupFarmer" className="btn btn-signup farmer">
                <span className="btn-icon">🌾</span>
                <span>Join as Farmer</span>
              </a>
            </div>
          </div>
          
          {/* Desktop Auth Buttons - Only shown on desktop */}
          <div className="desktop-auth-buttons">
            <div className="login-dropdown">
              <button 
                className="btn btn-login"
                onClick={() => setIsLoginMenuOpen(!isLoginMenuOpen)}
              >
                <span className="btn-icon">👤</span>
                <span>Login</span>
                <span className="dropdown-arrow">▼</span>
              </button>
              {isLoginMenuOpen && (
                <div className="login-dropdown-menu">
                  <a href="/login" className="dropdown-item">
                    <span className="btn-icon">🛒</span>
                    <span>Buyer Login</span>
                  </a>
                  <a href="/loginF" className="dropdown-item">
                    <span className="btn-icon">🌾</span>
                    <span>Farmer Login</span>
                  </a>
                </div>
              )}
            </div>
            <a href="/signup" className="btn btn-signup buyer">
              <span className="btn-icon">🛒</span>
              <span>Join as Buyer</span>
            </a>
            <a href="/signupFarmer" className="btn btn-signup farmer">
              <span className="btn-icon">🌾</span>
              <span>Join as Farmer</span>
            </a>
          </div>
          
          <div className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <div className={`hamburger ${isMenuOpen ? 'active' : ''}`}></div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>Connecting Farmers & Buyers Across Kenya</h1>
            <p>KilimoSmart brings together agricultural producers and purchasers on one innovative platform, eliminating middlemen and creating fair trade opportunities.</p>
            <div className="hero-buttons">
              <a href="/signup" className="btn-primary buyer-cta">
                <span className="btn-icon">🛒</span>
                <span>Join as Buyer</span>
                <IoMdArrowRoundForward className="btn-arrow" />
              </a>
              <a href="/signupFarmer" className="btn-primary farmer-cta">
                <span className="btn-icon">🌾</span>
                <span>Join as Farmer</span>
                <IoMdArrowRoundForward className="btn-arrow" />
              </a>
              <button className="btn-secondary">
                <span>Learn More</span>
              </button>
            </div>
          </div>
          <div className="hero-slideshow">
            {slideshowImages.map((image, index) => (
              <div 
                key={index} 
                className={`slideshow-image ${index === currentSlide ? 'active' : ''}`}
              >
                <img src={image.src} alt={image.alt} />
              </div>
            ))}
            <button className="slideshow-arrow slideshow-prev" onClick={prevSlide}>
              &lt;
            </button>
            <button className="slideshow-arrow slideshow-next" onClick={nextSlide}>
              &gt;
            </button>
            <div className="slideshow-dots">
              {slideshowImages.map((_, index) => (
                <span 
                  key={index} 
                  className={`slideshow-dot ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(index)}
                ></span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="container">
          <div className="stat-item">
            <h3>5,000+</h3>
            <p>Registered Farmers</p>
          </div>
          <div className="stat-item">
            <h3>1,200+</h3>
            <p>Active Buyers</p>
          </div>
          <div className="stat-item">
            <h3>42</h3>
            <p>Counties Reached</p>
          </div>
          <div className="stat-item">
            <h3>KSh 12M+</h3>
            <p>Monthly Transactions</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <h2>Why Choose KilimoSmart?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon"><FaLeaf /></div>
              <h3>Direct Market Access</h3>
              <p>Connect directly with buyers and get better prices for your produce without middlemen.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><FaHandshake /></div>
              <h3>Verified Partners</h3>
              <p>All users are verified to ensure secure and reliable transactions.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><FaChartLine /></div>
              <h3>Market Insights</h3>
              <p>Access real-time market data and trends to make informed decisions.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><FaUsers /></div>
              <h3>Community Support</h3>
              <p>Join a community of farmers sharing knowledge and best practices.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><FaMobile /></div>
              <h3>Mobile Payments</h3>
              <p>Secure and convenient M-Pesa integration for seamless transactions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <h2>How KilimoSmart Works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Create Your Profile</h3>
              <p>Sign up and create your farmer or buyer profile in minutes.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>List Products or Browse</h3>
              <p>Farmers list available produce while buyers browse listings.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Connect & Negotiate</h3>
              <p>Connect directly with potential partners and negotiate terms.</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <h3>Complete Transaction</h3>
              <p>Finalize deals with our secure payment and delivery system.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="testimonials">
        <div className="container">
          <h2>Success Stories</h2>
          <div className="testimonial-cards">
            <div className="testimonial-card">
              <div className="testimonial-image">
                <img src="/images/farmer-jane.jpg" alt="Farmer Jane" />
              </div>
              <p>"KilimoSmart helped me increase my profits by 40% by connecting me directly with restaurants in Nairobi."</p>
              <h4>Jane Wanjiku</h4>
              <p className="testimonial-role">Tomato Farmer, Kiambu County</p>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-image">
                <img src="/images/buyer-john.jpg" alt="Buyer John" />
              </div>
              <p>"Finding reliable suppliers was always a challenge until I discovered KilimoSmart. Now I have consistent quality produce."</p>
              <h4>John Omondi</h4>
              <p className="testimonial-role">Restaurant Owner, Mombasa</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <h2>Ready to Transform Your Agricultural Business?</h2>
          <p>Join thousands of farmers and buyers already benefiting from KilimoSmart.</p>
          <button className="btn-primary">Get Started Today <IoMdArrowRoundForward /></button>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="container">
          <div className="footer-grid">
            <div className="footer-about">
              <div className="logo">
                <span className="logo-kilimo">Kilimo</span>
                <span className="logo-smart">Smart</span>
              </div>
              <p>Connecting farmers and buyers across Kenya with technology and trust.</p>
              <div className="social-icons">
                {/* Social icons would go here */}
              </div>
            </div>
            <div className="footer-links">
              <h4>Quick Links</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#how-it-works">How It Works</a></li>
                <li><a href="#testimonials">Success Stories</a></li>
                <li><a href="#faq">FAQ</a></li>
              </ul>
            </div>
            <div className="footer-links">
              <h4>Resources</h4>
              <ul>
                <li><a href="#blog">Blog</a></li>
                <li><a href="#market-data">Market Data</a></li>
                <li><a href="#tutorials">Tutorials</a></li>
                <li><a href="#support">Support</a></li>
              </ul>
            </div>
            <div className="footer-contact">
              <h4>Contact Us</h4>
              <p>Email: info@kilimosmart.co.ke</p>
              <p>Phone: +254 700 123 456</p>
              <p>Location: Nairobi, Kenya</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} KilimoSmart. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;