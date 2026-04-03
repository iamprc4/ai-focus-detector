import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import FaceGuard from './pages/FaceGuard';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('Guest');

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Navigation 
          isLoggedIn={isLoggedIn} 
          username={username}
          onLogin={() => setIsLoggedIn(true)}
          onLogout={() => setIsLoggedIn(false)}
          onUsernameChange={setUsername}
        />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard username={username} />} />
          <Route path="/face-guard" element={<FaceGuard />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
