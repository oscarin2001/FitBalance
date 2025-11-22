import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET() {
  const start = Date.now();
  try {
    // Consulta mínima (sin tocar tablas grandes) - pragma user_version funciona en SQLite/libsql
    await prisma.$queryRawUnsafe('SELECT 1');
    const ms = Date.now() - start;
    return NextResponse.json({ ok: true, db: 'up', latency_ms: ms });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e?.message || 'db_error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';