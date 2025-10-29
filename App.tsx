
import React, { useState, useCallback } from 'react';
import LoginPage from './components/LoginPage';
import MainPage from './components/MainPage';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = useCallback(() => {
    setIsLoggedIn(true);
  }, []);

  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      {isLoggedIn ? (
        <MainPage onLogout={handleLogout} />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </div>
  );
};

export default App;
