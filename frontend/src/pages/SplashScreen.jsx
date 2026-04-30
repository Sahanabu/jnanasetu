// Path: frontend/src/pages/SplashScreen.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import logo from '../assets/visuals/logo.png';

export default function SplashScreen() {
  const navigate = useNavigate();
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      navigate('/landing');
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      className={`min-h-screen bg-white flex flex-col items-center justify-center transition-opacity duration-500 ${
        show ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="text-center animate-pop">
        <img src={logo} alt="JnanaSetu Logo" className="w-32 h-32 object-contain mb-6 drop-shadow-2xl" />
        <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">JnanaSetu</h1>
        <p className="text-violet-600 font-bold text-lg">ज्ञानसेತು · ಜ್ಞಾನಸೇತು</p>
        <p className="text-violet-300 text-sm mt-4">Bridging learning gaps</p>
        <div className="mt-8">
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    </div>
  );
}
