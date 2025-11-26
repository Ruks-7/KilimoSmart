import React, { useState, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import './OnboardingTour.css';

const OnboardingTour = ({ userType = 'buyer' }) => {
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding before
    const hasCompletedOnboarding = localStorage.getItem(`onboarding_${userType}_completed`);
    if (!hasCompletedOnboarding) {
      // Delay the tour start to ensure DOM is ready
      const timer = setTimeout(() => {
        setRunTour(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [userType]);

  const buyerSteps = [
    {
      target: 'body',
      content: (
        <div className="tour-content">
          <h2>Welcome to KilimoSmart! 🌾</h2>
          <p>Let's take a quick tour to help you get started as a buyer. This will only take a minute!</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.products-section',
      content: (
        <div className="tour-content">
          <h3>Browse Products</h3>
          <p>Explore fresh produce from local farmers. You can filter by category, location, and price to find exactly what you need.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '.search-bar',
      content: (
        <div className="tour-content">
          <h3>Search for Products</h3>
          <p>Use the search bar to quickly find specific products or farmers in your area.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '.contact-farmer-btn',
      content: (
        <div className="tour-content">
          <h3>Contact Farmers</h3>
          <p>Click here to message farmers directly. Ask questions, negotiate prices, or arrange delivery details.</p>
        </div>
      ),
      placement: 'left',
    },
    {
      target: '.cart-icon',
      content: (
        <div className="tour-content">
          <h3>Your Shopping Cart</h3>
          <p>Add items to your cart and proceed to checkout when you're ready to place your order.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '.messages-link',
      content: (
        <div className="tour-content">
          <h3>Messages</h3>
          <p>View all your conversations with farmers here. Stay updated on your orders and inquiries.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '.orders-link',
      content: (
        <div className="tour-content">
          <h3>My Orders</h3>
          <p>Track all your orders here - pending, confirmed, and completed purchases.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: 'body',
      content: (
        <div className="tour-content">
          <h2>You're All Set! 🎉</h2>
          <p>Start exploring fresh produce from local farmers. Happy shopping!</p>
          <p className="tour-tip">💡 Tip: You can restart this tour anytime from the Help menu.</p>
        </div>
      ),
      placement: 'center',
    },
  ];

  const farmerSteps = [
    {
      target: 'body',
      content: (
        <div className="tour-content">
          <h2>Welcome to KilimoSmart! 🌱</h2>
          <p>Let's show you how to start selling your produce online. This quick tour will get you started!</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.add-product-btn',
      content: (
        <div className="tour-content">
          <h3>Add Your Products</h3>
          <p>Click here to list your produce. Add photos, set prices, and describe what you're selling.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '.my-products',
      content: (
        <div className="tour-content">
          <h3>Manage Your Listings</h3>
          <p>View, edit, or remove your products here. Update quantities and prices as needed.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '.orders-section',
      content: (
        <div className="tour-content">
          <h3>Order Management</h3>
          <p>All incoming orders appear here. Confirm orders, update status, and communicate with buyers.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '.messages-link',
      content: (
        <div className="tour-content">
          <h3>Customer Messages</h3>
          <p>Respond to buyer inquiries promptly to build trust and close more sales.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '.sales-stats',
      content: (
        <div className="tour-content">
          <h3>Track Your Sales</h3>
          <p>Monitor your sales performance, revenue, and customer reviews here.</p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '.profile-section',
      content: (
        <div className="tour-content">
          <h3>Your Profile</h3>
          <p>Keep your profile updated with accurate contact information and delivery areas.</p>
        </div>
      ),
      placement: 'left',
    },
    {
      target: 'body',
      content: (
        <div className="tour-content">
          <h2>Ready to Grow Your Business! 🚀</h2>
          <p>Start listing your products and connect with buyers in your area.</p>
          <p className="tour-tip">💡 Tip: Quality photos and detailed descriptions help attract more buyers!</p>
        </div>
      ),
      placement: 'center',
    },
  ];

  const adminSteps = [
    {
      target: 'body',
      content: (
        <div className="tour-content">
          <h2>Admin Dashboard Tour 👨‍💼</h2>
          <p>Welcome! Let's explore the admin panel features.</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.users-section',
      content: (
        <div className="tour-content">
          <h3>User Management</h3>
          <p>View and manage all users - buyers, farmers, and other admins. Monitor user activity and handle disputes.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '.transactions-section',
      content: (
        <div className="tour-content">
          <h3>Transactions</h3>
          <p>Monitor all platform transactions, payments, and financial activities.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '.reports-section',
      content: (
        <div className="tour-content">
          <h3>Reports & Analytics</h3>
          <p>Generate reports on sales, user activity, and platform performance.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '.messages-section',
      content: (
        <div className="tour-content">
          <h3>Support Messages</h3>
          <p>Handle user support requests and resolve issues promptly.</p>
        </div>
      ),
      placement: 'bottom',
    },
  ];

  const getSteps = () => {
    switch (userType) {
      case 'farmer':
        return farmerSteps;
      case 'admin':
        return adminSteps;
      default:
        return buyerSteps;
    }
  };

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      localStorage.setItem(`onboarding_${userType}_completed`, 'true');
    }
  };

  const restartTour = () => {
    setRunTour(true);
  };

  return (
    <>
      <Joyride
        steps={getSteps()}
        run={runTour}
        continuous
        showProgress
        showSkipButton
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: '#2d7a4f',
            textColor: '#2d3748',
            backgroundColor: '#ffffff',
            overlayColor: 'rgba(0, 0, 0, 0.5)',
            arrowColor: '#ffffff',
            zIndex: 10000,
          },
          tooltip: {
            borderRadius: '12px',
            padding: '20px',
            fontSize: '16px',
          },
          tooltipContainer: {
            textAlign: 'left',
          },
          buttonNext: {
            backgroundColor: '#2d7a4f',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
          },
          buttonBack: {
            color: '#4a5568',
            marginRight: '10px',
            fontSize: '14px',
          },
          buttonSkip: {
            color: '#718096',
            fontSize: '14px',
          },
        }}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Finish',
          next: 'Next',
          skip: 'Skip Tour',
        }}
      />
      
      {/* Hidden button to restart tour - can be triggered from Help menu */}
      <button
        id="restart-tour-btn"
        onClick={restartTour}
        style={{ display: 'none' }}
      >
        Restart Tour
      </button>
    </>
  );
};

export default OnboardingTour;
