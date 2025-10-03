import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Styling/auth.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const SignUp = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        email: '',
        password: '',
        confirmPassword: '',
        location: null,
        county: '',       
        subcounty: '', 
        farmType: '',
        farmSize: '',
        geofenceRadius: 500  // Default 500m
    });
    
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [mapCenter, setMapCenter] = useState([-0.0236, 37.9062]);
    const [mapZoom, setMapZoom] = useState(6);
    
    // Security: Current location tracking
    const [currentLocation, setCurrentLocation] = useState(null);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [locationVerified, setLocationVerified] = useState(false);
    
    const navigate = useNavigate();

    const farmTypes = [
        'Cereals (Maize, Wheat, Rice)',
        'Legumes (Beans, Peas, Lentils)',
        'Root Crops (Potatoes, Sweet Potatoes, Cassava)',
        'Vegetables (Tomatoes, Onions, Cabbages)',
        'Fruits (Bananas, Mangoes, Avocados)',
    ];

    const farmSizes = [
        'Small Scale (Less than 2.5 acres)',
        'Medium Scale (2.5 - 20 acres)',
        'Large Scale (20 - 100 acres)',
        'Commercial (Over 100 acres)'
    ];

    // Calculate distance between two coordinates (Haversine formula)
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    };

    // Get user's current location
    const getCurrentLocation = () => {
        setIsGettingLocation(true);
        setError('');

        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            setIsGettingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                
                setCurrentLocation({
                    lat: latitude,
                    lng: longitude,
                    accuracy: accuracy,
                    timestamp: new Date().toISOString()
                });
                
                // Center map on current location
                setMapCenter([latitude, longitude]);
                setMapZoom(16);

                // AUTO-FILL FARM LOCATION with current location
                setFormData(prev => ({
                    ...prev,
                    location: { lat: latitude, lng: longitude }
                }));
                
                // Auto-verify since farm location = current location
                setLocationVerified(true);
                
                fetchAddress(latitude, longitude);
                setIsGettingLocation(false);
                
                // Show success message
                setError('');
            },
            (error) => {
                setIsGettingLocation(false);
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        setError('Location permission denied. Please enable location access.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setError('Location information unavailable.');
                        break;
                    case error.TIMEOUT:
                        setError('Location request timed out.');
                        break;
                    default:
                        setError('An unknown error occurred while getting location.');
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    // Verify location when user adjusts/refines via map or search
    const verifyLocationSecurity = (clickedLat, clickedLng) => {
        if (!currentLocation) {
            setLocationVerified(false);
            setError('⚠️ Please use "Get My Location" button first to verify your position');
            return false;
        }

        const distance = calculateDistance(
            currentLocation.lat,
            currentLocation.lng,
            clickedLat,
            clickedLng
        );

        // Allow reasonable adjustment radius - farmer might refine exact plot location
        const maxAllowedDistance = 500; // Increased to 500m for practical farm location refinement

        if (distance > maxAllowedDistance) {
            setLocationVerified(false);
            setError(`⚠️ Location is ${Math.round(distance)}m from your current position. For security, stay within 500m when adjusting location. If your farm is further away, please go there first.`);
            return false;
        } else {
            setLocationVerified(true);
            if (distance > 50) {
                // Show info message for adjustments > 50m
                setError(`✅ Location adjusted by ${Math.round(distance)}m. This is acceptable for farm plot precision.`);
                setTimeout(() => setError(''), 5000); // Clear after 5 seconds
            } else {
                setError('');
            }
            return true;
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleRadiusChange = (e) => {
        setFormData({ ...formData, geofenceRadius: parseInt(e.target.value) });
    };

    const handleFarmDetailsChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleMapClick = (e) => {
        const { lat, lng } = e.latlng;
        
        // Security check: verify clicked location against current location
        const isVerified = verifyLocationSecurity(lat, lng);
        
        if (currentLocation && !isVerified) {
            // Don't set location if verification fails
            return;
        }
        
        setFormData({ ...formData, location: { lat, lng } });
        setError('');
        fetchAddress(lat, lng);
    };

    const fetchAddress = async (lat, lng) => {
        try {
            const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
                params: {
                    lat,
                    lon: lng,
                    format: 'json',
                    addressdetails: 1
                },
            });
            const address = response.data.display_name;
            const addressData = response.data.address;
            
            // Auto-fill county and subcounty from map coordinates
            const detectedCounty = addressData.county || addressData.state || '';
            const detectedSubcounty = addressData.suburb || addressData.town || addressData.village || '';
            
            setFormData((prevData) => ({ 
                ...prevData, 
                address,
                county: detectedCounty,
                subcounty: detectedSubcounty
            }));
            
            console.log('📍 Auto-detected location:', { county: detectedCounty, subcounty: detectedSubcounty });
        } catch (err) {
            console.error('Error fetching address:', err);
            setError('Failed to fetch address. Please try again.');
        }
    };

    const handleSearch = async (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }
        
        setIsSearching(true);
        try {
            const response = await axios.get('https://nominatim.openstreetmap.org/search', {
                params: {
                    q: `${query}, Kenya`,
                    format: 'json',
                    limit: 5,
                    countrycodes: 'ke',
                    addressdetails: 1
                },
            });
            setSearchResults(response.data);
        } catch (err) {
            console.error('Error searching location:', err);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchInputChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        
        clearTimeout(window.searchTimeout);
        window.searchTimeout = setTimeout(() => {
            if (query.length >= 2) {
                handleSearch(query);
            } else {
                setSearchResults([]);
            }
        }, 500);
    };

    const handleSearchResultClick = (result) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        // Security check for search results too
        const isVerified = verifyLocationSecurity(lat, lng);
        
        if (currentLocation && !isVerified) {
            return;
        }
        
        setFormData({ 
            ...formData, 
            location: { lat, lng },
            address: result.display_name
        });
        setMapCenter([lat, lng]);
        setMapZoom(15);
        setSearchQuery(result.display_name.split(',')[0]);
        setSearchResults([]);
        setError('');
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        
        if (!formData.location) {
            setError('Please select your location on the map');
            return;
        }

        // Security check: Ensure current location was captured
        if (!currentLocation) {
            setError('⚠️ Security: Please use "Use My Current Location" button to verify your location');
            return;
        }

        // Security check: Ensure location is verified
        if (!locationVerified) {
            setError('⚠️ Security: Selected location must be verified against your current location');
            return;
        }

        try {
            const signupData = {
                // User data
                firstName: formData.firstName,
                lastName: formData.lastName,
                phoneNumber: formData.phoneNumber,
                email: formData.email,
                password: formData.password,
                userType: 'farmer',
                
                // Location data with security info
                location: {
                    latitude: formData.location.lat,
                    longitude: formData.location.lng,
                    county: formData.county,
                    subcounty: formData.subcounty,
                    addressDescription: formData.address,
                    geofenceRadius: formData.geofenceRadius,
                    
                    // Security metadata
                    currentLocation: {
                        latitude: currentLocation.lat,
                        longitude: currentLocation.lng,
                        accuracy: currentLocation.accuracy,
                        timestamp: currentLocation.timestamp
                    },
                    locationVerified: locationVerified,
                    verificationDistance: calculateDistance(
                        currentLocation.lat,
                        currentLocation.lng,
                        formData.location.lat,
                        formData.location.lng
                    )
                },
                
                // Farm data
                farmType: formData.farmType,
                farmSize: formData.farmSize,
            };

            const response = await axios.post(
                'http://localhost:5000/api/auth/farmer/signup',
                signupData
            );

            console.log('Signup successful:', response.data);
            navigate('/loginF');
            
        } catch (err) {
            console.error('Signup error:', err);
            setError(err.response?.data?.message || 'Sign up failed. Please try again.');
        }
    };

    const LocationMarker = () => {
        useMapEvents({
            click: handleMapClick,
        });
        
        // Get computed CSS colors for Leaflet
        const getComputedColor = (variable) => {
            if (typeof window !== 'undefined') {
                return getComputedStyle(document.documentElement)
                    .getPropertyValue(variable).trim();
            }
            return '#004a2f'; // fallback
        };

        const primaryColor = getComputedColor('--farmer-primary-color');
        const successColor = getComputedColor('--farmer-success-color');
        const accentColor = getComputedColor('--farmer-accent-color');
        
        return (
            <>
                {/* Current Location Marker (Blue) */}
                {currentLocation && (
                    <>
                        <Circle
                            center={[currentLocation.lat, currentLocation.lng]}
                            radius={currentLocation.accuracy}
                            pathOptions={{
                                color: primaryColor,
                                fillColor: primaryColor,
                                fillOpacity: 0.1,
                                weight: 2,
                                dashArray: '5, 5'
                            }}
                        />
                        <Marker 
                            position={[currentLocation.lat, currentLocation.lng]}
                            icon={L.icon({
                                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                                iconSize: [25, 41],
                                iconAnchor: [12, 41],
                                popupAnchor: [1, -34],
                                shadowSize: [41, 41]
                            })}
                        />
                    </>
                )}
                
                {/* Selected Farm Location Marker (Green) */}
                {formData.location && (
                    <>
                        <Marker position={[formData.location.lat, formData.location.lng]} />
                        <Circle
                            center={[formData.location.lat, formData.location.lng]}
                            radius={formData.geofenceRadius}
                            pathOptions={{
                                color: locationVerified ? successColor : accentColor,
                                fillColor: locationVerified ? successColor : accentColor,
                                fillOpacity: 0.2,
                                weight: 2
                            }}
                        />
                    </>
                )}
            </>
        );
    };

    return (
        <div className="auth-container signup-container">
            <h2>🌾 Farmer Sign Up</h2>
            <p className="signup-description">Join KilimoSmart and connect with buyers across Kenya</p>
            
            {error && <div className="error-message">⚠️ {error}</div>}
            
            <form onSubmit={handleSubmit} className="auth-form">
                {/* Personal Information */}
                <div className="filter-row">
                    <div className="form-group">
                        <label htmlFor="firstName">👤 First Name</label>
                        <input 
                            type="text" 
                            id="firstName"
                            name="firstName" 
                            placeholder="Enter your first name" 
                            value={formData.firstName} 
                            onChange={handleChange} 
                            required 
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="lastName">👤 Last Name</label>
                        <input 
                            type="text" 
                            id="lastName"
                            name="lastName" 
                            placeholder="Enter your last name" 
                            value={formData.lastName} 
                            onChange={handleChange} 
                            required 
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="phoneNumber">📞 Phone Number</label>
                    <input 
                        type="tel" 
                        id="phoneNumber"
                        name="phoneNumber" 
                        placeholder="+254712345678" 
                        value={formData.phoneNumber} 
                        onChange={handleChange} 
                        required 
                    />
                </div>
                
                <div className="form-group">
                    <label htmlFor="email">📧 Email Address</label>
                    <input 
                        type="email" 
                        id="email"
                        name="email" 
                        placeholder="your.email@example.com" 
                        value={formData.email} 
                        onChange={handleChange} 
                        required 
                    />
                </div>

                {/* Farm Details */}
                <div className="filters-section">
                    <h3 className="section-title">🚜 Farm Information</h3>
                    
                    <div className="filter-row">
                        <div className="form-group">
                            <label htmlFor="farmType">🌱 Farm Type</label>
                            <select 
                                id="farmType"
                                name="farmType"
                                value={formData.farmType}
                                onChange={handleFarmDetailsChange}
                                required
                            >
                                <option value="">Select Farm Type</option>
                                {farmTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="farmSize">📏 Farm Size</label>
                            <select 
                                id="farmSize"
                                name="farmSize"
                                value={formData.farmSize}
                                onChange={handleFarmDetailsChange}
                                required
                            >
                                <option value="">Select Farm Size</option>
                                {farmSizes.map(size => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Location Section with Intelligent Auto-Fill */}
                <div className="form-group">
                    <label>📍 Farm Location</label>
                    <p className="location-help">
                        🎯 Click below to auto-detect your location, then refine if needed using search or map
                    </p>
                    
                    {/* Smart Location Button */}
                    <button
                        type="button"
                        onClick={getCurrentLocation}
                        disabled={isGettingLocation}
                        className={`location-btn ${currentLocation ? 'detected' : ''}`}
                    >
                        {isGettingLocation ? '⏳ Getting Location...' : 
                         currentLocation ? '✅ Location Set - Adjust if Needed' : 
                         '📍 Get My Location'}
                    </button>
                    
                    {currentLocation && (
                        <div className="location-info">
                            ✅ GPS Position: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                            <br />
                            📏 Accuracy: ±{Math.round(currentLocation.accuracy)}m
                            {locationVerified && (
                                <>
                                    <br />
                                    <span className="location-verified">
                                        ✓ Farm Location Verified
                                    </span>
                                </>
                            )}
                        </div>
                    )}
                    
                    {/* Optional Refinement: Search Bar */}
                    {currentLocation && (
                        <>
                            <div className="location-search">
                                <p className="location-help" style={{ marginTop: '15px', marginBottom: '8px' }}>
                                    💡 <strong>Optional:</strong> Search or click the map below to refine your exact farm plot location
                                </p>
                                <div className="search-input-wrapper">
                                    <input
                                        type="text"
                                        placeholder="🔍 Refine location: Search for street, area, or landmark..."
                                        value={searchQuery}
                                        onChange={handleSearchInputChange}
                                        className="search-input"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={clearSearch}
                                            className="clear-search"
                                        >
                                            ✕
                                        </button>
                                    )}
                                    {isSearching && <div className="search-spinner">⏳</div>}
                                </div>
                            
                                {searchResults.length > 0 && (
                                    <div className="search-results">
                                        {searchResults.map((result, index) => (
                                            <div
                                                key={index}
                                                className="search-result-item"
                                                onClick={() => handleSearchResultClick(result)}
                                            >
                                                <div className="result-name">📍 {result.display_name.split(',')[0]}</div>
                                                <div className="result-details">{result.display_name}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    
                    {/* Interactive Map - Always visible after getting location */}
                    {currentLocation && (
                        <div className="map-container">
                            <MapContainer 
                                center={mapCenter} 
                                zoom={mapZoom}
                                key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`}
                            >
                                <TileLayer 
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                />
                                <LocationMarker />
                            </MapContainer>
                            
                            {formData.location && (
                                <div className="selected-location">
                                    {locationVerified ? '✅ Verified' : '⏳ Verifying'}: {formData.address || `${formData.location.lat.toFixed(4)}, ${formData.location.lng.toFixed(4)}`}
                                    {formData.county && (
                                        <>
                                            <br />
                                            <small>🏛️ {formData.county}{formData.subcounty && ` • ${formData.subcounty}`}</small>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Geofence Radius */}
                <div className="form-group">
                    <label htmlFor="geofenceRadius">
                        📏 Delivery Coverage Area: <strong>
                            {formData.geofenceRadius >= 1000 
                                ? `${(formData.geofenceRadius / 1000).toFixed(1)} km`
                                : `${formData.geofenceRadius}m`
                            }
                        </strong>
                    </label>
                    <p className="location-help">
                        Set how far you can deliver (200m for local, up to 25km for wide coverage)
                    </p>
                    <input
                        type="range"
                        id="geofenceRadius"
                        name="geofenceRadius"
                        min="200"
                        max="25000"
                        step="100"
                        value={formData.geofenceRadius}
                        onChange={handleRadiusChange}
                        className="radius-slider"
                    />
                    <div className="radius-labels">
                        <span>🏘️ Neighborhood (200m)</span>
                        <span>🏙️ Town (5km)</span>
                        <span>🌍 Regional (25km)</span>
                    </div>

                </div>

                {/* Password fields */}
                <div className="filter-row">
                    <div className="form-group">
                        <label htmlFor="password">🔒 Password</label>
                        <input 
                            type="password" 
                            id="password"
                            name="password" 
                            placeholder="Create a strong password" 
                            value={formData.password} 
                            onChange={handleChange} 
                            required 
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="confirmPassword">🔒 Confirm Password</label>
                        <input 
                            type="password" 
                            id="confirmPassword"
                            name="confirmPassword" 
                            placeholder="Re-enter your password" 
                            value={formData.confirmPassword} 
                            onChange={handleChange} 
                            required 
                        />
                    </div>
                </div>
                
                <button 
                    type="submit" 
                    disabled={!formData.location || !locationVerified}
                    className="auth-btn"
                >
                    🚀 Create Farmer Account
                </button>
                
                <p className="auth-redirect">
                    Already have an account? <a href="/loginF">Login here</a>
                </p>
            </form>
        </div>
    );
};

export default SignUp;