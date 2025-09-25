import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './landingPage';
import SignUp from './Farmer/Auth/signUp';
import Login from './Farmer/Auth/login';

import './Farmer/Auth/Styling/auth.css';
import './landingPage.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}

export default App;