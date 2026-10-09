import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { resetCatalogMemory } from '../src/play/catalog';

// Halaman test dianggap sudah pernah diketuk, jadi layar soal tidak menahan dengan tombol "Mulai" untuk membuka
// izin suara (D-047). Test izin suara mengatur sendiri `navigator.userActivation`.
Object.defineProperty(navigator, 'userActivation', {
  value: { hasBeenActive: true },
  configurable: true,
});

// Vitest tanpa `globals` tidak menjalankan cleanup Testing Library otomatis.
afterEach(() => {
  cleanup();
  // Katalog dibagi antarhalaman lewat memori modul; setiap test mulai bersih.
  resetCatalogMemory();
});
