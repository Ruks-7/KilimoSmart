import React, { useState, useEffect } from 'react';
import './Styling/styles.css';
import { FaUser, FaEnvelope, FaLock, FaIdCard, FaPhone } from 'react-icons/fa';


const SignUp = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        nationalId: '',
        phoneNumber: '',
        password: '',
        confirmPassword: ''
    });
    
    const [passwordMatch, setPasswordMatch] = useState(true);
    
    // Add signup-page class to body when component mounts
    useEffect(() => {
        document.body.classList.add('signup-page');
        return () => {
            document.body.classList.remove('signup-page');
        };
    }, []);
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
        
        if (name === 'confirmPassword') {
            setPasswordMatch(value === formData.password);
        } else if (name === 'password') {
            setPasswordMatch(formData.confirmPassword === '' || value === formData.confirmPassword);
        }
    };
    
    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setPasswordMatch(false);
            return;
        }
        console.log('Form submitted:', formData);
    };

    return (
        <div className="signup-container">
            <div className="signup-header">
                <h2>Create Your Account</h2>
                <p>Join our community of farmers and buyers</p>
            </div>
            <form className="signup-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="firstName"><FaUser className="input-icon" /> First Name:</label>
                    <input 
                        type="text" 
                        id="firstName" 
                        name="firstName" 
                        value={formData.firstName}
                        onChange={handleChange}
                        required 
                    />
                </div>
                
                <div className="form-group">
                    <label htmlFor="lastName"><FaUser className="input-icon" /> Last Name:</label>
                    <input 
                        type="text" 
                        id="lastName" 
                        name="lastName" 
                        value={formData.lastName}
                        onChange={handleChange}
                        required 
                    />
                </div>
                
                <div className="form-group">
                    <label htmlFor="email"><FaEnvelope className="input-icon" /> Email:</label>
                    <input 
                        type="email" 
                        id="email" 
                        name="email" 
                        value={formData.email}
                        onChange={handleChange}
                        required 
                    />
                </div>
                
                <div className="form-group">
                    <label htmlFor="nationalId"><FaIdCard className="input-icon" /> National ID:</label>
                    <input 
                        type="text" 
                        id="nationalId" 
                        name="nationalId" 
                        value={formData.nationalId}
                        onChange={handleChange}
                        required 
                    />
                </div>
                
                <div className="form-group">
                    <label htmlFor="phoneNumber"><FaPhone className="input-icon" /> Phone Number:</label>
                    <input 
                        type="tel" 
                        id="phoneNumber" 
                        name="phoneNumber" 
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        required 
                    />
                </div>
                
                <div className="form-group">
                    <label htmlFor="password"><FaLock className="input-icon" /> Password:</label>
                    <input 
                        type="password" 
                        id="password" 
                        name="password" 
                        value={formData.password}
                        onChange={handleChange}
                        required 
                    />
                </div>
                
                <div className="form-group">
                    <label htmlFor="confirmPassword"><FaLock className="input-icon" /> Confirm Password:</label>
                    <input 
                        type="password" 
                        id="confirmPassword" 
                        name="confirmPassword" 
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required 
                        className={!passwordMatch ? 'input-error' : ''}
                    />
                    {!passwordMatch && <p className="error-message">Passwords do not match</p>}
                </div>
                
                <button type="submit" className="signup-btn">Sign Up</button>
            </form>
            <div className="login-link">
                <p>Already have an account? <a href="/login">Login here</a></p>
            </div>
        </div>
    );
};

export default SignUp;

