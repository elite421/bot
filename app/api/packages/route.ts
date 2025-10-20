import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await query(
      `SELECT id, name, credit_amount AS "creditAmount", price_cents AS "priceCents", created_at AS "createdAt"
       FROM packages
       ORDER BY credit_amount ASC`
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message || 'Failed to load packages' }, { status: 500 });
  }
}
