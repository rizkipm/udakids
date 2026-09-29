/** Dev: `pnpm db:seed` (tsx). Kode seed ada di src/cli/seed.ts agar ikut build → `node dist/cli/seed.js`. */
import { main } from '../src/cli/seed.js';

export { seed } from '../src/cli/seed.js';

if (require.main === module) void main();
