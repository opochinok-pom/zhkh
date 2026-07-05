import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import FitnessApp from './fitness/FitnessApp.jsx';
import InvestApp from './invest/InvestApp.jsx';
import './index.css';
import './fitness/fitness.css';
import './invest/invest.css';

const path = window.location.pathname.replace(/\/+$/, '');
const isFitness = path === '/fitness';
const isInvest = path === '/invest';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isFitness ? <FitnessApp /> : isInvest ? <InvestApp /> : <App />}
  </React.StrictMode>
);
