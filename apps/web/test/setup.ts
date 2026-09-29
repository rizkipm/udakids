import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest tanpa `globals` tidak menjalankan cleanup Testing Library otomatis.
afterEach(() => cleanup());
