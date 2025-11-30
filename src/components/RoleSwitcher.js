import React, { useState } from 'react';
import { useRole } from '../contexts/RoleContext';
import './Styling/RoleSwitcher.css';

const RoleSwitcher = () => {
  const { 
    activeRole, 
    availableRoles, 
    hasMultipleRoles, 
    switchRole, 
    loading 
  } = useRole();

  const [switching, setSwitching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  if (!hasMultipleRoles || loading) {
    return null; // Don't show if user has only one role or still loading
  }

  const handleRoleSwitch = async (newRole) => {
    if (newRole === activeRole) {
      setShowDropdown(false);
      return;
    }

    setSwitching(true);
    const result = await switchRole(newRole);
    setSwitching(false);
    
    if (result.success) {
      setShowDropdown(false);
    } else {
      alert(result.message || 'Failed to switch role');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'farmer':
        return '🚜';
      case 'buyer':
        return '🛒';
      case 'admin':
        return '⚙️';
      default:
        return '👤';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'farmer':
        return 'Farmer';
      case 'buyer':
        return 'Buyer';
      case 'admin':
        return 'Admin';
      default:
        return role;
    }
  };

  return (
    <div className="role-switcher">
      <button 
        className="role-switcher-button"
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={switching}
      >
        <span className="role-icon">{getRoleIcon(activeRole)}</span>
        <span className="role-label">{getRoleLabel(activeRole)}</span>
        <span className="dropdown-arrow">{showDropdown ? '▲' : '▼'}</span>
      </button>

      {showDropdown && (
        <div className="role-dropdown">
          <div className="role-dropdown-header">
            Switch Role
          </div>
          {availableRoles.map((role) => (
            <button
              key={role.role_type}
              className={`role-option ${role.role_type === activeRole ? 'active' : ''}`}
              onClick={() => handleRoleSwitch(role.role_type)}
              disabled={switching || role.role_type === activeRole}
            >
              <span className="role-icon">{getRoleIcon(role.role_type)}</span>
              <span className="role-label">{getRoleLabel(role.role_type)}</span>
              {role.role_type === activeRole && (
                <span className="active-badge">✓ Active</span>
              )}
            </button>
          ))}
        </div>
      )}

      {switching && (
        <div className="role-switcher-overlay">
          <div className="role-switcher-spinner">
            Switching role...
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleSwitcher;
