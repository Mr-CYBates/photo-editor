import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import { CreditsProvider } from './hooks/useCredits';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CreditsProvider>
          <App />
        </CreditsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
