import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import FitnessApp from './fitness/FitnessApp.jsx';
import './index.css';
import './fitness/fitness.css';

const isFitness = window.location.pathname.replace(/\/+$/, '') === '/fitness';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isFitness ? <FitnessApp /> : <App />}
  </React.StrictMode>
);
