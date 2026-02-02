export function onlyDigits(s: string) {
  return (s || '').replace(/\D/g, '');
}

export function buildWhatsAppUrl(toE164: string, text: string) {
  const to = onlyDigits(toE164);
  if (!to) return '#';
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}
