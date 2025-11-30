import React, { useState } from 'react';
import { useRole } from '../contexts/RoleContext';
import './Styling/AddRoleForm.css';

const AddRoleForm = ({ roleType, onClose, onSuccess }) => {
  const { addRole } = useRole();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Farmer form state
  const [farmerData, setFarmerData] = useState({
    farm_name: '',
    farm_type: '',
    farm_size: '',
    farming_experience: 0,
    primary_crops: [],
  });

  // Buyer form state
  const [buyerData, setBuyerData] = useState({
    business_name: '',
    business_type: '',
    delivery_address: '',
    city: '',
    preferred_payment_method: 'M-Pesa',
  });

  const handleFarmerSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!farmerData.farm_type || !farmerData.farm_size) {
      setError('Farm type and farm size are required');
      setLoading(false);
      return;
    }

    const result = await addRole('farmer', farmerData);
    setLoading(false);

    if (result.success) {
      onSuccess && onSuccess();
      onClose();
    } else {
      setError(result.message);
    }
  };

  const handleBuyerSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!buyerData.business_name || !buyerData.business_type || 
        !buyerData.delivery_address || !buyerData.city) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    const result = await addRole('buyer', buyerData);
    setLoading(false);

    if (result.success) {
      onSuccess && onSuccess();
      onClose();
    } else {
      setError(result.message);
    }
  };

  const handleCropAdd = (crop) => {
    if (crop && !farmerData.primary_crops.includes(crop)) {
      setFarmerData({
        ...farmerData,
        primary_crops: [...farmerData.primary_crops, crop],
      });
    }
  };

  const handleCropRemove = (crop) => {
    setFarmerData({
      ...farmerData,
      primary_crops: farmerData.primary_crops.filter(c => c !== crop),
    });
  };

  return (
    <div className="add-role-modal-overlay" onClick={onClose}>
      <div className="add-role-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-role-header">
          <h2>
            {roleType === 'farmer' ? '🚜 Create Farmer Profile' : '🛒 Create Buyer Profile'}
          </h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {roleType === 'farmer' ? (
          <form className="add-role-form" onSubmit={handleFarmerSubmit}>
            <div className="form-group">
              <label htmlFor="farm_name">Farm Name (Optional)</label>
              <input
                type="text"
                id="farm_name"
                value={farmerData.farm_name}
                onChange={(e) => setFarmerData({ ...farmerData, farm_name: e.target.value })}
                placeholder="My Farm"
              />
            </div>

            <div className="form-group">
              <label htmlFor="farm_type">Farm Type *</label>
              <select
                id="farm_type"
                value={farmerData.farm_type}
                onChange={(e) => setFarmerData({ ...farmerData, farm_type: e.target.value })}
                required
              >
                <option value="">Select farm type</option>
                <option value="Cereals">Cereals</option>
                <option value="Vegetables">Vegetables</option>
                <option value="Fruits">Fruits</option>
                <option value="Dairy">Dairy</option>
                <option value="Poultry">Poultry</option>
                <option value="Livestock">Livestock</option>
                <option value="Mixed">Mixed Farming</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="farm_size">Farm Size *</label>
              <select
                id="farm_size"
                value={farmerData.farm_size}
                onChange={(e) => setFarmerData({ ...farmerData, farm_size: e.target.value })}
                required
              >
                <option value="">Select farm size</option>
                <option value="Small Scale">Small Scale (0-5 acres)</option>
                <option value="Medium Scale">Medium Scale (5-20 acres)</option>
                <option value="Large Scale">Large Scale (20+ acres)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="farming_experience">Years of Experience</label>
              <input
                type="number"
                id="farming_experience"
                value={farmerData.farming_experience}
                onChange={(e) => setFarmerData({ ...farmerData, farming_experience: parseInt(e.target.value) || 0 })}
                min="0"
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label>Primary Crops</label>
              <div className="crops-input">
                <input
                  type="text"
                  placeholder="Add crop and press Enter"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCropAdd(e.target.value.trim());
                      e.target.value = '';
                    }
                  }}
                />
                <div className="crops-list">
                  {farmerData.primary_crops.map((crop, index) => (
                    <span key={index} className="crop-tag">
                      {crop}
                      <button type="button" onClick={() => handleCropRemove(crop)}>×</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="cancel-button" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="submit-button" disabled={loading}>
                {loading ? 'Creating...' : 'Create Farmer Profile'}
              </button>
            </div>
          </form>
        ) : (
          <form className="add-role-form" onSubmit={handleBuyerSubmit}>
            <div className="form-group">
              <label htmlFor="business_name">Business Name *</label>
              <input
                type="text"
                id="business_name"
                value={buyerData.business_name}
                onChange={(e) => setBuyerData({ ...buyerData, business_name: e.target.value })}
                placeholder="My Business"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="business_type">Business Type *</label>
              <select
                id="business_type"
                value={buyerData.business_type}
                onChange={(e) => setBuyerData({ ...buyerData, business_type: e.target.value })}
                required
              >
                <option value="">Select business type</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Retail">Retail Store</option>
                <option value="Wholesale">Wholesale</option>
                <option value="Processing">Processing Plant</option>
                <option value="Individual">Individual Consumer</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="delivery_address">Delivery Address *</label>
              <textarea
                id="delivery_address"
                value={buyerData.delivery_address}
                onChange={(e) => setBuyerData({ ...buyerData, delivery_address: e.target.value })}
                placeholder="Street, Building, etc."
                rows="3"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="city">City *</label>
              <input
                type="text"
                id="city"
                value={buyerData.city}
                onChange={(e) => setBuyerData({ ...buyerData, city: e.target.value })}
                placeholder="Nairobi"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="preferred_payment_method">Preferred Payment Method</label>
              <select
                id="preferred_payment_method"
                value={buyerData.preferred_payment_method}
                onChange={(e) => setBuyerData({ ...buyerData, preferred_payment_method: e.target.value })}
              >
                <option value="M-Pesa">M-Pesa</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
              </select>
            </div>

            <div className="form-actions">
              <button type="button" className="cancel-button" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="submit-button" disabled={loading}>
                {loading ? 'Creating...' : 'Create Buyer Profile'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddRoleForm;
