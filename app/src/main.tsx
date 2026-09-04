import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 2600,
          style: {
            background: '#111110',
            color: '#FBFAF7',
            borderRadius: '980px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 600,
            maxWidth: 'calc(100vw - 36px)'
          }
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
