/** Tanggal kalender WIB "YYYY-MM-DD" (buku kas, laporan, afiliasi). */
export const jakartaDate = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);
