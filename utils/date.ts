// utils/date.ts

export const getTodayJakarta = (): string => {
  return new Intl.DateTimeFormat('sv-SE', {    // 'sv-SE' gives 'YYYY-MM-DD' format
    timeZone: 'Asia/Jakarta',
  }).format(new Date());
}

export const formatDateIndonesian = (dateStr: string): string => {
  // Replace dash with slash for compatibility with Date constructor across browsers
  const formattedStr = dateStr.replace(/-/g, '/');
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(formattedStr));
  // Output: "Minggu, 15 Juni 2025"
}
