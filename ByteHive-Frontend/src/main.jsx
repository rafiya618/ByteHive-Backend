import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './styles/variables.css';
import AppProviders from './context/provider.jsx';
import { BrowserRouter } from "react-router-dom";

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AppProviders>
      <App />
    </AppProviders>,
  </BrowserRouter>
  
)
