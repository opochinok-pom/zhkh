import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import FitnessApp from './fitness/FitnessApp.jsx';
import './index.css';
import './fitness/fitness.css';

function currentView() {
  return new URLSearchParams(window.location.search).get('app') === 'fitness' ? 'fitness' : 'zhkh';
}

function Root() {
  const [view, setView] = useState(currentView());

  useEffect(() => {
    const onPop = () => setView(currentView());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((next) => {
    const url = next === 'fitness' ? '/?app=fitness' : '/';
    window.history.pushState({}, '', url);
    setView(next);
  }, []);

  return view === 'fitness'
    ? <FitnessApp onNavigate={navigate} />
    : <App onNavigate={navigate} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
