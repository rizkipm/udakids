import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { setIndonesianValidationMessages } from '@little-coder/engine';
import { App } from './App';
import { installAudioUnlock } from './audio/speech';
// Design system UdaKids (D-107): fon lokal (offline, tanpa server pihak ketiga) lalu token & komponen dasar.
import '@fontsource/andika/latin-400.css';
import '@fontsource/andika/latin-700.css';
import '@fontsource/lilita-one/latin-400.css';
import './styles/uk-tokens.css';
import './styles/uk-components.css';
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
