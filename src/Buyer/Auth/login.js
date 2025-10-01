import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Styling/auth.css';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    
    const navigate = useNavigate();
    
    useEffect(() => {
        document.body.classList.add('auth-page');
        
        // Check if user credentials are saved
        const savedEmail = localStorage.getItem('rememberedEmail');
        if (savedEmail) {
            setFormData(prev => ({ ...prev, email: savedEmail }));
            setRememberMe(true);
        }
        
        return () => {
            document.body.classList.remove('auth-page');
        };
    }, []);
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
        
        // Clear error when user starts typing
        if (error) {
            setError('');
        }
    };
    
    const handleRememberMeChange = (e) => {
        setRememberMe(e.target.checked);
    };
    
    const validateForm = () => {
        if (!formData.email.trim() || !formData.password.trim()) {
            setError('Please fill in all fields');
            return false;
        }
        
        if (!/\S+@\S+\.\S+/.test(formData.email)) {
            setError('Please enter a valid email address');
            return false;
        }
        
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            return false;
        }
        
        return true;
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        setIsLoading(true);
        setError('');
        
        // try {
        //     // Simulate API call - replace with actual API endpoint
        //     const response = await fetch('/api/auth/login', {
        //         method: 'POST',
        //         headers: {
        //             'Content-Type': 'application/json',
        //         },
        //         body: JSON.stringify({
        //             email: formData.email,
        //             password: formData.password,
        //         }),
        //     });
            
        //     // Simulate network delay for demo
        //     await new Promise(resolve => setTimeout(resolve, 1500));
            
        //     // Mock successful response
        //     const mockUser = {
        //         id: '1',
        //         email: formData.email,
        //         firstName: 'John',
        //         lastName: 'Doe',
        //         role: 'farmer'
        //     };
            
        //     // Handle remember me functionality
        //     if (rememberMe) {
        //         localStorage.setItem('rememberedEmail', formData.email);
        //     } else {
        //         localStorage.removeItem('rememberedEmail');
        //     }
            
        //     // Store user data (in real app, use secure token storage)
        //     localStorage.setItem('user', JSON.stringify(mockUser));
        //     localStorage.setItem('authToken', 'mock-jwt-token');
            
        //     console.log('Login successful:', mockUser);
            
        //     // Redirect to dashboard
        //     navigate('/dashboard');
            
        // } catch (error) {
        //     console.error('Login error:', error);
        //     setError('Login failed. Please check your credentials and try again.');
        // } finally {
        //     setIsLoading(false);
        // }
    };
    
    const handleForgotPassword = (e) => {
        e.preventDefault();
        console.log('Forgot password clicked');
        navigate('/forgot-password');
    };
    
    const handleSignUpRedirect = (e) => {
        e.preventDefault();
        navigate('/signup');
    };

    return (
        <div className="auth-container login-container">
            <div className="auth-header">
                <h2>Welcome Back!</h2>
                <p>Sign in to your KilimoSmart account</p>
            </div>
            
            <form className="auth-form login-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <div className="input-wrapper">
                        <span className="input-icon">📧</span>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Enter your email"
                            required
                            disabled={isLoading}
                        />
                    </div>
                </div>
                
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <div className="input-wrapper">
                        <span className="input-icon">🔒</span>
                        <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter your password"
                            required
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isLoading}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? '👁️' : '👁️‍🗨️'}
                        </button>
                    </div>
                </div>
                
                <div className="form-options">
                    <label className="remember-me">
                        <input 
                            type="checkbox" 
                            checked={rememberMe}
                            onChange={handleRememberMeChange}
                            disabled={isLoading}
                        />
                        Remember me
                    </label>
                    <a 
                        href="#forgot" 
                        className="forgot-password"
                        onClick={handleForgotPassword}
                    >
                        Forgot password?
                    </a>
                </div>
                
                {error && <div className="error-message">{error}</div>}
                
                <button 
                    type="submit" 
                    className="auth-btn login-btn"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <span className="loading-spinner"></span>
                            Signing In...
                        </>
                    ) : (
                        'Sign In'
                    )}
                </button>
            </form>
            
            <div className="auth-nav-link">
                <p>
                    Don't have an account? 
                    <a href="/signup" onClick={handleSignUpRedirect}>
                        Sign up here
                    </a>
                </p>
            </div>
        </div>
    );
};

export default Login;