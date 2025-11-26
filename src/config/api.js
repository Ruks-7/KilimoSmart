// Centralized API endpoint management for Vercel deployment

const isDevelopment = process.env.NODE_ENV === 'development';

// Base API URL - Uses same domain on Vercel, localhost for development
const API_BASE_URL = isDevelopment 
  ? 'http://localhost:5000' 
  : ''; // Empty string uses same domain (relative URLs on Vercel)

// API Endpoints
const API_ENDPOINTS = {
  // Base API URL
  BASE: API_BASE_URL,
  
  // Authentication endpoints
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    SIGNUP: `${API_BASE_URL}/api/auth/signup`,
    VERIFY_OTP: `${API_BASE_URL}/api/auth/verify-otp`,
    RESEND_OTP: `${API_BASE_URL}/api/auth/resend-otp`,
    SEND_OTP: `${API_BASE_URL}/api/auth/send-otp`,
    FORGOT_PASSWORD: `${API_BASE_URL}/api/auth/forgot-password`,
    RESET_PASSWORD: `${API_BASE_URL}/api/auth/reset-password`,
    FARMER_VERIFY_CREDENTIALS: `${API_BASE_URL}/api/auth/farmer/verify-credentials`,
    BUYER_VERIFY_CREDENTIALS: `${API_BASE_URL}/api/auth/buyer/verify-credentials`,
    FARMER_SIGNUP: `${API_BASE_URL}/api/auth/farmer/signup`,
    BUYER_SIGNUP: `${API_BASE_URL}/api/auth/buyer/signup`,
    VERIFY_TOKEN: `${API_BASE_URL}/api/auth/verify`,
    ADMIN_LOGIN: `${API_BASE_URL}/api/auth/admin/login`,
  },
  
  // Buyer endpoints
  BUYER: {
    PROFILE: `${API_BASE_URL}/api/buyer/profile`,
    PRODUCTS: `${API_BASE_URL}/api/buyer/products`,
    ORDERS: `${API_BASE_URL}/api/buyer/orders`,
    CREATE_ORDER: `${API_BASE_URL}/api/buyer/orders/create`,
    ORDER_HISTORY: `${API_BASE_URL}/api/buyer/orders/history`,
    UPDATE_PROFILE: `${API_BASE_URL}/api/buyer/profile/update`,
    CART: `${API_BASE_URL}/api/buyer/cart`,
    ADD_TO_CART: `${API_BASE_URL}/api/buyer/cart/add`,
    REMOVE_FROM_CART: `${API_BASE_URL}/api/buyer/cart/remove`,
    UPDATE_CART: `${API_BASE_URL}/api/buyer/cart/update`,
  },
  
  // Farmer endpoints
  FARMER: {
    PROFILE: `${API_BASE_URL}/api/farmer/profile`,
    PRODUCTS: `${API_BASE_URL}/api/farmer/products`,
    ORDERS: `${API_BASE_URL}/api/farmer/orders`,
    PAYMENTS: `${API_BASE_URL}/api/farmer/payments`,
    PRODUCT_PHOTOS: (productId) => `${API_BASE_URL}/api/farmer/products/${productId}/photos`,
  },
  
  // Admin endpoints
  ADMIN: {
    USERS: `${API_BASE_URL}/api/admin/users`,
    TRANSACTIONS: `${API_BASE_URL}/api/admin/transactions`,
    STATS: `${API_BASE_URL}/api/admin/stats`,
    SALES_OVER_TIME: `${API_BASE_URL}/api/admin/sales-over-time`,
    MESSAGES: `${API_BASE_URL}/api/admin/messages`,
    MESSAGE_DETAILS: (conversationId) => `${API_BASE_URL}/api/admin/messages/${conversationId}`,
    UPDATE_MESSAGE_STATUS: (conversationId) => `${API_BASE_URL}/api/admin/messages/${conversationId}/status`,
  },
  
  // Reviews endpoints
  REVIEWS: {
    CREATE: `${API_BASE_URL}/api/reviews`,
    GET_FARMER_REVIEWS: (farmerId) => `${API_BASE_URL}/api/reviews/farmer/${farmerId}`,
    GET_BUYER_REVIEWS: (buyerId) => `${API_BASE_URL}/api/reviews/buyer/${buyerId}`,
    GET_REVIEWABLE_ORDERS: (buyerId) => `${API_BASE_URL}/api/reviews/reviewable-orders/${buyerId}`,
    UPDATE: (reviewId) => `${API_BASE_URL}/api/reviews/${reviewId}`,
    DELETE: (reviewId) => `${API_BASE_URL}/api/reviews/${reviewId}`,
    ADD_RESPONSE: (reviewId) => `${API_BASE_URL}/api/reviews/${reviewId}/response`,
    MARK_HELPFUL: (reviewId) => `${API_BASE_URL}/api/reviews/${reviewId}/helpful`,
  },

  // Roles endpoints (Dual RBAC)
  ROLES: {
    GET_AVAILABLE: `${API_BASE_URL}/api/roles/available`,
    GET_ACTIVE: `${API_BASE_URL}/api/roles/active`,
    SWITCH_ROLE: `${API_BASE_URL}/api/roles/switch`,
    ADD_ROLE: `${API_BASE_URL}/api/roles/add`,
    GET_PROFILE: `${API_BASE_URL}/api/roles/profile`,
  },
};

// Helper function to get headers with auth token
export const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken') || 
                sessionStorage.getItem('authToken') || 
                localStorage.getItem('token') ||
                sessionStorage.getItem('token');
  
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Helper function for API calls with error handling
export const apiCall = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const err = new Error(errorData.message || `HTTP Error: ${response.status}`);
      // attach status and raw data for callers to inspect
      err.status = response.status;
      err.data = errorData;
      throw err;
    }

    return await response.json();
  } catch (error) {
    console.error('API Call Error:', error);
    throw error;
  }
};

// Export as both API_CONFIG and API_ENDPOINTS for compatibility
const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  ENDPOINTS: API_ENDPOINTS
};

export { API_CONFIG, API_ENDPOINTS, API_BASE_URL };
export default API_CONFIG;
