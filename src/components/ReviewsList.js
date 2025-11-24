import React from 'react';
import './ReviewsList.css';

const ReviewsList = ({ reviews, stats }) => {
  const renderStars = (rating) => {
    return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= rating ? 'star filled' : 'star'}>
            ★
          </span>
        ))}
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="reviews-list-container">
      {stats && (
        <div className="reviews-summary">
          <div className="summary-header">
            <div className="average-rating">
              <span className="rating-number">{parseFloat(stats.average_rating).toFixed(1)}</span>
              {renderStars(Math.round(stats.average_rating))}
              <span className="total-reviews">{stats.total_reviews} reviews</span>
            </div>
          </div>

          <div className="rating-breakdown">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = parseInt(stats[`${['one', 'two', 'three', 'four', 'five'][star - 1]}_star`] || 0);
              const percentage = stats.total_reviews > 0 
                ? (count / stats.total_reviews * 100).toFixed(0) 
                : 0;
              
              return (
                <div key={star} className="rating-bar-row">
                  <span className="star-label">{star} ★</span>
                  <div className="rating-bar">
                    <div 
                      className="rating-bar-fill" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="rating-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="reviews-list">
        {reviews && reviews.length > 0 ? (
          reviews.map((review) => (
            <div key={review.review_id} className="review-card">
              <div className="review-header">
                <div className="reviewer-info">
                  <div className="reviewer-avatar">
                    {review.buyer_first_name?.[0]}{review.buyer_last_name?.[0]}
                  </div>
                  <div className="reviewer-details">
                    <h4>{review.buyer_first_name} {review.buyer_last_name}</h4>
                    <p className="review-date">{formatDate(review.created_at)}</p>
                  </div>
                </div>
                <div className="review-rating">
                  {renderStars(review.rating)}
                </div>
              </div>

              {review.comment && (
                <p className="review-comment">{review.comment}</p>
              )}

              {review.response_text && (
                <div className="farmer-response">
                  <div className="response-header">
                    <span className="response-label">Farmer's Response</span>
                    <span className="response-date">{formatDate(review.response_date)}</span>
                  </div>
                  <p className="response-text">{review.response_text}</p>
                </div>
              )}

              {review.helpful_count > 0 && (
                <div className="review-footer">
                  <span className="helpful-count">
                    👍 {review.helpful_count} {review.helpful_count === 1 ? 'person' : 'people'} found this helpful
                  </span>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="no-reviews">
            <span className="no-reviews-icon">⭐</span>
            <p>No reviews yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsList;
