import React, { useState } from 'react';
import './FAQ.css';
import { FaChevronDown, FaChevronUp, FaQuestionCircle } from 'react-icons/fa';

const FAQ = () => {
  const [activeCategory, setActiveCategory] = useState('general');
  const [openQuestion, setOpenQuestion] = useState(null);

  const faqData = {
    general: [
      {
        question: "What is KilimoSmart?",
        answer: "KilimoSmart is a digital platform that connects farmers directly with buyers, eliminating middlemen and ensuring fair prices for both parties. We provide a seamless marketplace for fresh agricultural produce in Kenya."
      },
      {
        question: "How do I get started?",
        answer: "Simply sign up as either a Farmer or Buyer, complete your profile, and you're ready to go! Farmers can list their products, while buyers can browse and purchase fresh produce directly from farmers."
      },
      {
        question: "Is the platform free to use?",
        answer: "Yes! Creating an account and browsing products is completely free. We only charge a small transaction fee when a sale is completed to maintain and improve our platform."
      },
      {
        question: "What payment methods are supported?",
        answer: "We support M-Pesa payments for secure and convenient transactions. Cash on delivery may also be available depending on the arrangement with the farmer."
      },
      {
        question: "How is my data protected?",
        answer: "We take data security seriously. All sensitive information is encrypted, and we never share your personal data with third parties without your consent."
      }
    ],
    buyers: [
      {
        question: "How do I place an order?",
        answer: "Browse available products, add items to your cart, and proceed to checkout. You can filter products by location, price, and category to find exactly what you need."
      },
      {
        question: "Can I contact farmers directly?",
        answer: "Yes! Each product listing has a 'Contact Farmer' button that allows you to message the farmer directly to discuss details, negotiate bulk orders, or ask questions about the produce."
      },
      {
        question: "What if I'm not satisfied with my purchase?",
        answer: "You can leave a review and rating for the farmer. If there's a serious issue, contact our support team through the messaging system, and we'll help resolve it."
      },
      {
        question: "Can I pre-order products?",
        answer: "Yes! Many farmers offer pre-order options for products that are not yet harvested. This allows you to secure products in advance and helps farmers plan their harvest."
      },
      {
        question: "How do I track my orders?",
        answer: "Go to your dashboard and click on 'My Orders' to see the status of all your orders, including pending, confirmed, and completed purchases."
      },
      {
        question: "Can I reserve products?",
        answer: "Yes! You can reserve products for a limited time. Reserved items are held for you and other buyers cannot purchase them during the reservation period."
      }
    ],
    farmers: [
      {
        question: "How do I list my products?",
        answer: "From your dashboard, click 'Add Product', fill in the product details (name, price, quantity, description), upload photos, and set your location. Your product will be visible to buyers immediately."
      },
      {
        question: "How do I receive payments?",
        answer: "Payments are processed through M-Pesa. When a buyer completes a purchase, you'll receive a notification and the payment will be sent to your registered M-Pesa number."
      },
      {
        question: "Can I edit or remove my listings?",
        answer: "Absolutely! Go to your dashboard, find the product you want to edit, and click on 'Edit' or 'Delete'. You can update prices, quantities, and descriptions at any time."
      },
      {
        question: "How do I manage orders?",
        answer: "All orders appear in your dashboard. You can view order details, confirm orders, update status, and communicate with buyers through the messaging system."
      },
      {
        question: "What if I run out of stock?",
        answer: "Update the quantity to 0 or mark the product as unavailable in your dashboard. This prevents new orders while keeping your listing active for future availability."
      },
      {
        question: "How do I build my reputation?",
        answer: "Provide quality products, respond promptly to messages, fulfill orders on time, and maintain accurate product descriptions. Positive reviews from buyers will boost your profile."
      },
      {
        question: "Can I offer pre-orders for future harvests?",
        answer: "Yes! Enable the pre-order option when listing products. Set the expected harvest date so buyers know when to expect delivery."
      }
    ],
    technical: [
      {
        question: "What browsers are supported?",
        answer: "KilimoSmart works best on modern browsers like Chrome, Firefox, Safari, and Edge. We also have a mobile-responsive design for smartphone access."
      },
      {
        question: "Do you have a mobile app?",
        answer: "Currently, we offer a mobile-optimized website. A dedicated mobile app will be available soon on both Android and iOS."
      },
      {
        question: "I forgot my password. What should I do?",
        answer: "Click on 'Forgot Password' on the login page, enter your email or phone number, and we'll send you an OTP to reset your password securely."
      },
      {
        question: "How do I update my profile information?",
        answer: "Log in to your dashboard, click on your profile icon or 'Settings', and update your information. Remember to save changes before exiting."
      }
    ]
  };

  const toggleQuestion = (index) => {
    setOpenQuestion(openQuestion === index ? null : index);
  };

  const categories = [
    { id: 'general', label: 'General', icon: '🌍' },
    { id: 'buyers', label: 'For Buyers', icon: '🛒' },
    { id: 'farmers', label: 'For Farmers', icon: '🌾' },
    { id: 'technical', label: 'Technical', icon: '⚙️' }
  ];

  return (
    <div className="faq-container">
      <div className="faq-header">
        <FaQuestionCircle className="faq-header-icon" />
        <h1>Frequently Asked Questions</h1>
        <p>Find answers to common questions about KilimoSmart</p>
      </div>

      <div className="faq-categories">
        {categories.map(category => (
          <button
            key={category.id}
            className={`category-btn ${activeCategory === category.id ? 'active' : ''}`}
            onClick={() => {
              setActiveCategory(category.id);
              setOpenQuestion(null);
            }}
          >
            <span className="category-icon">{category.icon}</span>
            {category.label}
          </button>
        ))}
      </div>

      <div className="faq-content">
        <div className="faq-list">
          {faqData[activeCategory].map((item, index) => (
            <div key={index} className="faq-item">
              <button
                className={`faq-question ${openQuestion === index ? 'active' : ''}`}
                onClick={() => toggleQuestion(index)}
              >
                <span>{item.question}</span>
                {openQuestion === index ? <FaChevronUp /> : <FaChevronDown />}
              </button>
              <div className={`faq-answer ${openQuestion === index ? 'open' : ''}`}>
                <p>{item.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="faq-footer">
        <h3>Still have questions?</h3>
        <p>Can't find what you're looking for? Contact our support team through the messaging system.</p>
        <button className="contact-support-btn">Contact Support</button>
      </div>
    </div>
  );
};

export default FAQ;
