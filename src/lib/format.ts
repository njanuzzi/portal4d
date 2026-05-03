function parseDate(date: string | Date): Date {
  if (date instanceof Date) return date;
  // If it's a plain date string (YYYY-MM-DD), append time to avoid UTC offset shifting the day
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date + 'T00:00:00') : new Date(date);
}

export function formatDate(date: string | Date): string {
  const d = parseDate(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateLong(date: string | Date): string {
  const d = parseDate(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export function formatDateTime(date: string | Date): string {
  const d = parseDate(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}
