import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './landingPage';
import SignUp from './Farmer/signUp';

import './Farmer/Styling/styles.css';
import './landingPage.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signup" element={<SignUp />} />
    </Routes>
  );
}

export default App;