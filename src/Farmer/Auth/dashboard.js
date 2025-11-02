import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CameraCapture from '../../components/CameraCapture';
import { API_CONFIG } from '../../config/api';
import { useLocation } from '../../hooks/useLocation';
import './Styling/auth.css';
import './Styling/dashboard.css';

const FarmerDashboard = () => {
    const navigate = useNavigate();
    const { getLocation } = useLocation();
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [farmerData, setFarmerData] = useState(null);
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [payments, setPayments] = useState([]);
    const [stats, setStats] = useState({
        totalProducts: 0,
        activeListings: 0,
        totalOrders: 0,
        pendingOrders: 0,
        totalRevenue: 0,
        reputationScore: 0
    });

    // Modal states
    const [showProductModal, setShowProductModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success'); // success, error, info
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // Camera and photo states
    const [showCamera, setShowCamera] = useState(false);
    const [productPhotos, setProductPhotos] = useState([]);
    
    // Device detection
    const [isMobile, setIsMobile] = useState(false);

    // Product form state
    const [productForm, setProductForm] = useState({
        productName: '',
        category: '',
        quantity: '',
        unit: 'kg',
        pricePerUnit: '',
        description: '',
        isOrganic: false,
        harvestDate: '',
        expiryDate: '',
        isPreorder: false,
        expectedHarvestDate: '',
        preorderDeadline: '',
        preorderQuantity: '',
        minPreorderQuantity: '',
        isPerishable: false,
        estimatedShelfLifeDays: ''
    });

    // Detect mobile device on component mount (ONLY by user agent, not screen size)
    useEffect(() => {
        const checkIfMobile = () => {
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            // Check ONLY for actual mobile devices by user agent (cannot be faked by resizing)
            const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
            // Also check for touch support as additional verification
            const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            
            // Device must be BOTH mobile user agent AND have touch support
            setIsMobile(isMobileDevice && hasTouchScreen);
        };
        
        checkIfMobile();
        // No need to listen for resize since user agent doesn't change
    }, []);

    const fetchDashboardData = useCallback(async () => {
        try {
            // Check both localStorage and sessionStorage for token
            const token = localStorage.getItem('authToken') || 
                        sessionStorage.getItem('authToken') || 
                        localStorage.getItem('token') ||
                        sessionStorage.getItem('token');

            if (!token) {
                console.log('❌ No token found in localStorage or sessionStorage');
                showNotificationMessage('Please login to continue', 'error');
                navigate('/loginF');
                return;
            }

            console.log('🔑 Token found:', token ? 'Yes' : 'No');

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            console.log('📡 Fetching dashboard data from backend...');

            // Fetch farmer's products, orders, payments, and profile in parallel
            const [productsResponse, ordersResponse, paymentsResponse, profileResponse] = await Promise.all([
                fetch(API_CONFIG.ENDPOINTS.FARMER.PRODUCTS, { headers }),
                fetch(API_CONFIG.ENDPOINTS.FARMER.ORDERS, { headers }),
                fetch(API_CONFIG.ENDPOINTS.FARMER.PAYMENTS, { headers }),
                fetch(API_CONFIG.ENDPOINTS.FARMER.PROFILE, { headers })
            ]);

            // Log responses for debugging
            console.log('API Responses:', {
                products: productsResponse.status,
                orders: ordersResponse.status,
                payments: paymentsResponse.status,
                profile: profileResponse.status
            });

            if (!productsResponse.ok || !ordersResponse.ok || !paymentsResponse.ok || !profileResponse.ok) {
                const errorDetails = {
                    products: !productsResponse.ok ? await productsResponse.text() : 'OK',
                    orders: !ordersResponse.ok ? await ordersResponse.text() : 'OK',
                    payments: !paymentsResponse.ok ? await paymentsResponse.text() : 'OK',
                    profile: !profileResponse.ok ? await profileResponse.text() : 'OK'
                };
                console.error('API Error Details:', errorDetails);
                throw new Error('Failed to fetch dashboard data');
            }

            const productsData = await productsResponse.json();
            const ordersData = await ordersResponse.json();
            const paymentsData = await paymentsResponse.json();
            const profileData = await profileResponse.json();

            // Extract data from responses
            const fetchedProducts = productsData.products || [];
            const fetchedOrders = ordersData.orders || [];
            const fetchedPayments = paymentsData.payments || [];
            const fetchedProfile = profileData.profile || {};

            // Calculate statistics from the fetched data
            const activeProducts = fetchedProducts.filter(p => p.status === 'available');
            const pendingOrders = fetchedOrders.filter(o => o.status === 'pending');
            const totalRevenue = fetchedPayments
                .reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);

            // Set farmer data from API profile response
            setFarmerData({
                firstName: fetchedProfile.firstName || '',
                lastName: fetchedProfile.lastName || '',
                email: fetchedProfile.email || '',
                phoneNumber: fetchedProfile.phoneNumber || '',
                farmName: fetchedProfile.farmName || 'My Farm',
                farmType: fetchedProfile.farmType || 'Not specified',
                farmSize: fetchedProfile.farmSize ? `${fetchedProfile.farmSize} acres` : 'Not specified',
                location: fetchedProfile.county 
                    ? `${fetchedProfile.county}${fetchedProfile.subcounty ? ', ' + fetchedProfile.subcounty : ''}`
                    : 'Not specified',
                addressDescription: fetchedProfile.addressDescription || '',
                latitude: fetchedProfile.latitude || null,
                longitude: fetchedProfile.longitude || null,
                reputationScore: fetchedProfile.reputationScore || 0,
                isVerified: fetchedProfile.isVerified || false,
                profilePhoto: fetchedProfile.profilePhoto || null,
                totalSales: fetchedProfile.totalSales || 0,
                emailVerified: fetchedProfile.emailVerified || false
            });

            // Set statistics
            setStats({
                totalProducts: fetchedProducts.length,
                activeListings: activeProducts.length,
                totalOrders: fetchedOrders.length,
                pendingOrders: pendingOrders.length,
                totalRevenue: totalRevenue,
                reputationScore: fetchedProfile.reputationScore || 0
            });

            // Format products data
            const formattedProducts = fetchedProducts.map(product => ({
                id: product.id,
                name: product.name,
                category: product.category,
                quantity: parseFloat(product.quantity || 0),
                unit: product.unit || 'kg',
                pricePerUnit: parseFloat(product.price || 0),
                status: product.status || 'available',
                harvestDate: product.harvestDate,
                expiryDate: product.expiryDate,
                isOrganic: product.isOrganic || false,
                description: product.description || ''
            }));

            // Format orders data
            const formattedOrders = fetchedOrders.map(order => ({
                id: order.id,
                buyer: order.buyerName || 'Unknown Buyer',
                buyerPhone: order.buyerPhone,
                itemCount: order.itemCount || 1,
                amount: parseFloat(order.amount || 0),
                status: order.status || 'pending',
                date: order.date,
                deliveryAddress: order.deliveryAddress || '',
                deliveryDate: order.deliveryDate,
                paymentStatus: order.paymentStatus || 'pending',
                paymentMethod: order.paymentMethod || 'M-Pesa'
            }));

            setProducts(formattedProducts);
            setOrders(formattedOrders);
            setPayments(fetchedPayments);
            setLoading(false);

        } catch (error) {
            console.error('❌ Error fetching dashboard data:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            // More specific error messages
            let errorMessage = 'Failed to load dashboard data. Please try again.';
            let shouldRedirectToLogin = false;
            
            if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
                errorMessage = '⚠️ Cannot connect to backend server. Please check your internet connection.';
            } else if (error.message.includes('401') || error.message.includes('Unauthorized') || error.message.includes('Token expired')) {
                errorMessage = '🔒 Your session has expired. Please login again.';
                shouldRedirectToLogin = true;
            } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
                errorMessage = '⛔ Access denied. You do not have permission to access farmer resources.';
            }
            
            showNotificationMessage(errorMessage, 'error');
            setLoading(false);
            
            // If authentication error or token expired, clear tokens and redirect to login
            if (shouldRedirectToLogin) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('token');
                localStorage.removeItem('userData');
                sessionStorage.removeItem('authToken');
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('userData');
                
                setTimeout(() => {
                    navigate('/loginF');
                }, 2000); // Give user time to see the message
            }
        }
    }, [navigate]); // Add navigate as dependency

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const showNotificationMessage = (message, type = 'success') => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 4000);
    };

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            // Clear both localStorage and sessionStorage
            localStorage.removeItem('token');
            localStorage.removeItem('userType');
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('userType');
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('userData');
            
            showNotificationMessage('Logged out successfully', 'info');
            setTimeout(() => navigate('/loginF'), 1000);
        }
    };

    const handleProductFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        // Auto-set perishability based on category
        if (name === 'category') {
            const perishableCategories = ['Vegetables', 'Fruits'];
            const isPerishable = perishableCategories.includes(value);
            setProductForm(prev => ({
                ...prev,
                [name]: value,
                isPerishable: isPerishable,
                // Set default shelf life for perishable items
                estimatedShelfLifeDays: isPerishable ? (value === 'Vegetables' ? '7' : '5') : '',
                // Disable pre-order for non-perishable items
                isPreorder: isPerishable ? prev.isPreorder : false,
                // Reset pre-order fields if switching to non-perishable
                expectedHarvestDate: isPerishable ? prev.expectedHarvestDate : '',
                preorderDeadline: isPerishable ? prev.preorderDeadline : '',
                preorderQuantity: isPerishable ? prev.preorderQuantity : '',
                minPreorderQuantity: isPerishable ? prev.minPreorderQuantity : ''
            }));
        } else {
            setProductForm(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
    };

    const handleCameraCapture = async (photos) => {
        setProductPhotos(photos);
        setShowCamera(false);
        showNotificationMessage(`${photos.length} photo(s) captured successfully!`, 'success');
        
        // Capture GPS location when photos are captured
        try {
            console.log('📍 Capturing GPS location for photos...');
            await getLocation();
        } catch (error) {
            console.warn('⚠️ Could not capture GPS location:', error);
            showNotificationMessage('Location capture failed (optional)', 'info');
        }
    };

    const removePhoto = (index) => {
        setProductPhotos(prev => {
            const newPhotos = [...prev];
            newPhotos.splice(index, 1);
            return newPhotos;
        });
    };

    const closeProductModal = () => {
        setShowProductModal(false);
        setSelectedProduct(null);
        setProductPhotos([]);
        setProductForm({
            productName: '',
            category: '',
            quantity: '',
            unit: 'kg',
            pricePerUnit: '',
            description: '',
            isOrganic: false,
            harvestDate: '',
            expiryDate: '',
            isPreorder: false,
            expectedHarvestDate: '',
            preorderDeadline: '',
            preorderQuantity: '',
            minPreorderQuantity: '',
            isPerishable: false,
            estimatedShelfLifeDays: ''
        });
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        
        // Get current GPS location before submitting (only for new products)
        let locationData = null;
        if (!selectedProduct) {
            try {
                const result = await getLocation();
                console.log('📍 Location capture result:', result);
                if (result.success && result.location) {
                    locationData = result.location;
                    console.log('📍 Location data captured:', locationData);
                }
            } catch (err) {
                console.warn('⚠️ Could not capture GPS location:', err);
                // Continue even if location fails - it's not mandatory
            }
        }
        
        // Validate that photos are captured (mandatory on mobile for new products only)
        if (isMobile && productPhotos.length === 0 && !selectedProduct) {
            showNotificationMessage('📸 Please capture at least one product photo before submitting', 'error');
            return;
        }
        
        try {
            // Check both localStorage and sessionStorage
            const token = localStorage.getItem('authToken') || 
                        sessionStorage.getItem('authToken') ||
                        localStorage.getItem('token') ||
                        sessionStorage.getItem('token');
            const farmerId = localStorage.getItem('farmerId') || 
                        sessionStorage.getItem('farmerId') ||
                        localStorage.getItem('userId') ||
                        sessionStorage.getItem('userId');

            if (!token) {
                showNotificationMessage('Please login to continue', 'error');
                navigate('/loginF');
                return;
            }

            // Create FormData to handle both product data and photos
            const formData = new FormData();
            
            // Add product data
            formData.append('farmer_id', farmerId);
            formData.append('product_name', productForm.productName);
            formData.append('category', productForm.category);
            formData.append('description', productForm.description);
            formData.append('quantity_available', parseFloat(productForm.quantity));
            formData.append('unit_of_measure', productForm.unit);
            formData.append('price_per_unit', parseFloat(productForm.pricePerUnit));
            formData.append('harvest_date', productForm.harvestDate || '');
            formData.append('expiry_date', productForm.expiryDate || '');
            formData.append('is_organic', productForm.isOrganic);
            formData.append('status', productForm.isPreorder ? 'preorder' : 'available');
            
            // Add pre-order fields
            formData.append('is_preorder', productForm.isPreorder);
            if (productForm.isPreorder) {
                formData.append('expected_harvest_date', productForm.expectedHarvestDate);
                formData.append('preorder_deadline', productForm.preorderDeadline);
                formData.append('preorder_quantity', parseFloat(productForm.preorderQuantity || productForm.quantity));
                formData.append('min_preorder_quantity', parseFloat(productForm.minPreorderQuantity || 0));
            }
            
            // Add perishability data
            formData.append('is_perishable', productForm.isPerishable);
            if (productForm.isPerishable && productForm.estimatedShelfLifeDays) {
                formData.append('estimated_shelf_life_days', parseInt(productForm.estimatedShelfLifeDays));
            }
            
            // Add GPS location if available (use the returned data, not state)
            if (locationData) {
                formData.append('gps_latitude', locationData.latitude);
                formData.append('gps_longitude', locationData.longitude);
                formData.append('gps_accuracy', locationData.accuracy || '');
                console.log('📍 GPS Location added to form:', {
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    accuracy: locationData.accuracy
                });
            }
            
            if (selectedProduct) {
                formData.append('product_id', selectedProduct.id);
            }
            
            // Add photos to FormData (only for new products or if photos were re-captured during edit)
            if (productPhotos.length > 0) {
                productPhotos.forEach((photo, index) => {
                    formData.append('photos', photo);
                    // Mark the first photo as the main photo
                    if (index === 0) {
                        formData.append('main_photo_index', '0');
                    }
                });
            }

            const response = await fetch(API_CONFIG.ENDPOINTS.FARMER.PRODUCTS, {
                method: selectedProduct ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Note: Don't set Content-Type header, browser will set it with boundary for multipart/form-data
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add product');
            }

            // Product added/updated successfully
            showNotificationMessage(
                selectedProduct 
                    ? `${productForm.productName} updated successfully! 🎉` 
                    : `${productForm.productName} added successfully! 🎉`, 
                'success'
            );
            
            // Reset form and close modal
            setProductForm({
                productName: '',
                category: '',
                quantity: '',
                unit: 'kg',
                pricePerUnit: '',
                description: '',
                isOrganic: false,
                harvestDate: '',
                expiryDate: '',
                isPreorder: false,
                expectedHarvestDate: '',
                preorderDeadline: '',
                preorderQuantity: '',
                minPreorderQuantity: '',
                isPerishable: false,
                estimatedShelfLifeDays: ''
            });
            setProductPhotos([]); // Clear photos
            setSelectedProduct(null);
            setShowProductModal(false);
            fetchDashboardData();
        } catch (error) {
            console.error('Error adding product:', error);
            showNotificationMessage(error.message || 'Failed to add product. Please try again.', 'error');
        }
    };

    const handleUpdateInventory = async (productId, newQuantity) => {
        try {
            // Add API call to update inventory
            console.log('Updating inventory:', productId, newQuantity);
            showNotificationMessage('Inventory updated successfully! 📦', 'success');
            fetchDashboardData();
        } catch (error) {
            console.error('Error updating inventory:', error);
            showNotificationMessage('Failed to update inventory.', 'error');
        }
    };

    const handleOrderAction = async (orderId, action) => {
        const actionText = action === 'confirm' ? 'confirmed' : 'cancelled';
        const status = action === 'confirm' ? 'confirmed' : 'cancelled';
        
        if (window.confirm(`Are you sure you want to ${action} this order?`)) {
            try {
                const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                
                if (!token) {
                    showNotificationMessage('Please login to continue', 'error');
                    navigate('/loginF');
                    return;
                }

                // Call API to update order status
                const response = await fetch(`${API_CONFIG.ENDPOINTS.FARMER.ORDERS}/${orderId}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        status: status,
                        notes: `Order ${actionText} by farmer`
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `Failed to ${action} order`);
                }

                const result = await response.json();
                console.log('Order action result:', result);
                
                showNotificationMessage(`Order #${orderId} ${actionText} successfully! ✓`, 'success');
                fetchDashboardData(); // Refresh dashboard data
                
            } catch (error) {
                console.error('Error updating order:', error);
                showNotificationMessage(`Failed to ${action} order: ${error.message}`, 'error');
            }
        }
    };

    const handleDeleteProduct = async (productId, productName) => {
        if (window.confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
            try {
                const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                
                if (!token) {
                    showNotificationMessage('Please login to continue', 'error');
                    navigate('/loginF');
                    return;
                }

                const response = await fetch(`${API_CONFIG.ENDPOINTS.FARMER.PRODUCTS}/${productId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to delete product');
                }

                showNotificationMessage(`${productName} deleted successfully!`, 'info');
                fetchDashboardData();
            } catch (error) {
                console.error('Error deleting product:', error);
                showNotificationMessage(error.message || 'Failed to delete product.', 'error');
            }
        }
    };

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            product.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setIsMobileMenuOpen(false); // Close mobile menu when tab changes
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="farmer-dashboard">
            {/* Notification Toast */}
            {showNotification && (
                <div className={`notification-toast notification-${notificationType}`}>
                    <span className="notification-icon">
                        {notificationType === 'success' && '✓'}
                        {notificationType === 'error' && '✕'}
                        {notificationType === 'info' && 'ℹ'}
                    </span>
                    <span className="notification-text">{notificationMessage}</span>
                    <button 
                        className="notification-close"
                        onClick={() => setShowNotification(false)}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Header */}
            <header className="dashboard-header">
                <div className="header-left">
                    <h1 className="dashboard-title">🌾 KilimoSmart</h1>
                    <p className="dashboard-subtitle">Farmer Dashboard</p>
                </div>
                <div className="header-right">
                    <div className="farmer-profile">
                        <div className="profile-info">
                            <span className="farmer-name">{farmerData?.firstName} {farmerData?.lastName}</span>
                            <span className="farm-name">{farmerData?.farmName}</span>
                            {farmerData?.isVerified && (
                                <span className="verified-badge">✓ Verified</span>
                            )}
                        </div>
                        <div className="profile-avatar">
                            {farmerData?.profilePhoto ? (
                                <img src={farmerData.profilePhoto} alt="Profile" />
                            ) : (
                                <div className="avatar-placeholder">
                                    {farmerData?.firstName?.charAt(0)}{farmerData?.lastName?.charAt(0)}
                                </div>
                            )}
                        </div>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        <span>🚪</span> Logout
                    </button>
                </div>
            </header>

            {/* Navigation Tabs */}
            <nav className="dashboard-nav">
                {/* Mobile Menu Toggle */}
                <button 
                    className="mobile-menu-toggle"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label="Toggle navigation menu"
                    title="Toggle menu"
                >
                    <span className="hamburger-icon">
                        <span className={`line ${isMobileMenuOpen ? 'open' : ''}`}></span>
                        <span className={`line ${isMobileMenuOpen ? 'open' : ''}`}></span>
                        <span className={`line ${isMobileMenuOpen ? 'open' : ''}`}></span>
                    </span>
                    <span className="menu-text">Menu</span>
                </button>

                {/* Navigation Menu */}
                <div className={`nav-menu ${isMobileMenuOpen ? 'open' : ''}`}>
                    {/* Mobile Menu Header */}
                    <div className="mobile-menu-header">
                        <h3>Navigation</h3>
                        <button 
                            className="mobile-menu-close"
                            onClick={() => setIsMobileMenuOpen(false)}
                            aria-label="Close menu"
                        >
                            ×
                        </button>
                    </div>

                    {/* Navigation Buttons */}
                    <button 
                        className={`nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => handleTabChange('overview')}
                        title="View dashboard statistics and overview"
                    >
                        <span className="nav-icon">📊</span>
                        <span className="nav-label">Overview</span>
                    </button>
                    <button 
                        className={`nav-btn ${activeTab === 'products' ? 'active' : ''}`}
                        onClick={() => handleTabChange('products')}
                        title="Manage your agricultural products"
                    >
                        <span className="nav-icon">🌽</span>
                        <span className="nav-label">Products</span>
                        {stats.activeListings > 0 && (
                            <span className="nav-badge">{stats.activeListings}</span>
                        )}
                    </button>
                    <button 
                        className={`nav-btn ${activeTab === 'inventory' ? 'active' : ''}`}
                        onClick={() => handleTabChange('inventory')}
                        title="Track and update your inventory"
                    >
                        <span className="nav-icon">📦</span>
                        <span className="nav-label">Inventory</span>
                    </button>
                    <button 
                        className={`nav-btn ${activeTab === 'orders' ? 'active' : ''}`}
                        onClick={() => handleTabChange('orders')}
                        title="Manage customer orders"
                    >
                        <span className="nav-icon">📋</span>
                        <span className="nav-label">Orders</span>
                        {stats.pendingOrders > 0 && (
                            <span className="nav-badge pending">{stats.pendingOrders}</span>
                        )}
                    </button>
                    <button 
                        className={`nav-btn ${activeTab === 'payments' ? 'active' : ''}`}
                        onClick={() => handleTabChange('payments')}
                        title="View payment history and earnings"
                    >
                        <span className="nav-icon">💰</span>
                        <span className="nav-label">Payments</span>
                    </button>
                    <button 
                        className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => handleTabChange('profile')}
                        title="Update your farm profile"
                    >
                        <span className="nav-icon">👤</span>
                        <span className="nav-label">Profile</span>
                    </button>
                </div>

                {/* Mobile Menu Overlay */}
                {isMobileMenuOpen && (
                    <div 
                        className="mobile-menu-overlay"
                        onClick={() => setIsMobileMenuOpen(false)}
                    ></div>
                )}
            </nav>

            {/* Main Content */}
            <main className="dashboard-content">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="overview-section">
                        <div className="section-header-with-greeting">
                            <div>
                                <h2 className="section-title">Dashboard Overview</h2>
                                <p className="greeting-text">
                                    Welcome back, {farmerData?.firstName}! 👋 
                                    <span className="greeting-date">
                                        {new Date().toLocaleDateString('en-US', { 
                                            weekday: 'long', 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        })}
                                    </span>
                                </p>
                            </div>
                            <button 
                                className="btn-quick-action"
                                onClick={() => setActiveTab('products')}
                                title="Quick add product"
                            >
                                <span>⚡</span> Quick Actions
                            </button>
                        </div>
                        
                        {/* Stats Cards */}
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-icon">🌽</div>
                                <div className="stat-info">
                                    <span className="stat-value">{stats.totalProducts}</span>
                                    <span className="stat-label">Total Products</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">✅</div>
                                <div className="stat-info">
                                    <span className="stat-value">{stats.activeListings}</span>
                                    <span className="stat-label">Active Listings</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">📋</div>
                                <div className="stat-info">
                                    <span className="stat-value">{stats.totalOrders}</span>
                                    <span className="stat-label">Total Orders</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">⏳</div>
                                <div className="stat-info">
                                    <span className="stat-value">{stats.pendingOrders}</span>
                                    <span className="stat-label">Pending Orders</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">💰</div>
                                <div className="stat-info">
                                    <span className="stat-value">KSh {stats.totalRevenue.toLocaleString()}</span>
                                    <span className="stat-label">Total Revenue</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">⭐</div>
                                <div className="stat-info">
                                    <span className="stat-value">{stats.reputationScore}/5.0</span>
                                    <span className="stat-label">Reputation Score</span>
                                </div>
                            </div>
                        </div>

                        {/* Recent Orders */}
                        <div className="recent-section">
                            <h3 className="subsection-title">Recent Orders</h3>
                            <div className="orders-list">
                                {orders.slice(0, 5).map(order => (
                                    <div key={order.id} className="order-item">
                                        <div className="order-info">
                                            <span className="order-product">{order.product}</span>
                                            <span className="order-buyer">Buyer: {order.buyer}</span>
                                            <span className="order-details">
                                                {order.quantity} units • KSh {order.amount.toLocaleString()}
                                            </span>
                                        </div>
                                        <span className={`order-status status-${order.status}`}>
                                            {order.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Products Tab */}
                {activeTab === 'products' && (
                    <div className="products-section">
                        <div className="section-header">
                            <h2 className="section-title">My Products</h2>
                            <button 
                                className="btn-primary"
                                onClick={() => {
                                    if (!isMobile) {
                                        showNotificationMessage('📱 Please use a mobile device to add products. Product photos are required and must be captured using your phone camera.', 'info');
                                    } else {
                                        setShowProductModal(true);
                                    }
                                }}
                                title={isMobile ? "List a new product for sale" : "Product addition requires a mobile device"}
                            >
                                <span>+</span> Add New Product
                            </button>
                        </div>

                        {/* Out of Stock Alert */}
                        {products.filter(p => p.quantity <= 0).length > 0 && (
                            <div className="alert-banner alert-warning">
                                <div className="alert-icon">⚠️</div>
                                <div className="alert-content">
                                    <strong>Stock Alert!</strong>
                                    <p>
                                        You have {products.filter(p => p.quantity <= 0).length} product(s) out of stock. 
                                        These products are not visible to buyers. Please restock them soon!
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Search and Filter Bar */}
                        <div className="filter-bar">
                            <div className="search-box">
                                <span className="search-icon">🔍</span>
                                <input
                                    type="text"
                                    placeholder="Search products by name or category..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="search-input"
                                />
                                {searchQuery && (
                                    <button 
                                        className="clear-search"
                                        onClick={() => setSearchQuery('')}
                                        title="Clear search"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                            <div className="filter-dropdown">
                                <label htmlFor="category-filter">Category:</label>
                                <select 
                                    id="category-filter"
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                    className="filter-select"
                                >
                                    <option value="all">All Categories</option>
                                    <option value="Cereals">Cereals</option>
                                    <option value="Legumes">Legumes</option>
                                    <option value="Vegetables">Vegetables</option>
                                    <option value="Fruits">Fruits</option>
                                </select>
                            </div>
                        </div>

                        {filteredProducts.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📦</div>
                                <h3>No products found</h3>
                                <p>
                                    {searchQuery || filterCategory !== 'all' 
                                        ? 'Try adjusting your search or filter criteria.'
                                        : 'Start by adding your first product to showcase your farm produce!'}
                                </p>
                                {!searchQuery && filterCategory === 'all' && (
                                    <button 
                                        className="btn-primary"
                                        onClick={() => setShowProductModal(true)}
                                    >
                                        + Add Your First Product
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="results-count">
                                    Showing {filteredProducts.length} of {products.length} products
                                </div>
                                        <div className="products-grid">
                                    {filteredProducts.map(product => (
                                        <div key={product.id} className={`product-card ${product.quantity <= 0 ? 'out-of-stock' : ''}`}>
                                            {product.quantity <= 0 && (
                                                <div className="out-of-stock-banner">
                                                    ⚠️ OUT OF STOCK
                                                </div>
                                            )}
                                            <div className="product-image-placeholder">
                                                <span className="product-icon">🌾</span>
                                                <div className="product-overlay">
                                                    <button 
                                                        className="overlay-btn"
                                                        title="Upload product photo"
                                                        onClick={() => showNotificationMessage('Photo upload coming soon!', 'info')}
                                                    >
                                                        📸 Add Photo
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="product-details">
                                                <div className="product-header">
                                                    <h3 className="product-name">{product.name}</h3>
                                                    <span className={`product-status status-${product.status}`}>
                                                        {product.status}
                                                    </span>
                                                </div>
                                                <p className="product-category">
                                                    <span className="category-icon">🏷️</span>
                                                    {product.category}
                                                </p>
                                                <div className="product-stats">
                                                    <div className="stat-item">
                                                        <span className="stat-icon">📦</span>
                                                        <span className={`stat-text ${product.quantity <= 0 ? 'text-danger' : ''}`}>
                                                            {product.quantity} {product.unit}
                                                            {product.quantity <= 0 && ' - Restock needed!'}
                                                        </span>
                                                    </div>
                                                    <div className="stat-item">
                                                        <span className="stat-icon">💰</span>
                                                        <span className="stat-text">
                                                            KSh {product.pricePerUnit}/{product.unit}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="product-actions">
                                                    <button 
                                                        className="btn-secondary"
                                                        title="Edit product details"
                                                        onClick={() => {
                                                            setSelectedProduct(product);
                                                            setProductForm({
                                                                productName: product.name,
                                                                category: product.category,
                                                                quantity: product.quantity,
                                                                unit: product.unit,
                                                                pricePerUnit: product.pricePerUnit,
                                                                description: product.description || '',
                                                                isOrganic: product.isOrganic || false,
                                                                harvestDate: product.harvestDate || '',
                                                                expiryDate: product.expiryDate || '',
                                                                isPreorder: product.isPreorder || false,
                                                                expectedHarvestDate: product.expectedHarvestDate || '',
                                                                preorderDeadline: product.preorderDeadline || '',
                                                                preorderQuantity: product.preorderQuantity || '',
                                                                minPreorderQuantity: product.minPreorderQuantity || '',
                                                                isPerishable: product.isPerishable || false,
                                                                estimatedShelfLifeDays: product.estimatedShelfLifeDays || ''
                                                            });
                                                            setShowProductModal(true);
                                                        }}
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <button 
                                                        className="btn-danger"
                                                        title="Delete this product"
                                                        onClick={() => handleDeleteProduct(product.id, product.name)}
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Inventory Tab */}
                {activeTab === 'inventory' && (
                    <div className="inventory-section">
                        <div className="section-header">
                            <h2 className="section-title">Inventory Management</h2>
                            <div className="header-actions">
                                <button 
                                    className="btn-secondary"
                                    onClick={() => showNotificationMessage('Export feature coming soon!', 'info')}
                                    title="Export inventory to CSV"
                                >
                                    📥 Export
                                </button>
                                <button 
                                    className="btn-primary"
                                    onClick={() => showNotificationMessage('Bulk update feature coming soon!', 'info')}
                                    title="Bulk update inventory"
                                >
                                    📊 Bulk Update
                                </button>
                            </div>
                        </div>

                        {/* Inventory Summary */}
                        <div className="inventory-summary">
                            <div className="summary-item">
                                <span className="summary-label">Total Items:</span>
                                <span className="summary-value">{products.length}</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-label">In Stock:</span>
                                <span className="summary-value success">
                                    {products.filter(p => p.quantity >= 100).length}
                                </span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-label">Low Stock:</span>
                                <span className="summary-value warning">
                                    {products.filter(p => p.quantity < 100 && p.quantity > 0).length}
                                </span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-label">Out of Stock:</span>
                                <span className="summary-value danger">
                                    {products.filter(p => p.quantity === 0).length}
                                </span>
                            </div>
                        </div>

                        <div className="inventory-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Category</th>
                                        <th>Available Quantity</th>
                                        <th>Unit</th>
                                        <th>Price/Unit</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(product => (
                                        <tr key={product.id} className={product.quantity === 0 ? 'out-of-stock-row' : ''}>
                                            <td>
                                                <div className="product-cell">
                                                    <span className="product-icon-sm">🌾</span>
                                                    <span>{product.name}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="category-tag">{product.category}</span>
                                            </td>
                                            <td>
                                                <div className="quantity-cell">
                                                    <span className={
                                                        product.quantity === 0 ? 'quantity-badge out-of-stock' :
                                                        product.quantity < 100 ? 'quantity-badge low-stock' : 
                                                        'quantity-badge in-stock'
                                                    }>
                                                        {product.quantity}
                                                    </span>
                                                    {product.quantity < 100 && product.quantity > 0 && (
                                                        <span className="stock-warning" title="Low stock alert">⚠️</span>
                                                    )}
                                                    {product.quantity === 0 && (
                                                        <span className="stock-warning" title="Out of stock">🚫</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>{product.unit}</td>
                                            <td className="price-cell">KSh {product.pricePerUnit.toLocaleString()}</td>
                                            <td>
                                                <span className={`status-badge status-${product.status}`}>
                                                    {product.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button 
                                                        className="btn-icon"
                                                        title="Update quantity"
                                                        onClick={() => {
                                                            const newQty = prompt(`Update quantity for ${product.name} (current: ${product.quantity} ${product.unit}):`, product.quantity);
                                                            if (newQty !== null && !isNaN(newQty) && Number(newQty) >= 0) {
                                                                handleUpdateInventory(product.id, Number(newQty));
                                                            }
                                                        }}
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button 
                                                        className="btn-icon"
                                                        title="View details"
                                                        onClick={() => showNotificationMessage(`Viewing details for ${product.name}`, 'info')}
                                                    >
                                                        �️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Orders Tab */}
                {activeTab === 'orders' && (
                    <div className="orders-section">
                        <div className="section-header">
                            <h2 className="section-title">Order Management</h2>
                            <div className="order-filters">
                                <button className="filter-chip active">All Orders</button>
                                <button className="filter-chip">Pending ({stats.pendingOrders})</button>
                                <button className="filter-chip">Confirmed</button>
                                <button className="filter-chip">Completed</button>
                            </div>
                        </div>

                        {orders.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📋</div>
                                <h3>No orders yet</h3>
                                <p>Orders from buyers will appear here. Make sure your products are well-listed and visible!</p>
                            </div>
                        ) : (
                            <div className="orders-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>Buyer</th>
                                        <th>Product</th>
                                        <th>Quantity</th>
                                        <th>Amount</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map(order => (
                                        <tr key={order.id} className={order.status === 'pending' ? 'pending-order-row' : ''}>
                                            <td>
                                                <span className="order-id">#{order.id.toString().padStart(4, '0')}</span>
                                            </td>
                                            <td>
                                                <div className="buyer-cell">
                                                    <span className="buyer-icon">👤</span>
                                                    <span>{order.buyer}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <strong>{order.product}</strong>
                                            </td>
                                            <td>
                                                <span className="quantity-text">{order.quantity} units</span>
                                            </td>
                                            <td className="amount-cell">
                                                <strong>KSh {order.amount.toLocaleString()}</strong>
                                            </td>
                                            <td>
                                                <span className="date-text">{order.date}</span>
                                            </td>
                                            <td>
                                                <span className={`status-badge status-${order.status}`}>
                                                    {order.status === 'pending' && '⏳ '}
                                                    {order.status === 'confirmed' && '✓ '}
                                                    {order.status === 'completed' && '✓✓ '}
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td>
                                                {order.status === 'pending' ? (
                                                    <div className="action-buttons">
                                                        <button 
                                                            className="btn-success"
                                                            onClick={() => handleOrderAction(order.id, 'confirm')}
                                                            title="Accept this order"
                                                        >
                                                            ✓ Accept
                                                        </button>
                                                        <button 
                                                            className="btn-danger"
                                                            onClick={() => handleOrderAction(order.id, 'reject')}
                                                            title="Reject this order"
                                                        >
                                                            ✗ Reject
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        className="btn-icon"
                                                        title="View order details"
                                                        onClick={() => showNotificationMessage('Order details coming soon!', 'info')}
                                                    >
                                                        👁️ View
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        )}
                    </div>
                )}

                {/* Payments Tab */}
                {activeTab === 'payments' && (
                    <div className="payments-section">
                        <div className="section-header">
                            <h2 className="section-title">Payment History</h2>
                            <button 
                                className="btn-secondary"
                                onClick={() => showNotificationMessage('Download report feature coming soon!', 'info')}
                                title="Download payment report"
                            >
                                📊 Download Report
                            </button>
                        </div>

                        <div className="payment-summary">
                            <div className="summary-card earnings-card">
                                <div className="card-icon">💰</div>
                                <div className="card-content">
                                    <h3>Total Earnings</h3>
                                    <p className="amount">KSh {stats.totalRevenue.toLocaleString()}</p>
                                    <span className="trend positive">↑ 12% from last month</span>
                                </div>
                            </div>
                            <div className="summary-card pending-card">
                                <div className="card-icon">⏳</div>
                                <div className="card-content">
                                    <h3>Pending Payments</h3>
                                    <p className="amount">KSh 15,000</p>
                                    <span className="trend neutral">3 transactions pending</span>
                                </div>
                            </div>
                            <div className="summary-card transactions-card">
                                <div className="card-icon">📱</div>
                                <div className="card-content">
                                    <h3>M-Pesa Transactions</h3>
                                    <p className="amount">45</p>
                                    <span className="trend positive">This month</span>
                                </div>
                            </div>
                        </div>

                        <div className="payments-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>Buyer</th>
                                        <th>Amount</th>
                                        <th>Method</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="empty-state">
                                                <div className="empty-icon">💸</div>
                                                <p>No payment history yet</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        payments.map((payment) => (
                                            <tr key={payment.id}>
                                                <td>#{payment.id}</td>
                                                <td>{payment.buyerName}</td>
                                                <td>KSh {parseFloat(payment.amount).toLocaleString()}</td>
                                                <td>{payment.method || payment.type}</td>
                                                <td>{new Date(payment.date).toLocaleDateString()}</td>
                                                <td>
                                                    <span className={`status-badge status-${payment.status.toLowerCase()}`}>
                                                        {payment.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <div className="profile-section">
                        <div className="section-header">
                            <h2 className="section-title">Farm Profile</h2>
                            <button 
                                className="btn-primary"
                                onClick={() => showNotificationMessage('Edit profile feature coming soon!', 'info')}
                                title="Edit your profile"
                            >
                                ✏️ Edit Profile
                            </button>
                        </div>

                        <div className="profile-content">
                            <div className="profile-card">
                                <div className="profile-header">
                                    <div className="profile-avatar-wrapper">
                                        <div className="profile-avatar-large">
                                            {farmerData?.profilePhoto ? (
                                                <img src={farmerData.profilePhoto} alt="Profile" />
                                            ) : (
                                                <div className="avatar-placeholder-large">
                                                    {farmerData?.firstName?.charAt(0)}{farmerData?.lastName?.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            className="avatar-upload-btn"
                                            onClick={() => showNotificationMessage('Photo upload feature coming soon!', 'info')}
                                            title="Upload new profile photo"
                                        >
                                            📸
                                        </button>
                                    </div>
                                    <div className="profile-summary">
                                        <h3>{farmerData?.firstName} {farmerData?.lastName}</h3>
                                        <p className="farm-name-large">🌾 {farmerData?.farmName}</p>
                                        <div className="profile-rating">
                                            <span className="stars">⭐⭐⭐⭐⭐</span>
                                            <span className="rating-text">{farmerData?.reputationScore}/5.0 ({stats.totalOrders} orders)</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="profile-info-grid">
                                    <div className="info-item">
                                        <label>Full Name</label>
                                        <p>{farmerData?.firstName} {farmerData?.lastName}</p>
                                    </div>
                                    <div className="info-item">
                                        <label>Farm Name</label>
                                        <p>{farmerData?.farmName}</p>
                                    </div>
                                    <div className="info-item">
                                        <label>Farm Type</label>
                                        <p>{farmerData?.farmType}</p>
                                    </div>
                                    <div className="info-item">
                                        <label>Farm Size</label>
                                        <p>{farmerData?.farmSize}</p>
                                    </div>
                                    <div className="info-item">
                                        <label>Email</label>
                                        <p>
                                            {farmerData?.email}
                                            {farmerData?.emailVerified && (
                                                <span className="verified-badge" style={{marginLeft: '8px'}}>✓</span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="info-item">
                                        <label>Phone Number</label>
                                        <p>{farmerData?.phoneNumber}</p>
                                    </div>
                                    <div className="info-item">
                                        <label>Location</label>
                                        <p>
                                            📍 {farmerData?.location}
                                            {farmerData?.latitude && farmerData?.longitude && (
                                                <span style={{display: 'block', fontSize: '0.85em', color: '#666', marginTop: '4px'}}>
                                                    GPS: {parseFloat(farmerData.latitude).toFixed(6)}, {parseFloat(farmerData.longitude).toFixed(6)}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    {farmerData?.addressDescription && (
                                        <div className="info-item" style={{gridColumn: 'span 2'}}>
                                            <label>Address Description</label>
                                            <p>{farmerData.addressDescription}</p>
                                        </div>
                                    )}
                                    <div className="info-item">
                                        <label>Reputation Score</label>
                                        <p>⭐ {farmerData?.reputationScore}/5.0</p>
                                    </div>
                                    <div className="info-item">
                                        <label>Total Sales</label>
                                        <p>KES {farmerData?.totalSales?.toLocaleString() || '0'}</p>
                                    </div>
                                    <div className="info-item">
                                        <label>Verification Status</label>
                                        <p>
                                            {farmerData?.isVerified ? (
                                                <span className="verified-badge">✓ Verified</span>
                                            ) : (
                                                <span className="unverified-badge">✗ Not Verified</span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="profile-actions">
                                    <button 
                                        className="btn-primary"
                                        onClick={() => showNotificationMessage('Edit profile feature coming soon!', 'info')}
                                    >
                                        ✏️ Edit Profile
                                    </button>
                                    <button 
                                        className="btn-secondary"
                                        onClick={() => showNotificationMessage('Settings page coming soon!', 'info')}
                                    >
                                        ⚙️ Account Settings
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Add Product Modal */}
            {showProductModal && (
                <div className="modal-overlay" onClick={() => setShowProductModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>
                                {selectedProduct ? '✏️ Edit Product' : '+ Add New Product'}
                            </h3>
                            <button 
                                className="modal-close"
                                onClick={() => {
                                    setShowProductModal(false);
                                    setSelectedProduct(null);
                                }}
                                title="Close modal"
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleAddProduct} className="product-form">
                            {selectedProduct && (
                                <div style={{
                                    backgroundColor: '#e7f3ff',
                                    border: '1px solid #4a90e2',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    marginBottom: '1.5rem',
                                    color: '#1a5490'
                                }}>
                                    <strong>ℹ️ Editing Mode:</strong> Update product details below. Photos cannot be changed when editing.
                                </div>
                            )}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Product Name *</label>
                                    <input
                                        type="text"
                                        name="productName"
                                        value={productForm.productName}
                                        onChange={handleProductFormChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Category *</label>
                                    <select
                                        name="category"
                                        value={productForm.category}
                                        onChange={handleProductFormChange}
                                        required
                                    >
                                        <option value="">Select Category</option>
                                        <option value="Cereals">Cereals</option>
                                        <option value="Legumes">Legumes</option>
                                        <option value="Vegetables">🌱 Vegetables (Pre-order available)</option>
                                        <option value="Fruits">🌱 Fruits (Pre-order available)</option>
                                        <option value="Root Crops">Root Crops</option>
                                    </select>
                                    <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                                        Pre-ordering is only available for perishable goods (Vegetables & Fruits)
                                    </small>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Quantity *</label>
                                    <input
                                        type="number"
                                        name="quantity"
                                        value={productForm.quantity}
                                        onChange={handleProductFormChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Unit *</label>
                                    <select
                                        name="unit"
                                        value={productForm.unit}
                                        onChange={handleProductFormChange}
                                        required
                                    >
                                        <option value="kg">Kilograms (kg)</option>
                                        <option value="bags">Bags</option>
                                        <option value="pieces">Pieces</option>
                                        <option value="crates">Crates</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Price per Unit (KSh) *</label>
                                    <input
                                        type="number"
                                        name="pricePerUnit"
                                        value={productForm.pricePerUnit}
                                        onChange={handleProductFormChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Harvest Date {!productForm.isPreorder && '(Optional)'}</label>
                                    <input
                                        type="date"
                                        name="harvestDate"
                                        value={productForm.harvestDate}
                                        onChange={handleProductFormChange}
                                        disabled={productForm.isPreorder}
                                    />
                                </div>
                            </div>

                            {/* Pre-Order Section - Only for Perishable Goods */}
                            {(productForm.category === 'Vegetables' || productForm.category === 'Fruits') && (
                            <div className="form-section">
                                <div className="form-group checkbox-group" style={{ marginBottom: '16px' }}>
                                    <label style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '8px',
                                        padding: '12px',
                                        background: '#f0f8ff',
                                        borderRadius: '8px',
                                        border: '2px solid #004a2f'
                                    }}>
                                        <input
                                            type="checkbox"
                                            name="isPreorder"
                                            checked={productForm.isPreorder}
                                            onChange={handleProductFormChange}
                                        />
                                        <span style={{ fontWeight: '600', color: '#004a2f' }}>
                                            🌱 Enable Pre-Order (Advertise before harvest)
                                        </span>
                                    </label>
                                </div>

                                {productForm.isPreorder && (
                                    <div className="preorder-fields" style={{
                                        padding: '16px',
                                        background: '#f8f9fa',
                                        borderRadius: '8px',
                                        border: '1px solid #dee2e6',
                                        marginBottom: '16px'
                                    }}>
                                        <h4 style={{ 
                                            color: '#004a2f', 
                                            marginBottom: '12px',
                                            fontSize: '1rem',
                                            fontWeight: '600'
                                        }}>
                                            📅 Pre-Order Details
                                        </h4>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Expected Harvest Date *</label>
                                                <input
                                                    type="date"
                                                    name="expectedHarvestDate"
                                                    value={productForm.expectedHarvestDate}
                                                    onChange={handleProductFormChange}
                                                    min={new Date().toISOString().split('T')[0]}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Pre-Order Deadline *</label>
                                                <input
                                                    type="date"
                                                    name="preorderDeadline"
                                                    value={productForm.preorderDeadline}
                                                    onChange={handleProductFormChange}
                                                    min={new Date().toISOString().split('T')[0]}
                                                    max={productForm.expectedHarvestDate}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Pre-Order Quantity Available *</label>
                                                <input
                                                    type="number"
                                                    name="preorderQuantity"
                                                    value={productForm.preorderQuantity}
                                                    onChange={handleProductFormChange}
                                                    placeholder={productForm.quantity || "Enter quantity"}
                                                    required
                                                />
                                                <small style={{ color: '#666', fontSize: '0.85rem' }}>
                                                    Total quantity available for pre-orders
                                                </small>
                                            </div>
                                            <div className="form-group">
                                                <label>Minimum Order Quantity</label>
                                                <input
                                                    type="number"
                                                    name="minPreorderQuantity"
                                                    value={productForm.minPreorderQuantity}
                                                    onChange={handleProductFormChange}
                                                    placeholder="e.g., 10"
                                                />
                                                <small style={{ color: '#666', fontSize: '0.85rem' }}>
                                                    Minimum qty per buyer (optional)
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            )}

                            {/* Perishability Section */}
                            {productForm.isPerishable && (
                                <div className="form-section" style={{
                                    padding: '12px',
                                    background: '#fff9e6',
                                    borderRadius: '8px',
                                    border: '1px solid #ffa323',
                                    marginBottom: '16px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                                        <strong style={{ color: '#856404' }}>Perishable Product</strong>
                                    </div>
                                    <div className="form-group">
                                        <label>Estimated Shelf Life (days)</label>
                                        <input
                                            type="number"
                                            name="estimatedShelfLifeDays"
                                            value={productForm.estimatedShelfLifeDays}
                                            onChange={handleProductFormChange}
                                            placeholder="e.g., 7"
                                        />
                                        <small style={{ color: '#666', fontSize: '0.85rem' }}>
                                            How many days will this product stay fresh after harvest?
                                        </small>
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    name="description"
                                    value={productForm.description}
                                    onChange={handleProductFormChange}
                                    rows="3"
                                />
                            </div>

                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        name="isOrganic"
                                        checked={productForm.isOrganic}
                                        onChange={handleProductFormChange}
                                    />
                                    <span>Organic Product</span>
                                </label>
                            </div>

                            {/* Product Photos Section */}
                            <div className="form-group">
                                <label>Product Photos {isMobile && !selectedProduct && <span style={{color: 'red'}}>*</span>}</label>
                                {selectedProduct && (
                                    <div style={{
                                        backgroundColor: '#e7f3ff',
                                        border: '1px solid #4a90e2',
                                        borderRadius: '8px',
                                        padding: '12px',
                                        marginBottom: '10px',
                                        color: '#1a5490'
                                    }}>
                                        <strong>ℹ️ Note:</strong> Photo editing is not available when updating a product. The existing photos will be kept.
                                    </div>
                                )}
                                {isMobile && productPhotos.length === 0 && !selectedProduct && (
                                    <div style={{
                                        backgroundColor: '#fff3cd',
                                        border: '1px solid #ffc107',
                                        borderRadius: '8px',
                                        padding: '12px',
                                        marginBottom: '10px',
                                        color: '#856404'
                                    }}>
                                        <strong>⚠️ Required:</strong> You must capture at least one product photo before submitting.
                                    </div>
                                )}
                                {!selectedProduct && (
                                <div className="photo-section">
                                    <button
                                        type="button"
                                        className="btn-camera"
                                        onClick={() => setShowCamera(true)}
                                    >
                                        📸 Take Photos {isMobile && '(Required)'}
                                    </button>
                                    
                                    {productPhotos.length > 0 && (
                                        <div className="photos-preview">
                                            <p className="photos-count">{productPhotos.length} photo(s) captured ✓</p>
                                            <div className="photos-grid-small">
                                                {productPhotos.map((photo, index) => (
                                                    <div key={index} className="photo-thumbnail">
                                                        <img src={URL.createObjectURL(photo)} alt={`Product ${index + 1}`} />
                                                        <button
                                                            type="button"
                                                            className="remove-thumb-btn"
                                                            onClick={() => removePhoto(index)}
                                                            title="Remove photo"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                )}
                            </div>
                        </form>

                        <div className="modal-actions">
                            <button 
                                type="button" 
                                className="btn-secondary"
                                onClick={closeProductModal}
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="btn-primary"
                                onClick={(e) => {
                                    e.preventDefault();
                                    const form = e.target.closest('.modal-content').querySelector('form');
                                    if (form) {
                                        form.requestSubmit();
                                    }
                                }}
                            >
                                {selectedProduct ? '💾 Update Product' : '+ Add Product'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Camera Capture Modal */}
            {showCamera && (
                <CameraCapture
                    onCapture={handleCameraCapture}
                    onClose={() => setShowCamera(false)}
                    maxPhotos={5}
                />
            )}
        </div>
    );
};

export default FarmerDashboard;
