import 'vite/modulepreload-polyfill';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/components/App';

document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.createRoot(document.getElementById('addonsDrawer')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
