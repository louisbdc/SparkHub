import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/types'

export function sendSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data } satisfies ApiResponse<T>, { status })
}

export function sendError(error: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, error } satisfies ApiResponse<never>, { status })
}
