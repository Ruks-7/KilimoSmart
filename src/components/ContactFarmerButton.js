import React, { useState } from 'react';
import './CameraCapture.css'; // Reuse existing component styles
import API_CONFIG from '../config/api';

const ContactFarmerButton = ({ farmerId, farmerName, productName, onConversationCreated }) => {
  const [isCreating, setIsCreating] = useState(false);

  const handleContactFarmer = async () => {
    try {
      setIsCreating(true);
      const token = localStorage.getItem('authToken');

      if (!token) {
        alert('Please login to contact the farmer');
        return;
      }

      console.log('Creating conversation with:', { farmerId, productName });
      console.log('API URL:', API_CONFIG.ENDPOINTS.MESSAGES.CONVERSATIONS);

      // Validate farmerId
      if (!farmerId) {
        alert('Farmer information is missing. Please try again.');
        console.error('Missing farmerId:', { farmerId, productName });
        return;
      }

      // Create or get existing conversation
      const response = await fetch(API_CONFIG.ENDPOINTS.MESSAGES.CONVERSATIONS, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          farmerId: farmerId,
          subject: productName ? `Inquiry about ${productName}` : 'Product Inquiry'
        })
      });

      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        // Notify parent component to switch to messages tab
        if (onConversationCreated) {
          onConversationCreated(data.conversationId);
        } else {
          alert(`Conversation ${data.isNew ? 'started' : 'opened'}! Check your Messages tab.`);
        }
      } else {
        console.error('Failed to create conversation:', data);
        alert(data.message || 'Failed to start conversation');
        
        // Show debug info if available
        if (data.debug) {
          console.error('Debug info:', data.debug);
        }
        if (data.error) {
          console.error('Server error:', data.error);
        }
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert(`Failed to contact farmer: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <button
      className="contact-farmer-btn"
      onClick={handleContactFarmer}
      disabled={isCreating}
      title={`Contact ${farmerName || 'farmer'}`}
    >
      {isCreating ? '⏳' : '💬'} Contact Farmer
    </button>
  );
};

export default ContactFarmerButton;
