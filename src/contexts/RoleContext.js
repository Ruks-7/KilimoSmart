import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';

// Create the Role Context
const RoleContext = createContext();

// Custom hook to use the Role Context
export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};

// Role Provider Component
export const RoleProvider = ({ children }) => {
  const [activeRole, setActiveRole] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [hasMultipleRoles, setHasMultipleRoles] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get auth token from storage
  const getAuthToken = () => {
    return localStorage.getItem('authToken') || 
           sessionStorage.getItem('authToken');
  };

  // Save auth token to storage
  const saveAuthToken = (token, rememberMe = false) => {
    if (rememberMe) {
      localStorage.setItem('authToken', token);
      sessionStorage.removeItem('authToken');
    } else {
      sessionStorage.setItem('authToken', token);
      localStorage.removeItem('authToken');
    }
  };

  // Fetch available roles
  const fetchAvailableRoles = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(API_ENDPOINTS.ROLES.GET_AVAILABLE, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch available roles');
      }

      const data = await response.json();
      
      if (data.success) {
        setAvailableRoles(data.roles);
        setHasMultipleRoles(data.hasMultipleRoles);
      }
    } catch (err) {
      console.error('Error fetching available roles:', err);
      setError(err.message);
    }
  }, []);

  // Fetch active role and user profile
  const fetchActiveRole = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(API_ENDPOINTS.ROLES.GET_ACTIVE, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch active role');
      }

      const data = await response.json();
      
      if (data.success) {
        setActiveRole(data.activeRole);
        setUserProfile(data.profile);
      }
    } catch (err) {
      console.error('Error fetching active role:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Switch role
  const switchRole = async (newRole) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(API_ENDPOINTS.ROLES.SWITCH_ROLE, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ newRole }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to switch role');
      }

      const data = await response.json();
      
      if (data.success) {
        // Update token if new one is provided
        if (data.token) {
          const rememberMe = !!localStorage.getItem('authToken');
          saveAuthToken(data.token, rememberMe);
        }

        // Update state
        setActiveRole(data.activeRole);
        setUserProfile(data.profile);

        // Reload to update UI
        window.location.reload();

        return { success: true, message: data.message };
      }

      return { success: false, message: 'Failed to switch role' };
    } catch (err) {
      console.error('Error switching role:', err);
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Add a new role (convert to dual role)
  const addRole = async (roleType, profileData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(API_ENDPOINTS.ROLES.ADD_ROLE, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ roleType, profileData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add role');
      }

      const data = await response.json();
      
      if (data.success) {
        // Refresh available roles and profile
        await fetchAvailableRoles();
        await fetchActiveRole();

        return { success: true, message: data.message };
      }

      return { success: false, message: 'Failed to add role' };
    } catch (err) {
      console.error('Error adding role:', err);
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Check if user has a specific role
  const hasRole = (roleType) => {
    return availableRoles.some(role => role.role_type === roleType && role.is_active);
  };

  // Initialize on mount
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      fetchAvailableRoles();
      fetchActiveRole();
    } else {
      setLoading(false);
    }
  }, [fetchAvailableRoles, fetchActiveRole]);

  const value = {
    activeRole,
    availableRoles,
    userProfile,
    hasMultipleRoles,
    loading,
    error,
    switchRole,
    addRole,
    hasRole,
    refreshProfile: fetchActiveRole,
    refreshRoles: fetchAvailableRoles,
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

export default RoleContext;
