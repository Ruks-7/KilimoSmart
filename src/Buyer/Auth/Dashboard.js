import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Styling/dashboard.css';
import API_CONFIG from '../../config/api';
import ContactFarmerButton from '../../components/ContactFarmerButton';
import Messages from './Messages';
import ReviewModal from '../../components/ReviewModal';
import RoleSwitcher from '../../components/RoleSwitcher';

const BuyerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('browse');
  const [products, setProducts] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showFilters, setShowFilters] = useState(window.innerWidth > 768);
  const [selectedFilters, setSelectedFilters] = useState({
    category: '',
    priceRange: '',
    location: '',
    sortBy: 'newest'
  });
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse saved cart from localStorage', e);
      return [];
    }
  });
  const [orders, setOrders] = useState([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [notification, setNotification] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [stkResponse, setStkResponse] = useState(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null); // { orderId, checkoutRequestId }
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [proceedAfterSave, setProceedAfterSave] = useState(false);
  const [lastCheckoutInfo, setLastCheckoutInfo] = useState(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedOrderForReview, setSelectedOrderForReview] = useState(null);
  const [reviewableOrders, setReviewableOrders] = useState([]);

  // Handle window resize for filters
  useEffect(() => {
    const handleResize = () => {
      setShowFilters(window.innerWidth > 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle scroll to show/hide scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cart]);

  // Define fetchReviewableOrders early to avoid use-before-define ESLint warning
  const fetchReviewableOrders = useCallback(async () => {
    if (!user?.buyer_id) return;
    
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch(
        API_CONFIG.ENDPOINTS.REVIEWS.GET_REVIEWABLE_ORDERS(user.buyer_id),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch reviewable orders');
      }

      const data = await response.json();
      setReviewableOrders(data.orders || []);
    } catch (err) {
      console.error('Fetch reviewable orders error:', err);
    }
  }, [user?.buyer_id]);

  // Check if user is logged in and fetch user data
  useEffect(() => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
      navigate('/login');
      return;
    }

    // Fetch user profile from backend
    fetchUserProfile();
  }, [navigate]);

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === 'browse') {
      fetchProducts();
    } else if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'reviews') {
      fetchReviewableOrders();
    } else if (activeTab === 'messages') {
      fetchUnreadMessagesCount();
    }
  }, [activeTab, fetchReviewableOrders]);

  // Fetch unread messages count on mount and periodically
  useEffect(() => {
    fetchUnreadMessagesCount();
    const interval = setInterval(fetchUnreadMessagesCount, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

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

      console.log('Products fetched:', data.products);
      console.log('First product imageUrl:', data.products?.[0]?.imageUrl);
      setProducts(data.products || []);
    } catch (err) {
      setError('Failed to load products. Please try again.');
      console.error('Fetch products error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch(`${API_CONFIG.ENDPOINTS.BUYER.PROFILE}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      if (data.success) {
        setUser(data);
        // Update localStorage with fresh data
        localStorage.setItem('userFirstName', data.firstName);
        localStorage.setItem('userLastName', data.lastName);
        localStorage.setItem('userEmail', data.email);
        localStorage.setItem('userId', data.id);
        localStorage.setItem('buyerId', data.buyerId);
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
      // Fallback to localStorage data
      setUser({
        firstName: localStorage.getItem('userFirstName'),
        lastName: localStorage.getItem('userLastName'),
        email: localStorage.getItem('userEmail'),
        id: localStorage.getItem('userId'),
        buyerId: localStorage.getItem('buyerId')
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    setError('');
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_CONFIG.ENDPOINTS.BUYER.ORDERS}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (err) {
      setError('Failed to load orders. Please try again.');
      console.error('Fetch orders error:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleReviewOrder = (order) => {
    setSelectedOrderForReview(order);
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async (reviewData) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(API_CONFIG.ENDPOINTS.REVIEWS.CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reviewData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit review');
      }

      showNotification('Review submitted successfully!', 'success');
      
      // Refresh reviewable orders
      await fetchReviewableOrders();
      
      setShowReviewModal(false);
      setSelectedOrderForReview(null);
    } catch (err) {
      console.error('Submit review error:', err);
      showNotification(err.message || 'Failed to submit review', 'error');
      throw err;
    }
  };

  const fetchUnreadMessagesCount = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/messages/messages/unread-count`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadMessagesCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch unread messages count:', err);
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

  const handleAddToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
      showNotification(`Updated ${product.name} quantity in cart`, 'success');
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
      showNotification(`${product.name} added to cart!`, 'success');
    }
    animateCartIcon();
  };

  const handleRemoveFromCart = (productId) => {
    const item = cart.find(i => i.id === productId);
    setCart(cart.filter(item => item.id !== productId));
    if (item) {
      showNotification(`${item.name} removed from cart`, 'info');
    }
  };

  const handleUpdateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    setCart(cart.map(item =>
      item.id === productId ? { ...item, quantity: newQuantity } : item
    ));
  };

  // Handle conversation creation - switch to messages tab
  const handleConversationCreated = (conversationId) => {
    showNotification('Conversation started! Switching to messages...', 'success');
    fetchUnreadMessagesCount(); // Refresh unread count
    setTimeout(() => {
      setActiveTab('messages');
      // You can store conversationId in state to auto-select it in Messages component
    }, 1000);
  };

  // Proceed to checkout: create order and trigger M-Pesa STK Push
  const handleProceedToCheckout = async () => {
    if (!cart || cart.length === 0) {
      showNotification('Your cart is empty', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');

      // Prepare items for backend
      const itemsPayload = cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price_per_unit: item.price
      }));

      // Validate availability before attempting to create order
      const availabilityIssues = [];
      await Promise.all(itemsPayload.map(async (it) => {
        try {
          const prodResp = await fetch(`${API_CONFIG.ENDPOINTS.BUYER.PRODUCTS}/${it.product_id}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
          });
          if (!prodResp.ok) return;
          const prod = await prodResp.json().catch(() => ({}));
          const available = prod?.quantity ?? prod?.quantity_available ?? prod?.product?.quantity ?? null;
          const status = prod?.status ?? prod?.product?.status ?? null;
          if (status && status !== 'available') {
            availabilityIssues.push({ id: it.product_id, reason: 'not available' });
          } else if (available != null && available < it.quantity) {
            availabilityIssues.push({ id: it.product_id, reason: 'insufficient', available });
          }
        } catch (e) {
          // ignore individual product check errors
        }
      }));

      if (availabilityIssues.length > 0) {
        // Try to adjust cart (set quantity to available where possible) and inform the user
        let msg = 'Some items are no longer available in the requested quantity:\n';
        const newCart = [...cart];
        availabilityIssues.forEach(issue => {
          const idx = newCart.findIndex(c => c.id === issue.id);
          if (idx !== -1) {
            if (issue.reason === 'insufficient') {
              msg += `• Product ${issue.id}: only ${issue.available} available. Quantity adjusted.\n`;
              newCart[idx] = { ...newCart[idx], quantity: Math.max(1, Math.floor(issue.available)) };
            } else if (issue.reason === 'not available') {
              msg += `• Product ${issue.id}: currently not available and was removed from cart.\n`;
              newCart.splice(idx, 1);
            }
          }
        });
        setCart(newCart);
        setIsLoading(false);
        showNotification(msg, 'error');
        return;
      }

      // Ensure we have a delivery address.
      let deliveryAddress = user?.deliveryAddress || user?.delivery_address || '';
      if (!deliveryAddress) {

        setAddressInput('');
        setProceedAfterSave(true);
        setShowAddressModal(true);
        setIsLoading(false);
        return;
      }

      const orderBody = {
        items: itemsPayload,
        delivery_address: deliveryAddress,
        payment_method: 'M-Pesa',
        notes: ''
      };

      // Create order
      const orderResp = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BUYER.ORDERS.replace(API_CONFIG.BASE_URL, '')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(orderBody)
      });

      if (!orderResp.ok) {
        const err = await orderResp.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create order');
      }

      const orderData = await orderResp.json();
      const orderId = orderData?.order?.id || orderData?.order?.order_id || orderData?.orderId || orderData?.id || null;
      const finalOrderId = orderId || orderData?.orderId || orderData?.id || null;

  // Initiate STK Push
      const amount = Math.round(getTotalCartValue());

      // Normalize phone number to 254 format if possible
      let phone = user?.phoneNumber || user?.phone || '';
      phone = phone?.toString().trim();
      if (phone?.startsWith('0')) phone = '254' + phone.slice(1);

      // store checkout summary for modal
      setLastCheckoutInfo({
        orderId: finalOrderId,
        amount,
        phone,
        itemsCount: itemsPayload.length,
        deliveryAddress
      });

      const mpesaResp = await fetch(`${API_CONFIG.BASE_URL || ''}/api/mpesa/stkpush`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          phone,
          amount,
          orderId: finalOrderId,
          accountReference: `ORDER-${finalOrderId}`,
          transactionDesc: `Payment for order ${finalOrderId}`
        })
      });

      const mpesaData = await mpesaResp.json().catch(() => ({}));

      // Save response and show confirmation modal with details
      setStkResponse(mpesaData || null);
      setShowCheckoutModal(true);

      if (!mpesaResp.ok) {
        showNotification(mpesaData?.message || 'Failed to initiate M-Pesa payment', 'error');
      } else {
        showNotification('Payment prompt sent to your phone. Complete it to finish checkout.', 'success');
        // Do NOT clear cart yet. Mark as pending and poll for payment confirmation.
        const checkoutRequestId = mpesaData?.data?.CheckoutRequestID || mpesaData?.data?.checkoutRequestID || null;
        setPendingOrder({ orderId: finalOrderId, checkoutRequestId });
        // start polling
        startPaymentPolling(finalOrderId);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      showNotification(err.message || 'Checkout failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    setShowFilters(false);
  };

  const getTotalCartItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleViewDetails = (product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const closeProductModal = () => {
    setShowProductModal(false);
    setSelectedProduct(null);
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Payment polling: check order payment status until it becomes paid/failed
  const paymentPollRef = useRef(null);
  const startPaymentPolling = (orderId) => {
    if (!orderId) return;
    // avoid multiple intervals
    if (paymentPollRef.current) return;
    setIsCheckingPayment(true);
    paymentPollRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem('authToken');
        const resp = await fetch(`${API_CONFIG.ENDPOINTS.BUYER.ORDERS}/${orderId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
        });
        if (!resp.ok) return;
        const data = await resp.json().catch(() => ({}));
        const status = data?.order?.paymentStatus || data?.order?.payment_status || null;
        if (status === 'paid') {
          // Payment confirmed
          clearInterval(paymentPollRef.current);
          paymentPollRef.current = null;
          setIsCheckingPayment(false);
          setPendingOrder(null);
          setCart([]); // now clear cart
          showNotification('Payment confirmed — order completed', 'success');
        } else if (status === 'failed' || data?.order?.status === 'cancelled') {
          clearInterval(paymentPollRef.current);
          paymentPollRef.current = null;
          setIsCheckingPayment(false);
          setPendingOrder(null);
          showNotification('Payment failed or order cancelled. Your cart was not cleared.', 'error');
        }
      } catch (e) {
        // ignore poll errors
      }
    }, 5000); // poll every 5s
  };

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      if (paymentPollRef.current) clearInterval(paymentPollRef.current);
    };
  }, []);

  const checkPaymentNow = async () => {
    if (!pendingOrder?.orderId) return;
    setIsCheckingPayment(true);
    try {
      const token = localStorage.getItem('authToken');
      const resp = await fetch(`${API_CONFIG.ENDPOINTS.BUYER.ORDERS}/${pendingOrder.orderId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
      });
      if (!resp.ok) {
        showNotification('Failed to check payment status', 'error');
        setIsCheckingPayment(false);
        return;
      }
      const data = await resp.json().catch(() => ({}));
      const status = data?.order?.paymentStatus || data?.order?.payment_status || null;
      if (status === 'paid') {
        if (paymentPollRef.current) { clearInterval(paymentPollRef.current); paymentPollRef.current = null; }
        setPendingOrder(null);
        setCart([]);
        showNotification('Payment confirmed — order completed', 'success');
      } else if (status === 'failed' || data?.order?.status === 'cancelled') {
        if (paymentPollRef.current) { clearInterval(paymentPollRef.current); paymentPollRef.current = null; }
        setPendingOrder(null);
        showNotification('Payment failed or order cancelled. Your cart was not cleared.', 'error');
      } else {
        showNotification('Payment still pending. Please complete the M-Pesa prompt on your phone.', 'info');
      }
    } catch (e) {
      showNotification('Error checking payment status', 'error');
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const cancelPendingOrder = async () => {
    if (!pendingOrder?.orderId) return;
    const confirm = window.confirm('Cancel this pending order? This will release the reserved stock.');
    if (!confirm) return;
    try {
      const token = localStorage.getItem('authToken');
      const resp = await fetch(`${API_CONFIG.ENDPOINTS.BUYER.ORDERS}/${pendingOrder.orderId}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to cancel order');
      }
      if (paymentPollRef.current) { clearInterval(paymentPollRef.current); paymentPollRef.current = null; }
      setPendingOrder(null);
      showNotification('Order cancelled and stock released', 'success');
    } catch (e) {
      console.error('Cancel order error:', e);
      showNotification(e.message || 'Failed to cancel order', 'error');
    }
  };

  const animateCartIcon = () => {
    const cartButton = document.querySelector('.nav-item[onclick*="cart"]');
    if (cartButton) {
      cartButton.classList.add('pulse');
      setTimeout(() => cartButton.classList.remove('pulse'), 600);
    }
  };

  // Address modal helpers
  const openAddressModal = (prefill = '') => {
    setAddressInput(prefill || '');
    setShowAddressModal(true);
  };

  const closeAddressModal = () => {
    setShowAddressModal(false);
    setProceedAfterSave(false);
  };

  const handleSaveAddress = async () => {
    if (!addressInput || addressInput.trim() === '') {
      showNotification('Please enter a valid delivery address', 'error');
      return;
    }

    setIsSavingAddress(true);
    try {
      const token = localStorage.getItem('authToken');
      const resp = await fetch(`${API_CONFIG.ENDPOINTS.BUYER.PROFILE}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ deliveryAddress: addressInput.trim() })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to save address');
      }

      const data = await resp.json();
      // Update user state and localStorage
      setUser(prev => ({ ...(prev || {}), deliveryAddress: data.deliveryAddress || addressInput.trim() }));
      localStorage.setItem('deliveryAddress', data.deliveryAddress || addressInput.trim());

      showNotification('Delivery address saved', 'success');
      setShowAddressModal(false);

      // If checkout flow triggered the modal, continue checkout
      if (proceedAfterSave) {
        setProceedAfterSave(false);
        // Continue the checkout process automatically
        setTimeout(() => {
          handleProceedToCheckout();
        }, 200);
      }
    } catch (err) {
      console.error('Save address error:', err);
      showNotification(err.message || 'Failed to save address', 'error');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const getTotalCartValue = () => {
    return cart.reduce((total, item) => total + (parseFloat(item.price || 0) * item.quantity), 0);
  };

  return (
    <div className="buyer-dashboard">
      {/* Mobile Overlay */}
      <div 
        className={`mobile-overlay ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>

      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <button className="hamburger-menu" onClick={toggleMobileMenu} aria-label="Toggle menu">
              <span className={`hamburger-icon ${isMobileMenuOpen ? 'open' : ''}`}></span>
            </button>
            <div className="logo-section" onClick={() => setActiveTab('browse')}>
              <div className="logo-icon">🌾</div>
              <div className="logo-text">
                <h1 className="logo">KilimoSmart</h1>
                <p className="tagline">Fresh from Farm to You</p>
              </div>
            </div>
          </div>
          
          <div className="header-center">
            {/* Role Switcher */}
            <RoleSwitcher />
            
            <div className="quick-stats">
              <div className="stat-item" onClick={() => setActiveTab('browse')} title="Available Products">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
                </svg>
                <span className="stat-value">{products.length}</span>
                <span className="stat-label">Products</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item" onClick={() => setActiveTab('orders')} title="My Orders">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                </svg>
                <span className="stat-value">{orders.length}</span>
                <span className="stat-label">Orders</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item" onClick={() => setActiveTab('cart')} title="Cart Total">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1"/>
                  <circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                <span className="stat-value">KES {getTotalCartValue().toFixed(0)}</span>
                <span className="stat-label">Cart Value</span>
              </div>
            </div>
          </div>
          
          <div className="header-right">
            <div className="header-actions">
              <button 
                className="header-cart-btn" 
                onClick={() => setActiveTab('cart')}
                aria-label="Shopping cart"
                title="View Cart"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1"/>
                  <circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                {getTotalCartItems() > 0 && (
                  <span className="cart-badge">{getTotalCartItems()}</span>
                )}
              </button>
              
              <button 
                className="header-notification-btn"
                title="Notifications"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {orders.length > 0 && (
                  <span className="notification-badge">{orders.length}</span>
                )}
              </button>
              
              <div className="user-menu">
                <button className="user-profile-btn" onClick={() => setActiveTab('profile')} title="View Profile">
                  <div className="user-avatar">
                    {user?.firstName?.[0] || 'U'}
                  </div>
                  <div className="user-info">
                    <span className="user-greeting">Hello,</span>
                    <span className="user-name">{user?.firstName || 'User'}</span>
                  </div>
                </button>
              </div>
              
              <button className="logout-btn" onClick={handleLogout} title="Logout">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Sidebar Navigation */}
        <aside className={`dashboard-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <nav className="nav-menu">
            <button
              className={`nav-item ${activeTab === 'browse' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('browse');
                setIsMobileMenuOpen(false);
              }}
            >
              <svg className="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
              </svg>
              <span>Browse</span>
              {activeTab === 'browse' && <div className="active-indicator"></div>}
            </button>
            <button
              className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('orders');
                setIsMobileMenuOpen(false);
              }}
            >
              <svg className="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                <path d="M9 14l2 2 4-4"/>
              </svg>
              <span>Orders</span>
              {orders.length > 0 && <span className="nav-badge">{orders.length}</span>}
              {activeTab === 'orders' && <div className="active-indicator"></div>}
            </button>
            <button
              className={`nav-item ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('reviews');
                setIsMobileMenuOpen(false);
              }}
            >
              <svg className="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span>Reviews</span>
              {activeTab === 'reviews' && <div className="active-indicator"></div>}
            </button>
            <button
              className={`nav-item ${activeTab === 'cart' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('cart');
                setIsMobileMenuOpen(false);
              }}
            >
              <svg className="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              <span>Cart</span>
              {getTotalCartItems() > 0 && <span className="nav-badge">{getTotalCartItems()}</span>}
              {activeTab === 'cart' && <div className="active-indicator"></div>}
            </button>
            <button
              className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('messages');
                setIsMobileMenuOpen(false);
              }}
            >
              <svg className="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span>Messages</span>
              {unreadMessagesCount > 0 && <span className="nav-badge">{unreadMessagesCount}</span>}
              {activeTab === 'messages' && <div className="active-indicator"></div>}
            </button>
            <button
              className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('profile');
                setIsMobileMenuOpen(false);
              }}
            >
              <svg className="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>Profile</span>
              {activeTab === 'profile' && <div className="active-indicator"></div>}
            </button>
          </nav>

          {activeTab === 'browse' && (
            <>
              <button 
                className="filter-toggle-btn mobile-only"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? 'Hide Filters ▼' : 'Show Filters ▲'}
              </button>
              <div className={`filter-panel ${showFilters ? 'show' : ''}`}>
                <div className="filter-header">
                  <h3>Filters</h3>
                  <button 
                    className="close-filters-btn mobile-only"
                    onClick={() => setShowFilters(false)}
                  >
                    ×
                  </button>
                </div>
              <div className="filter-group">
                <label>Category</label>
                <select
                  value={selectedFilters.category}
                  onChange={(e) => setSelectedFilters({...selectedFilters, category: e.target.value})}
                >
                  <option value="">All Categories</option>
                  <option value="cereals">Cereals</option>
                  <option value="legumes">Legumes</option>
                  <option value="fruits">Fruits</option>
                  <option value="vegetables">Vegetables</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label>Price Range</label>
                <select
                  value={selectedFilters.priceRange}
                  onChange={(e) => setSelectedFilters({...selectedFilters, priceRange: e.target.value})}
                >
                  <option value="">All Prices</option>
                  <option value="0-1000">Under KES 1,000</option>
                  <option value="1000-5000">KES 1,000 - 5,000</option>
                  <option value="5000+">Over KES 5,000</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Location</label>
                <select
                  value={selectedFilters.location}
                  onChange={(e) => setSelectedFilters({...selectedFilters, location: e.target.value})}
                >
                  <option value="">All Locations</option>
                  <option value="nairobi">Nairobi</option>
                  <option value="mombasa">Mombasa</option>
                  <option value="kisumu">Kisumu</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Sort By</label>
                <select
                  value={selectedFilters.sortBy}
                  onChange={(e) => setSelectedFilters({...selectedFilters, sortBy: e.target.value})}
                >
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>

              <button className="apply-filters-btn" onClick={applyFilters}>
                Apply Filters
              </button>
            </div>
          </>
          )}
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
                    <option value="cereals">Cereals</option>
                    <option value="legumes">Legumes</option>
                    <option value="fruits">Fruits</option>
                    <option value="vegetables">Vegetables</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* View Mode Toggle and Products Count */}
              <div className="products-header-controls">
                {!isLoading && !error && (
                  <div className="products-count-badge">
                    {filteredProducts.length} {filteredProducts.length === 1 ? 'Product' : 'Products'} Found
                  </div>
                )}
                <div className="view-mode-toggle">
                  <button
                    className={viewMode === 'grid' ? 'active' : ''}
                    onClick={() => setViewMode('grid')}
                    aria-label="Grid view"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <rect x="2" y="2" width="7" height="7" />
                      <rect x="11" y="2" width="7" height="7" />
                      <rect x="2" y="11" width="7" height="7" />
                      <rect x="11" y="11" width="7" height="7" />
                    </svg>
                  </button>
                  <button
                    className={viewMode === 'list' ? 'active' : ''}
                    onClick={() => setViewMode('list')}
                    aria-label="List view"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <rect x="2" y="3" width="16" height="2" />
                      <rect x="2" y="9" width="16" height="2" />
                      <rect x="2" y="15" width="16" height="2" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && <div className="error-message">{error}</div>}

              {/* Loading State */}
              {isLoading && <div className="loading">Loading products...</div>}

              {/* Products Grid */}
              {isLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Loading fresh products...</p>
                </div>
              ) : error ? (
                <div className="error-container">
                  <p className="error-message">😕 {error}</p>
                  <button className="retry-btn" onClick={fetchProducts}>
                    Try Again
                  </button>
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className={`products-grid ${viewMode}-view`}>
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="product-card">
                      <div className="product-image">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name} 
                            className="product-img"
                            onError={(e) => {
                              console.error('Image failed to load:', product.imageUrl);
                              e.target.style.display = 'none';
                              e.target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`image-placeholder ${product.imageUrl ? 'hidden' : ''}`}>
                          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M12 2v20M2 12h20"/>
                            <circle cx="12" cy="12" r="10"/>
                          </svg>
                          <span>{product.category || 'Product'}</span>
                        </div>
                        {product.isOrganic && (
                          <span className="organic-badge">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                            Organic
                          </span>
                        )}
                        {product.quantity < 5 && product.quantity > 0 && (
                          <span className="low-stock-badge">Only {product.quantity} left!</span>
                        )}
                      </div>
                      <div className="product-info">
                        <div className="product-header">
                          <h3 className="product-name">{product.name}</h3>
                          <span className="farmer-info">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                              <circle cx="12" cy="7" r="4"/>
                            </svg>
                            {product.farmerName || 'Local Farmer'}
                          </span>
                        </div>
                        <p className="product-category">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                            <line x1="7" y1="7" x2="7.01" y2="7"/>
                          </svg>
                          {product.category}
                        </p>
                        <p className="product-description">{product.description}</p>
                        <div className="product-details">
                          <div className="stock-info">
                            <span className="quantity">Available: {product.quantity} {product.unit}</span>
                            <span className="location">📍 {product.location || 'Local'}</span>
                          </div>
                          <div className="price-section">
                            <span className="price">KES {parseFloat(product.price || 0).toFixed(2)}</span>
                            <span className="per-unit"> per {product.unit}</span>
                          </div>
                        </div>
                        <div className="action-buttons">
                          <button 
                            className="add-to-cart-btn"
                            onClick={() => handleAddToCart(product)}
                            disabled={product.quantity === 0}
                          >
                            {product.quantity === 0 ? 'Out of Stock' : 'Add to Cart 🛒'}
                          </button>
                          <button 
                            className="view-details-btn"
                            onClick={() => handleViewDetails(product)}
                          >
                            View Details
                          </button>
                          <ContactFarmerButton
                            farmerId={product.farmerId}
                            farmerName={product.farmerName}
                            productName={product.name}
                            onConversationCreated={handleConversationCreated}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-products">
                  <div className="no-products-content">
                    <span className="no-products-icon">🔍</span>
                    <h3>No products found</h3>
                    <p>Try adjusting your search or filters to find what you're looking for.</p>
                    <button 
                      className="clear-filters-btn"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedFilters({
                          category: '',
                          priceRange: '',
                          location: '',
                          sortBy: 'newest'
                        });
                      }}
                    >
                      Clear All Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="tab-content orders-tab">
              <div className="tab-header">
                <h2>📦 My Orders</h2>
                <p className="subtitle">View and track your order history</p>
              </div>
              
              {isLoadingOrders ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Loading your orders...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="placeholder-content">
                  <div className="no-orders-content">
                    <span className="no-orders-icon">📦</span>
                    <h3>No orders yet</h3>
                    <p>Start by browsing and adding products to your cart!</p>
                    <button 
                      className="browse-btn"
                      onClick={() => setActiveTab('browse')}
                    >
                      Browse Products 🌱
                    </button>
                  </div>
                </div>
              ) : (
                <div className="orders-list">
                  {orders.map((order) => (
                    <div key={order.id} className="order-card">
                      <div className="order-header">
                        <div>
                          <h3>Order #{order.id}</h3>
                          <p className="order-date">
                            {new Date(order.orderDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <span className={`order-status status-${order.status}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="order-details">
                        <p><strong>Total Amount:</strong> KES {parseFloat(order.totalAmount).toFixed(2)}</p>
                        <p><strong>Delivery Address:</strong> {order.deliveryAddress}</p>
                        {order.deliveryDate && (
                          <p><strong>Delivery Date:</strong> {new Date(order.deliveryDate).toLocaleDateString()}</p>
                        )}
                      </div>
                      {order.items && order.items.length > 0 && (
                        <div className="order-items">
                          <h4>Items:</h4>
                          <ul>
                            {order.items.map((item, idx) => (
                              <li key={idx}>
                                {item.productName} - {item.quantity} {item.unit} @ KES {parseFloat(item.price).toFixed(2)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="tab-content reviews-tab">
              <div className="tab-header">
                <h2>⭐ Reviews & Ratings</h2>
                <p className="subtitle">Share your experience and help other buyers</p>
              </div>

              {reviewableOrders.length === 0 ? (
                <div className="placeholder-content">
                  <div className="no-reviews-content">
                    <span className="no-reviews-icon">⭐</span>
                    <h3>No orders to review</h3>
                    <p>Complete your orders to leave reviews for farmers</p>
                    <button 
                      className="browse-btn"
                      onClick={() => setActiveTab('orders')}
                    >
                      View Orders 📦
                    </button>
                  </div>
                </div>
              ) : (
                <div className="reviewable-orders-list">
                  {reviewableOrders.map((order) => (
                    <div key={order.orderId} className="reviewable-order-card">
                      <div className="order-header">
                        <div>
                          <h3>Order #{order.orderId}</h3>
                          <p className="order-date">
                            {new Date(order.orderDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <span className={`order-status status-${order.status}`}>
                          {order.status}
                        </span>
                      </div>

                      <div className="farmer-info-card">
                        <div className="farmer-avatar">
                          {order.farmerName?.charAt(0) || 'F'}
                        </div>
                        <div className="farmer-details">
                          <h4>{order.farmerName}</h4>
                          {order.farmerRating > 0 && (
                            <div className="farmer-rating-display">
                              <span className="rating-stars">
                                {'★'.repeat(Math.floor(order.farmerRating))}
                                {'☆'.repeat(5 - Math.floor(order.farmerRating))}
                              </span>
                              <span className="rating-value">{order.farmerRating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="order-amount">
                        <strong>Total:</strong> KES {parseFloat(order.totalAmount).toFixed(2)}
                      </div>

                      {order.hasReview ? (
                        <div className="review-status">
                          <span className="reviewed-badge">✓ Reviewed</span>
                          {order.reviewRating && (
                            <span className="your-rating">
                              Your rating: {order.reviewRating.toFixed(1)} ★
                            </span>
                          )}
                        </div>
                      ) : (
                        <button 
                          className="write-review-btn"
                          onClick={() => handleReviewOrder(order)}
                        >
                          ✍️ Write a Review
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div className="tab-content messages-tab">
              <Messages />
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="tab-content profile-tab">
              <div className="tab-header">
                <h2>👤 My Profile</h2>
                <p className="subtitle">Manage your account information</p>
              </div>
              
              {isLoadingProfile ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Loading profile...</p>
                </div>
              ) : (
                <div className="profile-container">
                  <div className="profile-header-card">
                    <div className="profile-avatar-large">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                    <div className="profile-header-info">
                      <h3>{user?.firstName} {user?.lastName}</h3>
                      <p className="profile-email">{user?.email}</p>
                      <span className="member-badge">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                        Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short'
                        }) : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="profile-sections">
                    <div className="profile-section">
                      <h4 className="section-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                        Personal Information
                      </h4>
                      <div className="profile-grid">
                        <div className="profile-field">
                          <label>First Name</label>
                          <p>{user?.firstName || 'N/A'}</p>
                        </div>
                        <div className="profile-field">
                          <label>Last Name</label>
                          <p>{user?.lastName || 'N/A'}</p>
                        </div>
                        <div className="profile-field">
                          <label>Email Address</label>
                          <p>{user?.email || 'N/A'}</p>
                        </div>
                        <div className="profile-field">
                          <label>Phone Number</label>
                          <p>{user?.phoneNumber || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="profile-section">
                      <h4 className="section-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        Delivery Information
                      </h4>
                      <div className="profile-grid">
                        <div className="profile-field full-width">
                          <label>Delivery Address</label>
                          <div className="profile-address-row">
                            <p className="profile-address-text">{user?.deliveryAddress || 'Not provided'}</p>
                            <button className="edit-address-btn" onClick={() => openAddressModal(user?.deliveryAddress || '')} title="Edit delivery address">Edit</button>
                          </div>
                        </div>
                        <div className="profile-field">
                          <label>City/Town</label>
                          <p>{user?.location || 'N/A'}</p>
                        </div>
                        <div className="profile-field">
                          <label>County</label>
                          <p>{user?.county || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="profile-stats">
                      <div className="stat-card">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="9" cy="21" r="1"/>
                          <circle cx="20" cy="21" r="1"/>
                          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                        </svg>
                        <div className="stat-info">
                          <p className="stat-value">{cart.length}</p>
                          <p className="stat-label">Items in Cart</p>
                        </div>
                      </div>
                      <div className="stat-card">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                        </svg>
                        <div className="stat-info">
                          <p className="stat-value">{orders.length}</p>
                          <p className="stat-label">Total Orders</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cart Tab */}
          {activeTab === 'cart' && (
            <div className="tab-content cart-tab">
              <div className="tab-header">
                <h2>🛒 Shopping Cart</h2>
              </div>
              {/* Pending order banner */}
              {pendingOrder && (
                <div className="pending-banner">
                  <p>
                    You have a pending payment for order <strong>#{pendingOrder.orderId}</strong>. Your items are reserved for a short time.
                    Use "Check Payment Now" to verify or "Cancel Order" to release the reservation.
                  </p>
                  <div className="pending-actions">
                    <button className="check-payment-btn" onClick={checkPaymentNow} disabled={isCheckingPayment}>{isCheckingPayment ? 'Checking...' : 'Check Payment Now'}</button>
                    <button className="cancel-order-btn" onClick={cancelPendingOrder}>Cancel Order</button>
                  </div>
                </div>
              )}
              {cart.length === 0 ? (
                <div className="placeholder-content">
                  <p>Your cart is empty.</p>
                  <button 
                    className="browse-btn"
                    onClick={() => setActiveTab('browse')}
                  >
                    Continue Shopping 🌱
                  </button>
                </div>
              ) : (
                <div className="cart-content">
                  <div className="cart-items">
                    {cart.map((item) => (
                      <div key={item.id} className="cart-item">
                        <div className="cart-item-image">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} />
                          ) : (
                            <div className="image-placeholder">
                              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M12 2v20M2 12h20"/>
                                <circle cx="12" cy="12" r="10"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="cart-item-details">
                          <h3>{item.name}</h3>
                          <p className="item-category">{item.category}</p>
                          <p className="item-price">KES {(parseFloat(item.price || 0) * item.quantity).toFixed(2)}</p>
                          <div className="quantity-controls">
                            <button onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} aria-label="Decrease quantity">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="5" y1="12" x2="19" y2="12"/>
                              </svg>
                            </button>
                            <span>{item.quantity} {item.unit || 'units'}</span>
                            <button onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} aria-label="Increase quantity">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19"/>
                                <line x1="5" y1="12" x2="19" y2="12"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                        <button 
                          className="remove-item-btn"
                          onClick={() => handleRemoveFromCart(item.id)}
                          aria-label="Remove item"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="cart-summary">
                    <h3>Order Summary</h3>
                    <div className="summary-row">
                      <span>Subtotal</span>
                      <span>KES {getTotalCartValue().toFixed(2)}</span>
                    </div>
                    <div className="summary-row">
                      <span>Delivery Fee</span>
                      <span>Calculated at checkout</span>
                    </div>
                    <button 
                      className="checkout-btn"
                      onClick={handleProceedToCheckout}
                      disabled={isLoading || cart.length === 0 || !!pendingOrder}
                    >
                      {pendingOrder ? 'Payment Pending...' : (isLoading ? 'Processing...' : 'Proceed to Checkout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>&copy; 2025 KilimoSmart. Connecting farmers with buyers.</p>
      </footer>

      {/* Notification Toast */}
      {notification && (
        <div className={`notification-toast ${notification.type}`}>
          <span className="notification-icon">
            {notification.type === 'success' ? '✓' : notification.type === 'error' ? '✕' : 'ℹ'}
          </span>
          <span className="notification-message">{notification.message}</span>
        </div>
      )}

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button 
          className="scroll-to-top"
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          <span>↑</span>
        </button>
      )}

      {/* Product Details Modal */}
      {showProductModal && selectedProduct && (
        <div className="modal-overlay" onClick={closeProductModal}>
          <div className="product-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={closeProductModal}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            <div className="modal-content">
              <div className="modal-image-section">
                {selectedProduct.imageUrl ? (
                  <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="modal-product-image" />
                ) : (
                  <div className="modal-image-placeholder">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 2v20M2 12h20"/>
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                    <span>{selectedProduct.category || 'Product'}</span>
                  </div>
                )}
              </div>
              
              <div className="modal-info-section">
                <div className="modal-header">
                  <h2>{selectedProduct.name}</h2>
                  {selectedProduct.isOrganic && (
                    <span className="organic-badge">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      Organic
                    </span>
                  )}
                </div>
                
                <div className="modal-price-section">
                  <span className="modal-price">KES {parseFloat(selectedProduct.price || 0).toFixed(2)}</span>
                  <span className="modal-unit">per {selectedProduct.unit}</span>
                </div>

                <div className="modal-details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Category:</span>
                    <span className="detail-value">{selectedProduct.category || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Available Quantity:</span>
                    <span className="detail-value">{selectedProduct.quantity} {selectedProduct.unit}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Farmer:</span>
                    <span className="detail-value">{selectedProduct.farmerName || 'Local Farmer'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Location:</span>
                    <span className="detail-value">📍 {selectedProduct.location || 'Local'}</span>
                  </div>
                  {selectedProduct.harvestDate && (
                    <div className="detail-item">
                      <span className="detail-label">Harvest Date:</span>
                      <span className="detail-value">{new Date(selectedProduct.harvestDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedProduct.farmerPhone && (
                    <div className="detail-item">
                      <span className="detail-label">Contact:</span>
                      <span className="detail-value">{selectedProduct.farmerPhone}</span>
                    </div>
                  )}
                </div>

                {selectedProduct.description && (
                  <div className="modal-description">
                    <h4>Description</h4>
                    <p>{selectedProduct.description}</p>
                  </div>
                )}

                <div className="modal-actions">
                  <button 
                    className="modal-add-to-cart-btn"
                    onClick={() => {
                      handleAddToCart(selectedProduct);
                      closeProductModal();
                    }}
                    disabled={selectedProduct.quantity === 0}
                  >
                    {selectedProduct.quantity === 0 ? 'Out of Stock' : 'Add to Cart 🛒'}
                  </button>
                  <ContactFarmerButton
                    farmerId={selectedProduct.farmerId}
                    farmerName={selectedProduct.farmerName}
                    productName={selectedProduct.name}
                    onConversationCreated={(conversationId) => {
                      handleConversationCreated(conversationId);
                      closeProductModal();
                    }}
                  />
                  <button className="modal-cancel-btn" onClick={closeProductModal}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Address entry modal (opens when buyer has no saved delivery address) */}
      {showAddressModal && (
        <div className="modal-overlay" onClick={closeAddressModal}>
          <div className="product-modal address-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="address-modal-title">
            <button className="modal-close-btn" onClick={closeAddressModal}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <div className="modal-content">
              <div className="modal-header">
                <h2 id="address-modal-title">Enter delivery address</h2>
                <p className="subtitle">Save this address to your profile so future checkouts won't ask again.</p>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="deliveryAddress">Delivery address</label>
                  <textarea
                    id="deliveryAddress"
                    rows={4}
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    placeholder="Enter house number, street, estate/village, nearest landmark"
                    className="address-textarea"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button className="modal-add-to-cart-btn" onClick={handleSaveAddress} disabled={isSavingAddress}>
                  {isSavingAddress ? 'Saving...' : 'Save & Continue'}
                </button>
                <button className="modal-cancel-btn" onClick={closeAddressModal}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Confirmation Modal (STK Push details) */}
      {showCheckoutModal && (
        <div className="modal-overlay" onClick={() => setShowCheckoutModal(false)}>
          <div className="product-modal checkout-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="checkout-modal-title">
            <button className="modal-close-btn" onClick={() => setShowCheckoutModal(false)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <div className="modal-content">
              <div className="modal-header">
                <h2 id="checkout-modal-title">Checkout initiated</h2>
                <p className="subtitle">An M-Pesa payment prompt was sent to your phone (if available). Below are the request details.</p>
                {pendingOrder && (
                  <div style={{
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffc107',
                    borderRadius: '8px',
                    padding: '12px',
                    marginTop: '12px',
                    color: '#856404',
                    fontSize: '0.9rem'
                  }}>
                    <strong>⚠️ Important:</strong> Your cart items will remain until payment is confirmed. Complete the M-Pesa payment to finalize your order.
                  </div>
                )}
              </div>

              <div className="modal-body">
                <div className="detail-item">
                  <span className="detail-label">Order ID</span>
                  <span className="detail-value">{lastCheckoutInfo?.orderId || stkResponse?.orderId || '—'}</span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Amount</span>
                  <span className="detail-value">KES { (lastCheckoutInfo?.amount ?? stkResponse?.amount ?? 0).toFixed ? (lastCheckoutInfo?.amount ?? stkResponse?.amount ?? 0).toFixed(0) : (lastCheckoutInfo?.amount ?? stkResponse?.amount ?? 0) }</span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Items</span>
                  <span className="detail-value">{lastCheckoutInfo?.itemsCount ?? cart.length} items</span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Delivery Address</span>
                  <span className="detail-value">{lastCheckoutInfo?.deliveryAddress || user?.deliveryAddress || '—'}</span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Phone</span>
                  <span className="detail-value">{(lastCheckoutInfo?.phone || stkResponse?.phone || user?.phoneNumber || '—').toString().replace(/(\d{3})(\d{4})(\d{3})/, '$1****$3')}</span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Payment Status</span>
                  <span className="detail-value">{pendingOrder ? 'Pending (awaiting confirmation)' : ((stkResponse?.ResponseCode ?? stkResponse?.responseCode) ? (stkResponse?.ResponseCode ?? stkResponse?.responseCode) : 'Pending')}</span>
                </div>

                {stkResponse?.CustomerMessage && (
                  <div className="detail-item">
                    <span className="detail-label">Customer Message</span>
                    <span className="detail-value">{stkResponse.CustomerMessage}</span>
                  </div>
                )}

                <div className="detail-item">
                  <span className="detail-label">Requested At</span>
                  <span className="detail-value">{new Date().toLocaleString()}</span>
                </div>

                <div className="detail-item" style={{borderBottom: 'none'}}>
                  <span className="detail-label">Next Steps</span>
                  <span className="detail-value">Complete the M-Pesa prompt on your phone. If you don't receive it within 60 seconds, check your network or try again. Payment updates will appear in Orders.</span>
                </div>
              </div>
                
              <div className="modal-actions">
                {pendingOrder ? (
                  <>
                    <button className="modal-add-to-cart-btn" onClick={() => { checkPaymentNow(); }} disabled={isCheckingPayment}>
                      {isCheckingPayment ? 'Checking...' : 'Check Payment Now'}
                    </button>
                    <button className="modal-cancel-btn" onClick={() => { cancelPendingOrder(); }} disabled={isCheckingPayment}>
                      Cancel Order
                    </button>
                  </>
                ) : (
                  <>
                    <button className="modal-cancel-btn" onClick={() => setShowCheckoutModal(false)}>Close</button>
                    <button className="modal-add-to-cart-btn" onClick={() => { setShowCheckoutModal(false); navigate('/orders'); }}>View Orders</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedOrderForReview && (
        <ReviewModal
          order={selectedOrderForReview}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedOrderForReview(null);
          }}
          onSubmit={handleReviewSubmit}
        />
      )}
    </div>
  );
};

export default BuyerDashboard;
