import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { resetCatalogMemory } from '../src/play/catalog';

// Vitest tanpa `globals` tidak menjalankan cleanup Testing Library otomatis.
afterEach(() => {
  cleanup();
  // Katalog dibagi antarhalaman lewat memori modul; setiap test mulai bersih.
  resetCatalogMemory();
});
