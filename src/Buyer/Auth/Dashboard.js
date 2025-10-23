import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Styling/dashboard.css';
import API_CONFIG from '../../config/api';

const BuyerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('browse');
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('authToken');
    const userEmail = localStorage.getItem('userEmail');
    const firstName = localStorage.getItem('userFirstName');
    const lastName = localStorage.getItem('userLastName');

    if (!token) {
      navigate('/login');
      return;
    }

    setUser({
      email: userEmail,
      firstName,
      lastName
    });

    // Fetch products on component mount
    if (activeTab === 'browse') {
      fetchProducts();
    }
  }, [navigate, activeTab]);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_CONFIG.ENDPOINTS.BUYER.PRODUCTS}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      setError('Failed to load products. Please try again.');
      console.error('Fetch products error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('buyerId');
    localStorage.removeItem('userType');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userFirstName');
    localStorage.removeItem('userLastName');
    navigate('/login');
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !filterCategory || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="buyer-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo-section">
            <h1 className="logo">🌾 KilimoSmart</h1>
            <p className="tagline">Your Fresh Farm Connection</p>
          </div>
          <div className="user-section">
            <div className="user-info">
              <span className="user-greeting">Welcome, {user?.firstName || 'Buyer'}! 👋</span>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Sidebar Navigation */}
        <aside className="dashboard-sidebar">
          <nav className="nav-menu">
            <button
              className={`nav-item ${activeTab === 'browse' ? 'active' : ''}`}
              onClick={() => setActiveTab('browse')}
            >
              🔍 Browse Products
            </button>
            <button
              className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              📦 My Orders
            </button>
            <button
              className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              👤 Profile
            </button>
            <button
              className={`nav-item ${activeTab === 'cart' ? 'active' : ''}`}
              onClick={() => setActiveTab('cart')}
            >
              🛒 Shopping Cart
            </button>
          </nav>
        </aside>

        {/* Content Area */}
        <section className="dashboard-content">
          {/* Browse Products Tab */}
          {activeTab === 'browse' && (
            <div className="tab-content browse-tab">
              <div className="tab-header">
                <h2>🌱 Fresh Products Available</h2>
                <p className="subtitle">Browse and order directly from local farmers</p>
              </div>

              {/* Search and Filter */}
              <div className="search-filter-section">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search products by name or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                </div>
                <div className="filter-box">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Categories</option>
                    <option value="vegetables">Vegetables</option>
                    <option value="fruits">Fruits</option>
                    <option value="grains">Grains</option>
                    <option value="dairy">Dairy</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Error Message */}
              {error && <div className="error-message">{error}</div>}

              {/* Loading State */}
              {isLoading && <div className="loading">Loading products...</div>}

              {/* Products Grid */}
              {!isLoading && filteredProducts.length > 0 ? (
                <div className="products-grid">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="product-card">
                      <div className="product-image">
                        <div className="image-placeholder">🌾</div>
                        {product.isOrganic && <span className="organic-badge">Organic ✓</span>}
                      </div>
                      <div className="product-info">
                        <h3 className="product-name">{product.name}</h3>
                        <p className="product-category">{product.category}</p>
                        <p className="product-description">{product.description}</p>
                        <div className="product-details">
                          <span className="quantity">Qty: {product.quantity} {product.unit}</span>
                          <span className="price">KES {product.price.toFixed(2)}</span>
                        </div>
                        <button className="add-to-cart-btn">Add to Cart 🛒</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !isLoading && (
                <div className="no-products">
                  <p>No products found. Try adjusting your search or filters.</p>
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="tab-content orders-tab">
              <div className="tab-header">
                <h2>📦 My Orders</h2>
              </div>
              <div className="placeholder-content">
                <p>Your order history will appear here.</p>
                <p>Start by browsing and adding products to your cart!</p>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="tab-content profile-tab">
              <div className="tab-header">
                <h2>👤 My Profile</h2>
              </div>
              <div className="profile-info">
                <div className="profile-field">
                  <label>First Name</label>
                  <p>{user?.firstName || 'N/A'}</p>
                </div>
                <div className="profile-field">
                  <label>Last Name</label>
                  <p>{user?.lastName || 'N/A'}</p>
                </div>
                <div className="profile-field">
                  <label>Email</label>
                  <p>{user?.email || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Cart Tab */}
          {activeTab === 'cart' && (
            <div className="tab-content cart-tab">
              <div className="tab-header">
                <h2>🛒 Shopping Cart</h2>
              </div>
              <div className="placeholder-content">
                <p>Your cart is empty.</p>
                <button 
                  className="browse-btn"
                  onClick={() => setActiveTab('browse')}
                >
                  Continue Shopping 🌱
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>&copy; 2025 KilimoSmart. Connecting farmers with buyers.</p>
      </footer>
    </div>
  );
};

export default BuyerDashboard;
