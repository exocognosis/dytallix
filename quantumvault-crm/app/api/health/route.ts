import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'quantumvault-crm',
    timestamp: new Date().toISOString(),
  });
}