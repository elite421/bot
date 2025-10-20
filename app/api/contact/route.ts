import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendWhatsAppMessage } from '@/lib/notifyBot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizePhoneToIN(raw: string): { ok: boolean; phone?: string; error?: string } {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return { ok: false, error: 'Phone is required' };
  // Accept either 10 digits (assume +91) or 12 digits starting with 91
  if (digits.length === 10) return { ok: true, phone: `91${digits}` };
  if (digits.length === 12 && digits.startsWith('91')) return { ok: true, phone: digits };
  return { ok: false, error: 'Enter a valid 10-digit Indian mobile number' };
}

async function ensureContactMessagesTable() {
  try {
    await query(`CREATE TABLE IF NOT EXISTS contact_messages (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await query(`CREATE INDEX IF NOT EXISTS idx_contact_messages_phone ON contact_messages(phone)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at)`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('ensureContactMessagesTable failed:', (e as any)?.message || e);
  }
}

export async function POST(req: NextRequest) {
  const noStore = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store',
  } as const;
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim();
    const phoneRaw = String(body.phone || '').trim();
    const message = String(body.message || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, message: 'Valid email is required' }, { status: 400, headers: noStore });
    }
    if (!message) {
      return NextResponse.json({ success: false, message: 'Message is required' }, { status: 400, headers: noStore });
    }
    const norm = normalizePhoneToIN(phoneRaw);
    if (!norm.ok) {
      return NextResponse.json({ success: false, message: norm.error || 'Invalid phone' }, { status: 400, headers: noStore });
    }
    const normalizedPhone = norm.phone!; // 91XXXXXXXXXX

    try {
      await ensureContactMessagesTable();
      await query(
        `INSERT INTO contact_messages (email, phone, message) VALUES ($1, $2, $3)`,
        [email, normalizedPhone, message]
      );
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('contact insert failed:', e?.message || e);
      return NextResponse.json({ success: false, message: 'Failed to save message' }, { status: 500, headers: noStore });
    }

    // Notify company WhatsApp
    const companyNumber = (process.env.COMPANY_WHATSAPP_NUMBER || '919212079494').replace(/\D/g, '');
    const prettyUserPhone = `+${normalizedPhone}`;
    const text = `📩 New contact via TruOTP\n\nEmail: ${email}\nPhone: ${prettyUserPhone}\n\nMessage:\n${message}`;
    try {
      const sent = await sendWhatsAppMessage(companyNumber, text);
      if (!sent.ok) {
        // eslint-disable-next-line no-console
        console.error('sendWhatsAppMessage failed:', sent.error);
      }
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('sendWhatsAppMessage exception:', e?.message || e);
    }

    return NextResponse.json({ success: true }, { headers: noStore });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('contact route error:', e?.message || e);
    return NextResponse.json({ success: false, message: 'Unexpected error' }, { status: 500 });
  }
}

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
