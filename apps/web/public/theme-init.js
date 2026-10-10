// Tema UdaKids (D-110): terang bawaan, gelap bila dipilih pengguna. Dipasang sebelum halaman tampil (tanpa kedip).
try {
  if (localStorage.getItem('uk.theme') === 'dark') {
    document.documentElement.dataset.theme = 'dark';
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', '#151a1f');
  }
} catch (e) {
  /* penyimpanan diblokir: tetap terang */
}
