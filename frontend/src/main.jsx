import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import './index.css';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { OfflineProvider } from './context/OfflineContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode entfernt, weil es your useEffect doppelt ausgeführt hat
  <BrowserRouter>
    <AuthProvider>
      <OfflineProvider>
        <App />
      </OfflineProvider>
    </AuthProvider>
  </BrowserRouter>
);
