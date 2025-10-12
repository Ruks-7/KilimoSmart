//React hook for managing location detection and validation

import { useState, useCallback } from 'react';
import {
  getCurrentGPSLocation,
  reverseGeocode,
  searchLocations,
  verifyLocationProximity,
  getAccuracyQuality,
  formatCoordinates
} from '../utils/locationService';

export const useLocation = (options = {}) => {
  const {
    validateKenya = true,
    maxProximityDistance = 500,
    autoReverseGeocode = true
  } = options;

  // State
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [county, setCounty] = useState('');
  const [subcounty, setSubcounty] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationVerified, setLocationVerified] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  /**
   * Get current GPS location
   */
  const getLocation = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const location = await getCurrentGPSLocation({ validateKenya });
      
      setCurrentLocation(location);
      setSelectedLocation({
        lat: location.latitude,
        lng: location.longitude
      });
      setLocationVerified(true);

      // Auto reverse geocode if enabled
      let addressData = { fullAddress: '', county: '', subcounty: '' };
      if (autoReverseGeocode) {
        addressData = await reverseGeocode(location.latitude, location.longitude);
        setAddress(addressData.fullAddress);
        setCounty(addressData.county);
        setSubcounty(addressData.subcounty);
      }

      setIsLoading(false);
      
      return {
        success: true,
        location,
        accuracy: getAccuracyQuality(location.accuracy),
        address: addressData.fullAddress,
        county: addressData.county,
        subcounty: addressData.subcounty
      };
    } catch (err) {
      setError(err.userMessage || err.message);
      setIsLoading(false);
      
      return {
        success: false,
        error: err
      };
    }
  }, [validateKenya, autoReverseGeocode]);

  /**
   * Search for locations
   */
  const search = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      const results = await searchLocations(query);
      setSearchResults(results);
      setIsSearching(false);
    } catch (err) {
      setError(err.message);
      setSearchResults([]);
      setIsSearching(false);
    }
  }, []);

// Select a location (from search or map click)
  const selectLocation = useCallback(async (lat, lng) => {
    setError('');

    // Verify proximity if current location exists
    if (currentLocation) {
      const verification = verifyLocationProximity(
        currentLocation,
        lat,
        lng,
        maxProximityDistance
      );

      if (!verification.verified) {
        setError(verification.message);
        setLocationVerified(false);
        return { success: false, message: verification.message };
      }

      setLocationVerified(true);
    }

    setSelectedLocation({ lat, lng });

    // Reverse geocode
    let addressData = { fullAddress: '', county: '', subcounty: '' };
    if (autoReverseGeocode) {
      try {
        addressData = await reverseGeocode(lat, lng);
        setAddress(addressData.fullAddress);
        setCounty(addressData.county);
        setSubcounty(addressData.subcounty);
      } catch (err) {
        console.error('Reverse geocoding failed:', err);
      }
    }

    return { 
      success: true,
      address: addressData.fullAddress,
      county: addressData.county,
      subcounty: addressData.subcounty
    };
  }, [currentLocation, maxProximityDistance, autoReverseGeocode]);

  /**
   * Clear all location data
   */
  const clearLocation = useCallback(() => {
    setCurrentLocation(null);
    setSelectedLocation(null);
    setAddress('');
    setCounty('');
    setSubcounty('');
    setLocationVerified(false);
    setError('');
    setSearchResults([]);
  }, []);

  /**
   * Clear search results
   */
  const clearSearch = useCallback(() => {
    setSearchResults([]);
  }, []);

  return {
    // State
    currentLocation,
    selectedLocation,
    address,
    county,
    subcounty,
    isLoading,
    error,
    locationVerified,
    searchResults,
    isSearching,

    // Actions
    getLocation,
    search,
    selectLocation,
    clearLocation,
    clearSearch,
    setError,
    setCounty,
    setSubcounty,

    // Utilities
    formatCoordinates: selectedLocation 
      ? formatCoordinates(selectedLocation.lat, selectedLocation.lng)
      : '',
    accuracyQuality: currentLocation 
      ? getAccuracyQuality(currentLocation.accuracy)
      : null
  };
};

export default useLocation;
