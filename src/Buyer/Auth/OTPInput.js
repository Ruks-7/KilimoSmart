import React, { useState, useRef, useEffect } from 'react';
import './Styling/auth.css';

const OTPInput = ({ 
  length = 6, 
  onComplete, 
  onResend, 
  email, 
  isLoading,
  error,
  purpose = 'login' // 'login', 'signup', 'password_reset'
}) => {
  const [otp, setOtp] = useState(new Array(length).fill(''));
  const [timer, setTimer] = useState(600); // 10 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  useEffect(() => {
    // Countdown timer
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    
    // Handle paste
    if (value.length > 1) {
      const pastedData = value.slice(0, length).split('');
      pastedData.forEach((char, i) => {
        if (index + i < length) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);
      
      // Focus last filled input or next empty
      const lastFilledIndex = Math.min(index + pastedData.length, length - 1);
      inputRefs.current[lastFilledIndex]?.focus();
      
      // Check if complete
      if (newOtp.every(digit => digit !== '')) {
        onComplete(newOtp.join(''));
      }
      return;
    }

    // Handle single character
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    if (newOtp.every(digit => digit !== '')) {
      onComplete(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      
      if (otp[index]) {
        // Clear current input
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      } else if (index > 0) {
        // Move to previous input and clear it
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    }

    // Handle left arrow
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Handle right arrow
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();
    
    if (/^\d+$/.test(pastedData)) {
      const digits = pastedData.slice(0, length).split('');
      const newOtp = [...otp];
      
      digits.forEach((digit, i) => {
        newOtp[i] = digit;
      });
      
      setOtp(newOtp);
      
      // Focus last filled input
      const lastIndex = Math.min(digits.length - 1, length - 1);
      inputRefs.current[lastIndex]?.focus();
      
      // Check if complete
      if (newOtp.every(digit => digit !== '')) {
        onComplete(newOtp.join(''));
      }
    }
  };

  const handleResend = async () => {
    if (!canResend || isLoading) return;
    
    setOtp(new Array(length).fill(''));
    setTimer(600); // Reset to 10 minutes
    setCanResend(false);
    inputRefs.current[0]?.focus();
    
    await onResend();
  };

  const getPurposeText = () => {
    switch (purpose) {
      case 'signup':
        return 'verify your email and complete registration';
      case 'password_reset':
        return 'reset your password';
      case 'login':
      default:
        return 'complete your login';
    }
  };

  return (
    <div className="otp-container">
      <div className="otp-header">
        <div className="otp-icon">📧</div>
        <h3>Verify Your Email</h3>
        <p className="otp-instruction">
          We've sent a 6-digit code to <strong>{email}</strong>
        </p>
        <p className="otp-purpose">
          Enter the code to {getPurposeText()}
        </p>
      </div>

      <div className="otp-inputs">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className={`otp-input ${digit ? 'filled' : ''} ${error ? 'error' : ''}`}
            disabled={isLoading}
            autoComplete="off"
          />
        ))}
      </div>

      {error && (
        <div className="otp-error">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="otp-timer">
        {timer > 0 ? (
          <p>
            Code expires in <strong>{formatTime(timer)}</strong>
          </p>
        ) : (
          <p className="expired">Code has expired</p>
        )}
      </div>

      <div className="otp-actions">
        <button
          type="button"
          onClick={handleResend}
          className={`resend-btn ${canResend && !isLoading ? 'active' : ''}`}
          disabled={!canResend || isLoading}
        >
          {isLoading ? (
            <>
              <div className="loading-spinner small"></div>
              <span>Sending...</span>
            </>
          ) : (
            <>
              <span>🔄</span>
              <span>{canResend ? 'Resend Code' : 'Resend available after timer'}</span>
            </>
          )}
        </button>
      </div>

      <div className="otp-help">
        <p>
          Didn't receive the code? Check your spam folder or{' '}
          <a href={`mailto:support@kilimosmart.com?subject=OTP Issue&body=I didn't receive OTP for ${email}`}>
            contact support
          </a>
        </p>
      </div>
    </div>
  );
};

export default OTPInput;
