import { NextRequest, NextResponse } from 'next/server';
import { generateSMSQR } from '@/lib/qr';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Strict WhatsApp-only mode: this endpoint is disabled unless explicitly enabled
  const enableRegular = String(process.env.ENABLE_REGULAR_QR || '').toLowerCase() === 'true';
  if (!enableRegular) {
    return NextResponse.json({ success: false, message: 'Regular QR login is disabled' }, { status: 403 });
  }
  try {
    const { phone } = await req.json();
    if (!phone) return NextResponse.json({ success: false, message: 'Phone number is required' }, { status: 400 });
    const cleanPhone = String(phone).replace(/\D/g, '');

    const companyWhatsAppNumber = process.env.COMPANY_WHATSAPP_NUMBER || '919212079494';

    // For simple QR, reuse the hash stored in the login request generation path
    const hash = (await import('crypto')).randomBytes(32).toString('hex');
    const qr = await generateSMSQR(companyWhatsAppNumber, hash);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await query(`DELETE FROM login_requests WHERE phone = $1 AND is_verified = false`, [cleanPhone]);
    await query(
      `INSERT INTO login_requests (phone, hash_code, qr_code_data, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [cleanPhone, hash, JSON.stringify({ phone: cleanPhone, hash, type: 'login_request' }), expiresAt]
    );

    return NextResponse.json({
      success: true,
      message: 'QR code generated successfully',
      data: {
        qrCode: qr.qrCode,
        hash,
        expiresAt,
        whatsappUrl: undefined,
        smsUrl: qr.smsUrl,
        smsUrlSmsto: qr.smsUrlSmsto,
        companyNumber: companyWhatsAppNumber,
        instructions: `Scan this QR code with your phone's camera. It will automatically open WhatsApp/SMS with the company number (+${companyWhatsAppNumber.replace(/\D/g, '')}) and the hash code pre-filled. Simply send the message to complete your login.`,
      },
    });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('request-qr error:', e);
    return NextResponse.json({ success: false, message: 'Failed to generate QR code' }, { status: 500 });
  }
}
