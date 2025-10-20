import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { generateWhatsAppQRCode } from '@/lib/qr';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const noStoreHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store',
    // CORS (safe for this public auth-init route)
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  } as const;
  try {
    const { phone } = await req.json();
    if (!phone) return NextResponse.json({ success: false, message: 'Phone number is required' }, { status: 400, headers: noStoreHeaders });
    const rawDigits = String(phone).replace(/\D/g, '');
    const DEFAULT_CC = String(process.env.DEFAULT_COUNTRY_CODE || '91');
    const cleanPhone = (() => {
      let digits = rawDigits.replace(/^0+/, '');
      if (!digits.startsWith(DEFAULT_CC) && digits.length <= 10) {
        digits = `${DEFAULT_CC}${digits}`;
      }
      return digits;
    })();

    const companyWhatsAppNumber = process.env.COMPANY_WHATSAPP_NUMBER || '919212079494';
    const hash = crypto.randomBytes(32).toString('hex');
    const qrData = await generateWhatsAppQRCode(companyWhatsAppNumber, hash);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    try {
      await query(`DELETE FROM login_requests WHERE phone = $1 AND is_verified = false`, [cleanPhone]);
    } catch (e: any) {
      if (/relation\s+"?login_requests"?\s+does not exist/i.test(String(e?.message))) {
        await ensureLoginRequestsTable();
      } else {
        throw e;
      }
    }
    await query(
      `INSERT INTO login_requests (phone, hash_code, qr_code_data, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [cleanPhone, hash, JSON.stringify({ phone: cleanPhone, hash, type: 'whatsapp_qr' }), expiresAt]
    );

    return NextResponse.json({
      success: true,
      message: 'WhatsApp QR code generated successfully',
      data: {
        qrCode: qrData.qrCode,
        hash,
        expiresAt,
        whatsappUrl: qrData.whatsappUrl,
        message: qrData.message,
        companyNumber: companyWhatsAppNumber,
        instructions: `Scan this QR code with your phone's camera. It will directly open WhatsApp with the company number and hash code pre-filled. Simply send the message to complete your login.`,
      },
    }, { headers: noStoreHeaders });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('request-whatsapp-qr error:', e);
    const detail = (e && (e.message || String(e))) || 'Unknown error';
    return NextResponse.json({ success: false, message: `Failed to generate WhatsApp QR code: ${detail}` }, { status: 500, headers: noStoreHeaders });
  }
}

async function ensureLoginRequestsTable() {
  try {
    await query(`CREATE TABLE IF NOT EXISTS public.login_requests (
      id SERIAL PRIMARY KEY,
      phone TEXT NOT NULL,
      hash_code TEXT NOT NULL,
      qr_code_data TEXT,
      is_verified BOOLEAN DEFAULT FALSE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      verified_at TIMESTAMPTZ NULL
    )`);
    await query(`CREATE INDEX IF NOT EXISTS idx_login_requests_phone ON public.login_requests (phone)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_login_requests_expires_at ON public.login_requests (expires_at)`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('ensureLoginRequestsTable failed:', (e as any)?.message || e);
  }
}

// Handle CORS preflight to avoid 405 on OPTIONS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
