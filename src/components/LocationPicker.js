// LocationPicker Component

import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLocation } from '../hooks/useLocation';
import './Styling/LocationPicker.css';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Map click handler component
const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
    },
  });
  return null;
};

const LocationPicker = ({ 
  onLocationChange,
  geofenceRadius = 500,
  showSearch = true,
  showMap = true,
  showCountyInputs = true,
  required = true
}) => {
  const {
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
    getLocation,
    search,
    selectLocation,
    clearSearch,
    setCounty,
    setSubcounty,
    formatCoordinates,
    accuracyQuality
  } = useLocation({
    validateKenya: true,
    maxProximityDistance: geofenceRadius,
    autoReverseGeocode: true
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState([-0.0236, 37.9062]); // Kenya center
  const [mapZoom, setMapZoom] = useState(6);

  // Handle get current location
  const handleGetLocation = async () => {
    const result = await getLocation();
    if (result.success) {
      setMapCenter([result.location.latitude, result.location.longitude]);
      setMapZoom(16);
      
      // Notify parent component with data returned from getLocation
      if (onLocationChange) {
        onLocationChange({
          latitude: result.location.latitude,
          longitude: result.location.longitude,
          county: result.county || '',
          subcounty: result.subcounty || '',
          address: result.address || '',
          accuracy: result.location.accuracy,
          verified: true
        });
      }
    }
  };

  // Handle map click
  const handleMapClick = async (lat, lng) => {
    const result = await selectLocation(lat, lng);
    if (result.success && onLocationChange) {
      onLocationChange({
        latitude: lat,
        longitude: lng,
        county: result.county || '',
        subcounty: result.subcounty || '',
        address: result.address || '',
        verified: locationVerified
      });
    }
  };

  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);
    search(query);
  };

  // Handle search result click
  const handleSearchResultClick = async (result) => {
    const locationResult = await selectLocation(result.lat, result.lng);
    setMapCenter([result.lat, result.lng]);
    setMapZoom(15);
    setSearchQuery(result.displayName.split(',')[0]);
    clearSearch();
    
    if (onLocationChange && locationResult.success) {
      onLocationChange({
        latitude: result.lat,
        longitude: result.lng,
        county: locationResult.county || '',
        subcounty: locationResult.subcounty || '',
        address: locationResult.address || result.displayName,
        verified: locationVerified
      });
    }
  };

  return (
    <div className="location-picker">
      {/* Error Message */}
      {error && (
        <div className="location-error">
          {error}
        </div>
      )}

      {/* Get Location Button */}
      <div className="location-actions">
        <button
          type="button"
          onClick={handleGetLocation}
          disabled={isLoading}
          className={`btn-get-location ${currentLocation ? 'active' : ''}`}
        >
          {isLoading ? '⏳ Getting GPS Location...' : 
           currentLocation ? '✅ Location Detected - Adjust if Needed' : 
           '📍 Use My Current GPS Location'}
        </button>

        {!currentLocation && (
          <div className="location-tips">
            <strong>📱 For accurate GPS location:</strong>
            <ul>
              <li>Enable GPS/Location Services on your device</li>
              <li>Grant location permission when browser asks</li>
              <li>Disable VPN or proxy if active</li>
              <li>Move to an open area for better GPS signal</li>
              <li>System validates you're in Kenya 🇰🇪</li>
            </ul>
          </div>
        )}
      </div>

      {/* Current Location Info */}
      {currentLocation && (
        <div className="location-info">
          <div className="info-row">
            <span className="info-label">GPS Position:</span>
            <span className="info-value">{formatCoordinates}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Accuracy:</span>
            <span className="info-value">
              {accuracyQuality?.emoji} ±{Math.round(currentLocation.accuracy)}m ({accuracyQuality?.text})
            </span>
          </div>
          {locationVerified && (
            <div className="location-verified">
              ✓ Location Verified
            </div>
          )}
        </div>
      )}

      {/* Search Bar */}
      {showSearch && currentLocation && (
        <div className="location-search">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="🔍 Search for your location (optional refinement)"
            className="search-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                clearSearch();
              }}
              className="btn-clear-search"
            >
              ✕
            </button>
          )}
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <ul className="search-results">
              {searchResults.map((result, index) => (
                <li
                  key={index}
                  onClick={() => handleSearchResultClick(result)}
                  className="search-result-item"
                >
                  📍 {result.displayName}
                </li>
              ))}
            </ul>
          )}
          
          {isSearching && (
            <div className="search-loading">Searching...</div>
          )}
        </div>
      )}

      {/* Map */}
      {showMap && selectedLocation && (
        <div className="location-map">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '400px', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Selected Location Marker */}
            {selectedLocation && (
              <Marker position={[selectedLocation.lat, selectedLocation.lng]} />
            )}
            
            {/* Geofence Circle */}
            {currentLocation && (
              <Circle
                center={[currentLocation.latitude, currentLocation.longitude]}
                radius={geofenceRadius}
                pathOptions={{
                  color: '#4CAF50',
                  fillColor: '#4CAF50',
                  fillOpacity: 0.1,
                  weight: 2,
                  dashArray: '5, 5'
                }}
              />
            )}
            
            <MapClickHandler onLocationSelect={handleMapClick} />
          </MapContainer>
          
          <p className="map-help">
            💡 Click on the map to refine your exact location (within {geofenceRadius}m radius)
          </p>
        </div>
      )}

      {/* County and Subcounty Inputs */}
      {showCountyInputs && (
        <div className="location-admin">
          <div className="form-group">
            <label htmlFor="county">County</label>
            <input
              type="text"
              id="county"
              value={county}
              onChange={(e) => {
                setCounty(e.target.value);
                if (onLocationChange && selectedLocation) {
                  onLocationChange({
                    ...selectedLocation,
                    county: e.target.value,
                    subcounty,
                    address
                  });
                }
              }}
              placeholder="Auto-detected or enter manually"
              required={required}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="subcounty">Subcounty</label>
            <input
              type="text"
              id="subcounty"
              value={subcounty}
              onChange={(e) => {
                setSubcounty(e.target.value);
                if (onLocationChange && selectedLocation) {
                  onLocationChange({
                    ...selectedLocation,
                    county,
                    subcounty: e.target.value,
                    address
                  });
                }
              }}
              placeholder="Auto-detected or enter manually"
              required={required}
            />
          </div>
        </div>
      )}

      {/* Address Display */}
      {address && (
        <div className="location-address">
          <strong>Address:</strong> {address}
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
