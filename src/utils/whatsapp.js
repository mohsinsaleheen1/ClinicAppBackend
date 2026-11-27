const AppError = require('./AppError');

/**
 * WasenderAPI (https://wasenderapi.com) WhatsApp sender.
 * POST https://wasenderapi.com/api/send-message  { to, text }  with Bearer API key.
 */

// Normalise to digits with country code. "0300 1234567" -> "923001234567"
exports.normalizePhone = (raw = '') => {
  let n = String(raw).replace(/[^\d+]/g, '');
  if (n.startsWith('+')) return n.slice(1);
  if (n.startsWith('00')) return n.slice(2);
  if (n.startsWith('0')) return `${process.env.DEFAULT_COUNTRY_CODE || '92'}${n.slice(1)}`;
  return n;
};

exports.sendWhatsApp = async (phone, text) => {
  const key = process.env.WASENDER_API_KEY;
  const to = exports.normalizePhone(phone);

  if (!key) {
    // Dev convenience only: never silently skip in production
    if (process.env.NODE_ENV === 'production') throw new AppError('WhatsApp service is not configured', 503);
    console.warn(`[DEV] WASENDER_API_KEY not set. Message to ${to}: ${text}`);
    return { dev: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(process.env.WASENDER_API_URL || 'https://wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ to, text }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('WasenderAPI error', res.status, data);
      throw new AppError('Could not send WhatsApp message. Please try again.', 502);
    }
    return data;
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error('WasenderAPI request failed:', err.message);
    throw new AppError('Could not reach WhatsApp service. Please try again.', 502);
  } finally {
    clearTimeout(timer);
  }
};
