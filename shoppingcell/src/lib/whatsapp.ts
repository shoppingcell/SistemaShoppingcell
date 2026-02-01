export function waE164ToWaMe(e164: string) {
  // accepts "+55 94 9281-4167" or "559492814167" etc.
  return String(e164 || '').replace(/[^0-9]/g, '');
}

export function buildWhatsAppUrl(e164: string, message: string) {
  const phone = waE164ToWaMe(e164);
  if (!phone) return '#';
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
