import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Styling/auth.css';
import { FaUser, FaEnvelope, FaLock, FaIdCard, FaPhone, FaEye, FaEyeSlash, FaCheck, FaTimes } from 'react-icons/fa';
import API_CONFIG from '../../config/api';
import OTPInput from './OTPInput';

const SignUp = () => {
    const [step, setStep] = useState('form'); // 'form' or 'otp'
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        nationalId: '',
        phoneNumber: '',
        password: '',
        confirmPassword: ''
    });
    
    const [validationState, setValidationState] = useState({
        firstName: null,
        lastName: null,
        email: null,
        nationalId: null,
        phoneNumber: null,
        password: null,
        confirmPassword: null
    });
    
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    
    const navigate = useNavigate();
    
    useEffect(() => {
        document.body.classList.add('auth-page');
        return () => {
            document.body.classList.remove('auth-page');
        };
    }, []);
    
    const validateField = (name, value) => {
        switch (name) {
            case 'firstName':
            case 'lastName':
                return value.length >= 2 && /^[a-zA-Z\s]+$/.test(value);
            case 'email':
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            case 'nationalId':
                return /^\d{7,8}$/.test(value); // Kenyan ID format
            case 'phoneNumber':
                return /^(\+254|0)[17]\d{8}$/.test(value); // Kenyan phone format
            case 'password':
                return value.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value);
            case 'confirmPassword':
                return value === formData.password && value.length > 0;
            default:
                return true;
        }
    };
    
    const getFieldErrorMessage = (name, value) => {
        if (!value) return `${name.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`;
        
        switch (name) {
            case 'firstName':
            case 'lastName':
                if (value.length < 2) return 'Must be at least 2 characters';
                if (!/^[a-zA-Z\s]+$/.test(value)) return 'Only letters and spaces allowed';
                return '';
            case 'email':
                return 'Please enter a valid email address';
            case 'nationalId':
                return 'Please enter a valid Kenyan National ID (7-8 digits)';
            case 'phoneNumber':
                return 'Please enter a valid Kenyan phone number';
            case 'password':
                return 'Password must be 8+ characters with uppercase, lowercase, and number';
            case 'confirmPassword':
                return 'Passwords do not match';
            default:
                return '';
        }
    };
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
        
        // Real-time validation
        const isValid = validateField(name, value);
        setValidationState(prev => ({
            ...prev,
            [name]: value ? isValid : null
        }));
        
        // Special handling for confirm password
        if (name === 'password') {
            const confirmPasswordValid = formData.confirmPassword ? 
                formData.confirmPassword === value : null;
            setValidationState(prev => ({
                ...prev,
                confirmPassword: confirmPasswordValid
            }));
        }
        
        // Clear global errors
        if (error) setError('');
        if (success) setSuccess('');
    };
    
    const handleTermsChange = (e) => {
        setAgreedToTerms(e.target.checked);
    };
    
    const validateAllFields = () => {
        const newValidationState = {};
        let isFormValid = true;
        
        Object.keys(formData).forEach(key => {
            const isValid = validateField(key, formData[key]);
            newValidationState[key] = formData[key] ? isValid : false;
            if (!isValid || !formData[key]) {
                isFormValid = false;
            }
        });
        
        setValidationState(newValidationState);
        return isFormValid && agreedToTerms;
    };

    const handleVerifyOtp = async (otpCode) => {
        setIsLoading(true);
        setError('');
        
        try {
            console.log('🔐 Verifying OTP...');
            const verifyResponse = await fetch(`${API_CONFIG.ENDPOINTS.AUTH.VERIFY_OTP}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    otp: otpCode,
                    purpose: 'signup'
                }),
            });
            
            const verifyData = await verifyResponse.json();
            
            if (!verifyResponse.ok) {
                setError(verifyData.message || 'Invalid OTP. Please try again.');
                setIsLoading(false);
                return;
            }
            
            console.log('✅ OTP verified successfully');
            
            // Get token from verification response
            const token = verifyData.token;
            const user = verifyData.user;
            
            // Store auth token and user data
            localStorage.setItem('authToken', token);
            localStorage.setItem('userId', user.user_id);
            localStorage.setItem('userType', user.user_type);
            localStorage.setItem('userEmail', user.email);
            localStorage.setItem('userFirstName', user.first_name);
            localStorage.setItem('userLastName', user.last_name);
            
            // If buyer data is available, store it
            if (verifyData.buyer) {
                localStorage.setItem('buyerId', verifyData.buyer.buyer_id);
            }
            
            setSuccess('Email verified successfully! Redirecting to dashboard...');
            
            // Reset form
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                nationalId: '',
                phoneNumber: '',
                password: '',
                confirmPassword: ''
            });
            setValidationState({});
            setAgreedToTerms(false);
            
            // Redirect to buyer dashboard after 2 seconds
            setTimeout(() => {
                navigate('/buyer-dashboard');
            }, 2000);
            
        } catch (error) {
            console.error('❌ OTP verification error:', error);
            setError('Verification failed. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setIsLoading(true);
        setError('');
        
        try {
            console.log('🔄 Resending OTP...');
            const response = await fetch(`${API_CONFIG.ENDPOINTS.AUTH.RESEND_OTP}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    purpose: 'signup'
                }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                setError(data.message || 'Failed to resend OTP. Please try again.');
            } else {
                console.log('✅ OTP resent successfully');
            }
        } catch (error) {
            console.error('❌ Resend OTP error:', error);
            setError('Failed to resend OTP. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateAllFields()) {
            setError('Please fill in all fields correctly and agree to the terms');
            return;
        }
        
        if (!agreedToTerms) {
            setError('Please agree to the terms and conditions');
            return;
        }
        
        setIsLoading(true);
        setError('');
        setSuccess('');
        
        try {
            // Step 1: Create account
            console.log('📝 Creating account...');
            const response = await fetch(API_CONFIG.ENDPOINTS.AUTH.BUYER_SIGNUP, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    nationalId: formData.nationalId,
                    phoneNumber: formData.phoneNumber,
                    password: formData.password,
                    businessName: formData.firstName + ' ' + formData.lastName + '\'s Business',
                    businessType: 'retail',
                    deliveryAddress: '',
                    city: '',
                }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                setError(data.message || 'Registration failed. Please try again.');
                setIsLoading(false);
                return;
            }
            
            console.log('✅ Account created, sending OTP...');
            
            // Step 2: Send OTP to email
            try {
                const otpResponse = await fetch(`${API_CONFIG.ENDPOINTS.AUTH.SEND_OTP}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: formData.email,
                        purpose: 'signup'
                    }),
                });
                
                if (!otpResponse.ok) {
                    console.warn('⚠️ OTP send failed, but account was created. Proceeding to dashboard.');
                    // Account created successfully, show OTP screen anyway
                }
                
                console.log('✅ OTP sent successfully');
                setSuccess('Account created! Check your email for the OTP.');
                setStep('otp');
                
            } catch (otpError) {
                console.error('❌ OTP send error:', otpError);
                setSuccess('Account created! Check your email for the OTP.');
                setStep('otp');
            }
            
        } catch (error) {
            console.error('❌ Registration error:', error);
            setError('Registration failed. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToForm = () => {
        setStep('form');
        setError('');
    };
    
    const handleLoginRedirect = (e) => {
        e.preventDefault();
        navigate('/login');
    };
    
    const getInputClassName = (fieldName) => {
        const validation = validationState[fieldName];
        if (validation === null) return '';
        return validation ? 'input-valid' : 'input-error';
    };

    return (
        <div className="auth-container signup-container">
            <div className="auth-header">
                <h2>Create Your Account</h2>
                <p>Join our community of farmers and buyers</p>
            </div>
            
            {step === 'form' ? (
                <form className="auth-form signup-form" onSubmit={handleSubmit}>
                    <div className="name-row">
                        <div className="form-group">
                            <label htmlFor="firstName">
                                <FaUser className="input-icon" /> First Name
                            </label>
                            <div className="input-wrapper">
                                <input 
                                    type="text" 
                                    id="firstName" 
                                    name="firstName" 
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    placeholder="Enter first name"
                                    className={getInputClassName('firstName')}
                                    disabled={isLoading}
                                    required 
                                />
                                {validationState.firstName !== null && (
                                    <span className={`validation-icon ${validationState.firstName ? 'valid' : 'invalid'}`}>
                                        {validationState.firstName ? <FaCheck /> : <FaTimes />}
                                    </span>
                                )}
                            </div>
                            {validationState.firstName === false && (
                                <span className="error-message">
                                    {getFieldErrorMessage('firstName', formData.firstName)}
                                </span>
                            )}
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="lastName">
                                <FaUser className="input-icon" /> Last Name
                            </label>
                            <div className="input-wrapper">
                                <input 
                                    type="text" 
                                    id="lastName" 
                                    name="lastName" 
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    placeholder="Enter last name"
                                    className={getInputClassName('lastName')}
                                    disabled={isLoading}
                                    required 
                                />
                                {validationState.lastName !== null && (
                                    <span className={`validation-icon ${validationState.lastName ? 'valid' : 'invalid'}`}>
                                        {validationState.lastName ? <FaCheck /> : <FaTimes />}
                                    </span>
                                )}
                            </div>
                            {validationState.lastName === false && (
                                <span className="error-message">
                                    {getFieldErrorMessage('lastName', formData.lastName)}
                                </span>
                            )}
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="email">
                            <FaEnvelope className="input-icon" /> Email Address
                        </label>
                        <div className="input-wrapper">
                            <input 
                                type="email" 
                                id="email" 
                                name="email" 
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter email address"
                                className={getInputClassName('email')}
                                disabled={isLoading}
                                required 
                            />
                            {validationState.email !== null && (
                                <span className={`validation-icon ${validationState.email ? 'valid' : 'invalid'}`}>
                                    {validationState.email ? <FaCheck /> : <FaTimes />}
                                </span>
                            )}
                        </div>
                        {validationState.email === false && (
                            <span className="error-message">
                                {getFieldErrorMessage('email', formData.email)}
                            </span>
                        )}
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="nationalId">
                            <FaIdCard className="input-icon" /> National ID
                        </label>
                        <div className="input-wrapper">
                            <input 
                                type="text" 
                                id="nationalId" 
                                name="nationalId" 
                                value={formData.nationalId}
                                onChange={handleChange}
                                placeholder="Enter National ID"
                                className={getInputClassName('nationalId')}
                                disabled={isLoading}
                                required 
                            />
                            {validationState.nationalId !== null && (
                                <span className={`validation-icon ${validationState.nationalId ? 'valid' : 'invalid'}`}>
                                    {validationState.nationalId ? <FaCheck /> : <FaTimes />}
                                </span>
                            )}
                        </div>
                        {validationState.nationalId === false && (
                            <span className="error-message">
                                {getFieldErrorMessage('nationalId', formData.nationalId)}
                            </span>
                        )}
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="phoneNumber">
                            <FaPhone className="input-icon" /> Phone Number
                        </label>
                        <div className="input-wrapper">
                            <input 
                                type="tel" 
                                id="phoneNumber" 
                                name="phoneNumber" 
                                value={formData.phoneNumber}
                                onChange={handleChange}
                                placeholder="+254 or 07XX XXX XXX"
                                className={getInputClassName('phoneNumber')}
                                disabled={isLoading}
                                required 
                            />
                            {validationState.phoneNumber !== null && (
                                <span className={`validation-icon ${validationState.phoneNumber ? 'valid' : 'invalid'}`}>
                                    {validationState.phoneNumber ? <FaCheck /> : <FaTimes />}
                                </span>
                            )}
                        </div>
                        {validationState.phoneNumber === false && (
                            <span className="error-message">
                                {getFieldErrorMessage('phoneNumber', formData.phoneNumber)}
                            </span>
                        )}
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="password">
                            <FaLock className="input-icon" /> Password
                        </label>
                        <div className="input-wrapper">
                            <input 
                                type={showPassword ? "text" : "password"}
                                id="password" 
                                name="password" 
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Create strong password"
                                className={getInputClassName('password')}
                                disabled={isLoading}
                                required 
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={isLoading}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                            {validationState.password !== null && (
                                <span className={`validation-icon ${validationState.password ? 'valid' : 'invalid'}`}>
                                    {validationState.password ? <FaCheck /> : <FaTimes />}
                                </span>
                            )}
                        </div>
                        {validationState.password === false && (
                            <span className="error-message">
                                {getFieldErrorMessage('password', formData.password)}
                            </span>
                        )}
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="confirmPassword">
                            <FaLock className="input-icon" /> Confirm Password
                        </label>
                        <div className="input-wrapper">
                            <input 
                                type={showConfirmPassword ? "text" : "password"}
                                id="confirmPassword" 
                                name="confirmPassword" 
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Confirm your password"
                                className={getInputClassName('confirmPassword')}
                                disabled={isLoading}
                                required 
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                disabled={isLoading}
                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                            >
                                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                            {validationState.confirmPassword !== null && (
                                <span className={`validation-icon ${validationState.confirmPassword ? 'valid' : 'invalid'}`}>
                                    {validationState.confirmPassword ? <FaCheck /> : <FaTimes />}
                                </span>
                            )}
                        </div>
                        {validationState.confirmPassword === false && (
                            <span className="error-message">
                                {getFieldErrorMessage('confirmPassword', formData.confirmPassword)}
                            </span>
                        )}
                    </div>
                    
                    <div className="form-group terms-group">
                        <label className="terms-checkbox">
                            <input 
                                type="checkbox" 
                                checked={agreedToTerms}
                                onChange={handleTermsChange}
                                disabled={isLoading}
                                required
                            />
                            <span className="checkmark"></span>
                            I agree to the <a href="/terms" target="_blank">Terms of Service</a> and <a href="/privacy" target="_blank">Privacy Policy</a>
                        </label>
                    </div>
                    
                    {error && <div className="error-message">{error}</div>}
                    {success && <div className="success-message">{success}</div>}
                    
                    <button 
                        type="submit" 
                        className="auth-btn signup-btn"
                        disabled={isLoading || !agreedToTerms}
                    >
                        {isLoading ? (
                            <>
                                <span className="loading-spinner"></span>
                                Creating Account...
                            </>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>
            ) : (
                <>
                    <OTPInput 
                        email={formData.email}
                        onComplete={handleVerifyOtp}
                        onResend={handleResendOtp}
                        isLoading={isLoading}
                        error={error}
                        purpose="signup"
                    />
                    
                    {success && <div className="success-message">{success}</div>}
                    
                    <div className="auth-nav-link">
                        <button 
                            type="button"
                            className="auth-link-btn"
                            onClick={handleBackToForm}
                            disabled={isLoading}
                        >
                            ← Back to Form
                        </button>
                    </div>
                </>
            )}
            
            {step === 'form' && (
                <div className="auth-nav-link">
                    <p>
                        Already have an account? 
                        <a href="/login" onClick={handleLoginRedirect}>
                            Sign in here
                        </a>
                    </p>
                </div>
            )}
        </div>
    );
};

export default SignUp;