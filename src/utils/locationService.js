//Handles GPS detection, geocoding, and location validation 

import axios from 'axios';

// Kenya geographic bounds
const KENYA_BOUNDS = {
  lat: { min: -5, max: 5 },
  lng: { min: 34, max: 42 }
};

//Check if coordinates are within Kenya
export const isInKenya = (latitude, longitude) => {
  return (
    latitude >= KENYA_BOUNDS.lat.min &&
    latitude <= KENYA_BOUNDS.lat.max &&
    longitude >= KENYA_BOUNDS.lng.min &&
    longitude <= KENYA_BOUNDS.lng.max
  );
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Get user's current GPS location with high accuracy
 * @param {Object} options Configuration options
 * @returns {Promise} Resolves with location data or rejects with error
 */
export const getCurrentGPSLocation = (options = {}) => {
  const {
    enableHighAccuracy = true,
    timeout = 15000,
    maximumAge = 0,
    validateKenya = true
  } = options;

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({
        code: 'NOT_SUPPORTED',
        message: 'Geolocation is not supported by your browser',
        userMessage: '❌ Your browser does not support location services.'
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        console.log('📍 GPS Location detected:', {
          lat: latitude,
          lng: longitude,
          accuracy: accuracy,
          timestamp: new Date().toISOString()
        });

        // Validate Kenya bounds if required
        if (validateKenya && !isInKenya(latitude, longitude)) {
          reject({
            code: 'OUTSIDE_KENYA',
            message: 'Location detected outside Kenya',
            userMessage: `⚠️ GPS location detected outside Kenya (${latitude.toFixed(4)}, ${longitude.toFixed(4)}).\n\nThis might be due to:\n• VPN or proxy is active\n• Location services using IP instead of GPS\n• Device location is incorrect\n\nPlease:\n1. Disable VPN/Proxy\n2. Enable GPS in device settings\n3. Grant browser location permission`,
            coordinates: { latitude, longitude }
          });
          return;
        }

        // Warn about low accuracy
        if (accuracy > 100) {
          console.warn(`⚠️ Low GPS accuracy: ±${Math.round(accuracy)}m`);
        }

        resolve({
          latitude,
          longitude,
          accuracy,
          timestamp: new Date().toISOString(),
          inKenya: isInKenya(latitude, longitude)
        });
      },
      (error) => {
        console.error('❌ Geolocation error:', error);
        
        let userMessage;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            userMessage = '❌ Location permission denied.\n\nPlease:\n1. Click the location icon in your browser address bar\n2. Change setting to "Allow"\n3. Refresh the page and try again';
            break;
          case error.POSITION_UNAVAILABLE:
            userMessage = '❌ Location unavailable.\n\nPossible causes:\n• GPS is disabled on your device\n• You\'re indoors with poor GPS signal\n• Location services are not enabled\n\nTry:\n1. Enable GPS in device settings\n2. Move to an area with clear sky view\n3. Or manually select your location';
            break;
          case error.TIMEOUT:
            userMessage = '❌ Location request timed out.\n\nPlease:\n1. Ensure GPS is enabled\n2. Move to an open area\n3. Try again in a few seconds';
            break;
          default:
            userMessage = `❌ Location error: ${error.message}`;
        }

        reject({
          code: error.code,
          message: error.message,
          userMessage
        });
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge
      }
    );
  });
};

/**
 * Reverse geocode coordinates to address using OpenStreetMap Nominatim
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise} Address data
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat: latitude,
        lon: longitude,
        format: 'json',
        addressdetails: 1,
        'accept-language': 'en'
      },
    });

    const address = response.data.display_name;
    const addressData = response.data.address;

    // Check if country is Kenya
    if (addressData.country_code !== 'ke') {
      console.warn('⚠️ Country detected is not Kenya:', addressData.country);
    }

    // Extract county with multiple fallback options
    const county = addressData.county || 
                   addressData.state || 
                   addressData.state_district ||
                   '';

    // Extract subcounty with multiple fallback options
    const subcounty = addressData.suburb || 
                      addressData.town || 
                      addressData.village || 
                      addressData.municipality ||
                      addressData.city ||
                      '';

    console.log('🗺️ Reverse geocode result:', {
      county,
      subcounty,
      fullAddress: address
    });

    return {
      fullAddress: address,
      county: county,
      subcounty: subcounty,
      country: addressData.country || '',
      countryCode: addressData.country_code || '',
      city: addressData.city || addressData.town || '',
      state: addressData.state || '',
      rawData: addressData
    };
  } catch (error) {
    console.error('Error fetching address:', error);
    throw new Error('Failed to fetch address. Please try again.');
  }
};

/**
 * Search for locations using OpenStreetMap Nominatim
 * @param {string} query Search query
 * @param {Object} options Search options
 * @returns {Promise} Array of location results
 */
