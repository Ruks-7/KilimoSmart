import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './landingPage';
import SignUp from './Buyer/Auth/signUp';
import Login from './Buyer/Auth/login';
import Dashboard from './Buyer/Auth/Dashboard';

import SignupFarmer from './Farmer/Auth/sign_up.js';

import './landingPage.css';
import './Farmer/Auth/Styling/auth.css';
import './Buyer/Auth/Styling/auth.css';


function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signupFarmer" element={<SignupFarmer />} />
      <Route path="/auth/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export default App;