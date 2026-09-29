// Tampilkan alamat untuk membuka aplikasi dari iPad/HP di jaringan (Wi-Fi) yang sama.
import { networkInterfaces } from 'node:os';

const port = process.env.WEB_PORT ?? 6006;
const ips = Object.entries(networkInterfaces())
  .flatMap(([name, list]) => (list ?? []).map((a) => ({ name, ...a })))
  .filter((a) => a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.'));

if (ips.length === 0) {
  console.log('Tidak ada jaringan aktif. Sambungkan laptop ke Wi-Fi yang sama dengan iPad.');
} else {
  console.log('\nBuka salah satu alamat ini di Safari iPad (Wi-Fi yang sama):');
  for (const a of ips) console.log(`  http://${a.address}:${port}    (${a.name})`);
  console.log('\nAnak: /play · Orang tua: /orang-tua · Guru/admin: /masuk/staf\n');
}
