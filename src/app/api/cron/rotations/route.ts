import { NextRequest, NextResponse } from 'next/server'
import { regenerateRotations } from '@/lib/regenerate-rotations'

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) throw new Error('CRON_SECRET is not configured')
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await regenerateRotations(new Date())
  return NextResponse.json(result)
}
