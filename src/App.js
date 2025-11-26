import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { RoleProvider } from './contexts/RoleContext';
import LandingPage from './landingPage';
import SignUp from './Buyer/Auth/signUp';
import BuyerLogin from './Buyer/Auth/login';
import BuyerDashboard from './Buyer/Auth/Dashboard.js';

import SignupFarmer from './Farmer/Auth/sign_up.js';
import LoginFarmer from './Farmer/Auth/loginF.js';
import FarmerDashboard from './Farmer/Auth/dashboard.js';

import './landingPage.css';
import './Farmer/Auth/Styling/auth.css';
import './Buyer/Auth/Styling/auth.css';
import './Buyer/Auth/Styling/dashboard.css';
import DashboardAdmin from './Admin/Dashboard';
import AdminUsers from './Admin/Users';
import AdminTransactions from './Admin/Transactions';
import AdminReports from './Admin/Reports';
import AdminMessages from './Admin/Messages';
import AdminLogin from './Admin/loginAdmin';
import './Admin/Styling/admin.css';


function App() {
  return (
    <RoleProvider>
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<BuyerLogin />} />
      <Route path="/buyer-dashboard" element={<BuyerDashboard />} />
      <Route path="/signupFarmer" element={<SignupFarmer />} />
      <Route path="/loginF" element={<LoginFarmer />} />
      <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
      <Route path="/admin" element={<DashboardAdmin />} />
  <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/users" element={<AdminUsers />} />
      <Route path="/admin/messages" element={<AdminMessages />} />
      <Route path="/admin/transactions" element={<AdminTransactions />} />
      <Route path="/admin/reports" element={<AdminReports />} />
      </Routes>
    </RoleProvider>
  );
}

export default App;