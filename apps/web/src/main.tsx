import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { setIndonesianValidationMessages } from '@little-coder/engine';
import { App } from './App';
import './styles.css';

setIndonesianValidationMessages();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
