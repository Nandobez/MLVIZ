import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './global-fonts.css'
import './global.css'
import './index.css';
import './styles/global.scss';
import './styles/fonts.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