export const searchLocations = async (query, options = {}) => {
  const {
    countryCode = 'ke', // Limit to Kenya
    limit = 5
  } = options;

  if (!query.trim()) {
    return [];
  }

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: query,
        format: 'json',
        addressdetails: 1,
        limit: limit,
        countrycodes: countryCode
      },
    });

    return response.data.map(result => ({
      displayName: result.display_name,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      type: result.type,
      address: result.address,
      boundingBox: result.boundingbox
    }));
  } catch (error) {
    console.error('Error searching locations:', error);
    throw new Error('Failed to search locations. Please try again.');
  }
};

/**
 * Verify if clicked location is within acceptable radius of current location
 * @param {Object} currentLocation User's current GPS location
 * @param {number} clickedLat Clicked latitude
 * @param {number} clickedLng Clicked longitude
 * @param {number} maxDistance Maximum allowed distance in meters
 * @returns {Object} Verification result
 */
export const verifyLocationProximity = (currentLocation, clickedLat, clickedLng, maxDistance = 500) => {
  if (!currentLocation) {
    return {
      verified: false,
      distance: null,
      message: '⚠️ Please use "Get My Location" button first to verify your position'
    };
  }

  const distance = calculateDistance(
    currentLocation.lat || currentLocation.latitude,
    currentLocation.lng || currentLocation.longitude,
    clickedLat,
    clickedLng
  );

  if (distance > maxDistance) {
    return {
      verified: false,
      distance: Math.round(distance),
      message: `⚠️ Location is ${Math.round(distance)}m from your current position. For security, stay within ${maxDistance}m when adjusting location.`
    };
  }

  return {
    verified: true,
    distance: Math.round(distance),
    message: distance > 50 
      ? `✅ Location adjusted by ${Math.round(distance)}m. This is acceptable.`
      : '✅ Location verified'
  };
};

// Format coordinates for display
export const formatCoordinates = (lat, lng, precision = 6) => {
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
};

// Get location accuracy quality description
export const getAccuracyQuality = (accuracy) => {
  if (accuracy < 10) return { quality: 'excellent', emoji: '🟢', text: 'Excellent' };
  if (accuracy < 50) return { quality: 'good', emoji: '🟢', text: 'Good' };
  if (accuracy < 100) return { quality: 'fair', emoji: '🟡', text: 'Fair' };
  return { quality: 'poor', emoji: '🔴', text: 'Poor - Move to open area' };
};

export const KENYA_COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet',
  'Embu', 'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado',
  'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga',
  'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia',
  'Lamu', 'Machakos', 'Makueni', 'Mandera', 'Marsabit',
  'Meru', 'Migori', 'Mombasa', 'Murang\'a', 'Nairobi',
  'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua',
  'Nyeri', 'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River',
  'Tharaka-Nithi', 'Trans Nzoia', 'Turkana', 'Uasin Gishu',
  'Vihiga', 'Wajir', 'West Pokot'
];

// Validate county name
export const isValidCounty = (county) => {
  return KENYA_COUNTIES.some(
    validCounty => validCounty.toLowerCase() === county.toLowerCase()
  );
};

const locationService = {
  getCurrentGPSLocation,
  reverseGeocode,
  searchLocations,
  verifyLocationProximity,
  calculateDistance,
  isInKenya,
  formatCoordinates,
  getAccuracyQuality,
  isValidCounty,
  KENYA_BOUNDS,
  KENYA_COUNTIES
};

export default locationService;
