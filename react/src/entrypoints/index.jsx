import 'vite/modulepreload-polyfill'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App'

ReactDOM.createRoot(document.getElementById('addonsDrawer')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)