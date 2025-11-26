import React, { useState } from 'react';
import { FaQuestionCircle, FaTimes, FaBook, FaPlay, FaEnvelope } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './HelpButton.css';

const HelpButton = ({ onRestartTour }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const toggleHelp = () => {
    setIsOpen(!isOpen);
  };

  const handleFAQClick = () => {
    navigate('/faq');
    setIsOpen(false);
  };

  const handleTourClick = () => {
    // Trigger the restart tour button
    const restartBtn = document.getElementById('restart-tour-btn');
    if (restartBtn) {
      restartBtn.click();
    }
    if (onRestartTour) {
      onRestartTour();
    }
    setIsOpen(false);
  };

  const handleContactClick = () => {
    // Navigate to messages or open contact form
    navigate('/messages');
    setIsOpen(false);
  };

  return (
    <div className="help-button-container">
      {/* Floating Help Button */}
      <button
        className={`help-button ${isOpen ? 'active' : ''}`}
        onClick={toggleHelp}
        title="Help & Support"
      >
        {isOpen ? <FaTimes /> : <FaQuestionCircle />}
      </button>

      {/* Help Menu */}
      {isOpen && (
        <div className="help-menu">
          <div className="help-menu-header">
            <h3>How can we help?</h3>
          </div>
          <div className="help-menu-options">
            <button className="help-option" onClick={handleFAQClick}>
              <FaBook className="help-option-icon" />
              <div className="help-option-content">
                <h4>FAQs</h4>
                <p>Find answers to common questions</p>
              </div>
            </button>

            <button className="help-option" onClick={handleTourClick}>
              <FaPlay className="help-option-icon" />
              <div className="help-option-content">
                <h4>Take a Tour</h4>
                <p>Learn how to use the platform</p>
              </div>
            </button>

            <button className="help-option" onClick={handleContactClick}>
              <FaEnvelope className="help-option-icon" />
              <div className="help-option-content">
                <h4>Contact Support</h4>
                <p>Get help from our team</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Overlay */}
      {isOpen && <div className="help-overlay" onClick={toggleHelp}></div>}
    </div>
  );
};

export default HelpButton;
