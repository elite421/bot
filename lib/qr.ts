import QRCode from 'qrcode';

export async function generateWhatsAppQRCode(companyNumber: string, hash: string) {
  const message = `${hash}`;
  const raw = companyNumber.replace(/\D/g, '');
  const cc = (process.env.DEFAULT_COUNTRY_CODE || '91').replace(/\D/g, '');
  const normalized = raw.length <= 10 ? `${cc}${raw}` : raw;
  const whatsappUrl = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
  const qrCode = await QRCode.toDataURL(whatsappUrl, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    margin: 1,
    color: { dark: '#000000', light: '#FFFFFF' },
  });
  return { qrCode, whatsappUrl, message };
}

export async function generateSMSQR(companyNumber: string, hash: string) {
  const message = `${hash}`;
  const raw = companyNumber.replace(/\D/g, '');
  const cc = (process.env.DEFAULT_COUNTRY_CODE || '91').replace(/\D/g, '');
  const normalized = raw.length <= 10 ? `${cc}${raw}` : raw;
  const smsUrlSmsto = `smsto:${normalized}:${encodeURIComponent(message)}`;
  const smsUrl = `sms:${normalized}?body=${encodeURIComponent(message)}`;
  const qrCode = await QRCode.toDataURL(smsUrlSmsto, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    margin: 1,
    color: { dark: '#000000', light: '#FFFFFF' },
  });
  return { qrCode, smsUrl, smsUrlSmsto, message };
}
