import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Styling/auth.css';
import OTPInput from './OTPInput';
import LocationPicker from '../../components/LocationPicker';

// Import API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const SignUp = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        nationalId: '',
        phoneNumber: '',
        email: '',
        password: '',
        confirmPassword: '',
        location: null,  // Will be set by LocationPicker: {latitude, longitude, county, subcounty, address, accuracy, verified}
        farmType: '',
        farmSize: '',
        geofenceRadius: 500  // Default 500m
    });
    
    const [error, setError] = useState('');
    
    // OTP verification state
    const [showOTP, setShowOTP] = useState(false);
    const [otpError, setOtpError] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);
    const [pendingSignupData, setPendingSignupData] = useState(null);
    
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

    // Handle location data from LocationPicker component
    const handleLocationChange = (locationData) => {
        setFormData(prev => ({
            ...prev,
            location: locationData  // {latitude, longitude, county, subcounty, address, accuracy, verified}
        }));
        setError('');  // Clear any errors when location is updated
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        // Optional: Validate national ID format if provided
        if (formData.nationalId && formData.nationalId.trim()) {
            // Kenya National ID is typically 7-8 digits
            const nationalIdRegex = /^\d{7,8}$/;
            if (!nationalIdRegex.test(formData.nationalId.trim())) {
                setError('Invalid National ID format. Should be 7-8 digits.');
                return;
            }
        }
        
        if (!formData.location) {
            setError('Please select your location on the map');
            return;
        }

        // Security check: Ensure location is verified by LocationPicker
        if (!formData.location.verified) {
            setError('⚠️ Please verify your location using the GPS button in the location picker');
            return;
        }

        try {
            const signupData = {
                // User data
                firstName: formData.firstName,
                lastName: formData.lastName,
                nationalId: formData.nationalId || null, // Optional field
                phoneNumber: formData.phoneNumber,
                email: formData.email,
                password: formData.password,
                userType: 'farmer',
                
                // Location data (from LocationPicker component)
                location: {
                    latitude: formData.location.latitude,
                    longitude: formData.location.longitude,
                    county: formData.location.county,
                    subcounty: formData.location.subcounty,
                    addressDescription: formData.location.address,
                    geofenceRadius: formData.geofenceRadius,
                    accuracy: formData.location.accuracy,
                    verified: formData.location.verified
                },
                
                // Farm data
                farmType: formData.farmType,
                farmSize: formData.farmSize,
            };

            // Store signup data temporarily
            setPendingSignupData(signupData);

            // Send OTP to email for verification
            await sendOTP(formData.email);
            
            // Show OTP verification screen
            setShowOTP(true);
            setError('');
            
        } catch (err) {
            console.error('Signup error:', err);
            setError(err.message || 'Failed to send verification code. Please try again.');
        }
    };

    const sendOTP = async (email) => {
        try {
            // API call to send OTP
            const response = await axios.post(`${API_BASE_URL}/api/auth/send-otp`, {
                email: email,
                purpose: 'signup'
            });

            console.log('OTP sent successfully:', response.data);
            
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to send OTP');
            }
            
        } catch (error) {
            console.error('Send OTP error:', error);
            throw new Error(error.response?.data?.message || 'Failed to send verification code. Please try again.');
        }
    };

    const handleOTPComplete = async (otpCode) => {
        setOtpError('');
        setOtpLoading(true);

        try {
            // Step 1: Verify OTP
            const otpResponse = await axios.post(`${API_BASE_URL}/api/auth/verify-otp`, {
                email: formData.email,
                otp: otpCode,
                purpose: 'signup'
            });

            if (!otpResponse.data.success) {
                throw new Error(otpResponse.data.message || 'Invalid OTP');
            }

            console.log('OTP verified successfully:', otpResponse.data);

            // Step 2: Create account after OTP verification
            const response = await axios.post(
                `${API_BASE_URL}/api/auth/farmer/signup`,
                {
                    ...pendingSignupData,
                    emailVerified: true // Mark email as verified
                }
            );

            console.log('Signup successful:', response.data);
            alert('Account created successfully! Please login to continue.');
            navigate('/loginF');
            
        } catch (err) {
            console.error('OTP verification error:', err);
            setOtpError(err.response?.data?.message || 'Invalid or expired OTP. Please try again.');
        } finally {
            setOtpLoading(false);
        }
    };

    const handleResendOTP = async () => {
        setOtpError('');
        try {
            await sendOTP(formData.email);
            console.log('OTP resent successfully');
        } catch (error) {
            setOtpError('Failed to resend OTP. Please try again.');
        }
    };

    const handleBackToSignup = () => {
        setShowOTP(false);
        setOtpError('');
        setPendingSignupData(null);
    };

    return (
        <div className="auth-container signup-container">
            {!showOTP ? (
                <>
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
                    <label htmlFor="nationalId">🆔 National ID (Optional)</label>
                    <input 
                        type="text" 
                        id="nationalId"
                        name="nationalId" 
                        placeholder="Enter your national ID number" 
                        value={formData.nationalId} 
                        onChange={handleChange}
                        maxLength="20"
                    />
                    <small style={{ color: '#666', fontSize: '0.85rem' }}>
                        Optional: You can add this later in your profile
                    </small>
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

                {/* Location Section - Using LocationPicker Component */}
                <div className="form-group">
                    <label>📍 Farm Location</label>
                    <p className="location-help">
                        🎯 Use GPS to detect your current location, or search/click the map to set your farm location
                    </p>
                    
                    <LocationPicker
                        onLocationChange={handleLocationChange}
                        geofenceRadius={formData.geofenceRadius}
                        showSearch={true}
                        showMap={true}
                        showCountyInputs={true}
                        required={true}
                    />
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
                    disabled={!formData.location?.verified}
                    className="auth-btn"
                >
                    🚀 Create Farmer Account
                </button>
                
                <p className="auth-redirect">
                    Already have an account? <a href="/loginF">Login here</a>
                </p>
            </form>
            </>
            ) : (
                <>
                    <div className="otp-back-btn">
                        <button onClick={handleBackToSignup} className="back-link">
                            ← Back to Sign Up
                        </button>
                    </div>
                    
                    <OTPInput
                        length={6}
                        onComplete={handleOTPComplete}
                        onResend={handleResendOTP}
                        email={formData.email}
                        isLoading={otpLoading}
                        error={otpError}
                        purpose="signup"
                    />
                </>
            )}
        </div>
    );
};

export default SignUp;