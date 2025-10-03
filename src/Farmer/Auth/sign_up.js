//A signUp page with location verification(farmer radius) using OpenStreetMap with Nominatim API
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Styling/auth.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
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
        nationalID: '',
        phoneNumber: '',
        email: '',
        password: '',
        confirmPassword: '',
        location: null,
        county: '',
        subcounty: '',
        farmType: '',
        farmSize: ''
    });
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [mapCenter, setMapCenter] = useState([-0.0236, 37.9062]);
    const [mapZoom, setMapZoom] = useState(6);
    const [selectedCounty, setSelectedCounty] = useState('');
    const [selectedSubcounty, setSelectedSubcounty] = useState('');
    const [filteredSubcounties, setFilteredSubcounties] = useState([]);
    const navigate = useNavigate();

    // Kenya Counties and Subcounties Data
    const kenyaCounties = {
        'Nairobi': ['Westlands', 'Dagoretti North', 'Dagoretti South', 'Langata', 'Kibra', 'Roysambu', 'Kasarani', 'Ruaraka', 'Embakasi South', 'Embakasi North', 'Embakasi Central', 'Embakasi East', 'Embakasi West', 'Makadara', 'Kamukunji', 'Starehe', 'Mathare'],
        'Mombasa': ['Changamwe', 'Jomba', 'Kisauni', 'Nyali', 'Likoni', 'Mvita'],
        'Kwale': ['Msambweni', 'Lunga Lunga', 'Matuga', 'Kinango'],
        'Kilifi': ['Kilifi North', 'Kilifi South', 'Kaloleni', 'Rabai', 'Ganze', 'Malindi', 'Magarini'],
        'Tana River': ['Garsen', 'Galole', 'Bura'],
        'Lamu': ['Lamu East', 'Lamu West'],
        'Taita Taveta': ['Taveta', 'Wundanyi', 'Mwatate', 'Voi'],
        'Garissa': ['Garissa Township', 'Balambala', 'Lagdera', 'Dadaab', 'Fafi', 'Ijara'],
        'Wajir': ['Wajir North', 'Wajir East', 'Tarbaj', 'Wajir West', 'Eldas', 'Wajir South'],
        'Mandera': ['Mandera West', 'Banissa', 'Mandera North', 'Mandera South', 'Mandera East', 'Lafey'],
        'Marsabit': ['Moyale', 'North Horr', 'Saku', 'Laisamis'],
        'Isiolo': ['Isiolo North', 'Isiolo South'],
        'Meru': ['Igembe South', 'Igembe Central', 'Igembe North', 'Tigania West', 'Tigania East', 'North Imenti', 'Buuri', 'Central Imenti', 'South Imenti'],
        'Tharaka Nithi': ['Tharaka', 'Chuka/Igambang\'ombe', 'Maara'],
        'Embu': ['Manyatta', 'Runyenjes', 'Mbeere South', 'Mbeere North'],
        'Kitui': ['Mwingi North', 'Mwingi West', 'Mwingi Central', 'Kitui West', 'Kitui Rural', 'Kitui Central', 'Kitui East', 'Kitui South'],
        'Machakos': ['Masinga', 'Yatta', 'Kangundo', 'Matungulu', 'Kathiani', 'Mavoko', 'Machakos Town', 'Mwala'],
        'Makueni': ['Kilome', 'Makueni', 'Kibwezi West', 'Kibwezi East', 'Kaiti', 'Mbooni'],
        'Nyandarua': ['Kinangop', 'Kipipiri', 'Ol Kalou', 'Ol Joro Orok', 'Ndaragwa'],
        'Nyeri': ['Tetu', 'Kieni', 'Mathira', 'Othaya', 'Mukurweini', 'Nyeri Town'],
        'Kirinyaga': ['Mwea', 'Gichugu', 'Ndia', 'Kirinyaga Central'],
        'Murang\'a': ['Kangema', 'Mathioya', 'Kiharu', 'Kigumo', 'Maragwa', 'Kandara', 'Gatanga'],
        'Kiambu': ['Gatundu South', 'Gatundu North', 'Juja', 'Thika Town', 'Ruiru', 'Githunguri', 'Kiambu Town', 'Kiambaa', 'Kabete', 'Kikuyu', 'Limuru', 'Lari'],
        'Turkana': ['Turkana North', 'Turkana West', 'Turkana Central', 'Loima', 'Turkana South', 'Turkana East'],
        'West Pokot': ['Kapenguria', 'Sigor', 'Kacheliba', 'Pokot South'],
        'Samburu': ['Samburu West', 'Samburu North', 'Samburu East'],
        'Trans Nzoia': ['Kwanza', 'Endebess', 'Saboti', 'Kiminini', 'Cherangany'],
        'Uasin Gishu': ['Soy', 'Turbo', 'Moiben', 'Ainabkoi', 'Kapseret', 'Kesses'],
        'Elgeyo Marakwet': ['Marakwet East', 'Marakwet West', 'Keiyo North', 'Keiyo South'],
        'Nandi': ['Tinderet', 'Aldai', 'Nandi Hills', 'Chesumei', 'Emgwen', 'Mosop'],
        'Baringo': ['Tiaty', 'Baringo North', 'Baringo Central', 'Baringo South', 'Mogotio', 'Eldama Ravine'],
        'Laikipia': ['Laikipia West', 'Laikipia East', 'Laikipia North'],
        'Nakuru': ['Molo', 'Njoro', 'Naivasha', 'Gilgil', 'Kuresoi South', 'Kuresoi North', 'Subukia', 'Rongai', 'Bahati', 'Nakuru Town West', 'Nakuru Town East'],
        'Narok': ['Kilgoris', 'Emurua Dikirr', 'Narok North', 'Narok East', 'Narok South', 'Narok West'],
        'Kajiado': ['Kajiado North', 'Kajiado Central', 'Kajiado East', 'Kajiado West', 'Kajiado South'],
        'Kericho': ['Kipkelion East', 'Kipkelion West', 'Ainamoi', 'Bureti', 'Belgut', 'Sigowet/Soin'],
        'Bomet': ['Sotik', 'Chepalungu', 'Bomet East', 'Bomet Central', 'Konoin'],
        'Kakamega': ['Lugari', 'Likuyani', 'Malava', 'Lurambi', 'Navakholo', 'Mumias West', 'Mumias East', 'Matungu', 'Butere', 'Khwisero', 'Shinyalu', 'Ikolomani'],
        'Vihiga': ['Vihiga', 'Sabatia', 'Hamisi', 'Luanda', 'Emuhaya'],
        'Bungoma': ['Mt. Elgon', 'Sirisia', 'Kabuchai', 'Bumula', 'Kanduyi', 'Webuye East', 'Webuye West', 'Kimilili', 'Tongaren'],
        'Busia': ['Teso North', 'Teso South', 'Nambale', 'Matayos', 'Butula', 'Funyula', 'Budalangi'],
        'Siaya': ['Ugenya', 'Ugunja', 'Alego Usonga', 'Gem', 'Bondo', 'Rarieda'],
        'Kisumu': ['Kisumu East', 'Kisumu West', 'Kisumu Central', 'Seme', 'Nyando', 'Muhoroni', 'Nyakach'],
        'Homa Bay': ['Kasipul', 'Kabondo Kasipul', 'Karachuonyo', 'Rangwe', 'Homa Bay Town', 'Ndhiwa', 'Suba North', 'Suba South'],
        'Migori': ['Rongo', 'Awendo', 'Suna East', 'Suna West', 'Uriri', 'Nyatike', 'Kuria West', 'Kuria East'],
        'Kisii': ['Bonchari', 'South Mugirango', 'Bomachoge Borabu', 'Bobasi', 'Bomachoge Chache', 'Nyaribari Masaba', 'Nyaribari Chache', 'Kitutu Chache North', 'Kitutu Chache South'],
        'Nyamira': ['Kitutu Masaba', 'West Mugirango', 'North Mugirango', 'Borabu']
    };

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
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleCountyChange = (e) => {
        const county = e.target.value;
        setSelectedCounty(county);
        setSelectedSubcounty('');
        setFormData({ 
            ...formData, 
            county: county,
            subcounty: ''
        });
        setFilteredSubcounties(kenyaCounties[county] || []);
        
        // Auto-search and center map on county
        if (county) {
            handleSearch(county);
        }
    };

    const handleSubcountyChange = (e) => {
        const subcounty = e.target.value;
        setSelectedSubcounty(subcounty);
        setFormData({ 
            ...formData, 
            subcounty: subcounty
        });
        
        // Auto-search for subcounty location
        if (subcounty && selectedCounty) {
            handleSearch(`${subcounty}, ${selectedCounty}`);
        }
    };

    const handleFarmDetailsChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };
    const handleMapClick = (e) => {
        const { lat, lng } = e.latlng;
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
                },
            });
            const address = response.data.display_name;
            setFormData((prevData) => ({ ...prevData, address }));
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
        
        // Debounce search to avoid too many API calls
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
        try {
            const response = await axios.post('https://kilimosmart-backend.onrender.com/api/farmers/signup', formData);
            if (response.status === 201) {
                navigate('/loginF');
            } else {
                setError('Sign up failed. Please try again.');
            }
        } catch (err) {
            console.error('Error during sign up:', err);
            setError('Sign up failed. Please try again.');
        }
    };
    const LocationMarker = () => {
        useMapEvents({
            click: handleMapClick,
        });
        return formData.location ? <Marker position={[formData.location.lat, formData.location.lng]} /> : null;
    };
    return (
        <div className="auth-container">
            <h2>🌾 Farmer Sign Up</h2>
            <p className="signup-description">Join KilimoSmart and connect with buyers across Kenya</p>
            <form onSubmit={handleSubmit} className="auth-form">
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

                {/* National ID and Phone Number side by side */}
                <div className="filter-row">
                    <div className="form-group">
                        <label htmlFor="nationalID">🆔 National ID Number</label>
                        <input 
                            type="text" 
                            id="nationalID"
                            name="nationalID" 
                            placeholder="Enter your national ID number" 
                            value={formData.nationalID} 
                            onChange={handleChange} 
                            required 
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="phoneNumber">📞 Phone Number</label>
                        <input 
                            type="tel" 
                            id="phoneNumber"
                            name="phoneNumber" 
                            placeholder="Enter your phone number" 
                            value={formData.phoneNumber} 
                            onChange={handleChange} 
                            required 
                        />
                    </div>
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

                {/* Location Filters */}
                <div className="filters-section">
                    <h3 className="section-title">🗺️ Location Details</h3>
                    
                    <div className="filter-row">
                        <div className="form-group">
                            <label htmlFor="county">🏛️ County</label>
                            <select 
                                id="county"
                                name="county"
                                value={selectedCounty}
                                onChange={handleCountyChange}
                                required
                            >
                                <option value="">Select County</option>
                                {Object.keys(kenyaCounties).sort().map(county => (
                                    <option key={county} value={county}>{county}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="subcounty">🏘️ Subcounty</label>
                            <select 
                                id="subcounty"
                                name="subcounty"
                                value={selectedSubcounty}
                                onChange={handleSubcountyChange}
                                disabled={!selectedCounty}
                                required
                            >
                                <option value="">Select Subcounty</option>
                                {filteredSubcounties.map(subcounty => (
                                    <option key={subcounty} value={subcounty}>{subcounty}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                
                <div className="form-group">
                    <label>📍 Farm Location</label>
                    <p className="location-help">Search for your location or click on the map to mark your farm's location in Kenya</p>
                    
                    {/* Search Bar */}
                    <div className="location-search">
                        <div className="search-input-wrapper">
                            <input
                                type="text"
                                placeholder="🔍 Search for your town, city, or area in Kenya..."
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
                        
                        {/* Search Results */}
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
                    
                    <div className="map-container">
                        <MapContainer 
                            center={mapCenter} 
                            zoom={mapZoom} 
                            style={{ height: '350px', width: '100%' }}
                            key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`}
                        >
                            <TileLayer 
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            <LocationMarker />
                        </MapContainer>
                        
                        {/* Conditional instruction overlay - only shows when no location is selected */}
                        {!formData.location && (
                            <div className="map-instruction">
                                📍 Click on the map to select your farm location
                            </div>
                        )}
                        
                        {formData.location && (
                            <div className="selected-location">
                                📍 Selected Location: {formData.address || `${formData.location.lat.toFixed(4)}, ${formData.location.lng.toFixed(4)}`}
                            </div>
                        )}
                    </div>
                </div>

                {/* Password fields side by side */}
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
                
                {error && <div className="error-message">⚠️ {error}</div>}
                <button type="submit" disabled={!formData.location}>
                    🚀 Create Farmer Account
                </button>
            </form>
        </div>
    );
};

export default SignUp;