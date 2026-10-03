import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { setIndonesianValidationMessages } from '@little-coder/engine';
import { App } from './App';
import { installAudioUnlock } from './audio/speech';
import './styles.css';

setIndonesianValidationMessages();

// iPhone/iPad & sebagian Android: izinkan suara soal sejak ketukan pertama.
installAudioUnlock();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
