// API Configuration for KilimoSmart
// Centralized API endpoint management for development and production

const isDevelopment = process.env.NODE_ENV === 'development';

// Base API URL - automatically switches between local and production
const API_BASE_URL = process.env.REACT_APP_API_URL || 
                     (isDevelopment ? 'http://localhost:5000' : 'https://your-backend-url.onrender.com');

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
    FORGOT_PASSWORD: `${API_BASE_URL}/api/auth/forgot-password`,
    RESET_PASSWORD: `${API_BASE_URL}/api/auth/reset-password`,
  },
  
  // Farmer endpoints
  FARMER: {
    PROFILE: `${API_BASE_URL}/api/farmer/profile`,
    PRODUCTS: `${API_BASE_URL}/api/farmer/products`,
    ORDERS: `${API_BASE_URL}/api/farmer/orders`,
    PAYMENTS: `${API_BASE_URL}/api/farmer/payments`,
    PRODUCT_PHOTOS: (productId) => `${API_BASE_URL}/api/farmer/products/${productId}/photos`,
  },
  
  // Buyer endpoints
  BUYER: {
    PROFILE: `${API_BASE_URL}/api/buyer/profile`,
    PRODUCTS: `${API_BASE_URL}/api/buyer/products`,
    ORDERS: `${API_BASE_URL}/api/buyer/orders`,
    CART: `${API_BASE_URL}/api/buyer/cart`,
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
      throw new Error(errorData.message || `HTTP Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Call Error:', error);
    throw error;
  }
};

export default API_ENDPOINTS;
export { API_BASE_URL };
