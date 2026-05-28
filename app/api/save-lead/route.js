import { NextResponse } from 'next/server'
import getSupabaseAdmin from '@/lib/supabaseServer'

export async function POST(req) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json({ ok: false, error: 'Server Supabase client not configured.' }, { status: 500 })
    }

    const body = await req.json()
    if (!body) return NextResponse.json({ ok: false, error: 'Missing request body.' }, { status: 400 })

    // Basic validation
    const phone = String(body.phone || '').replace(/[^0-9]/g, '').slice(-10)
    if (phone.length !== 10) {
      return NextResponse.json({ ok: false, error: 'Invalid phone number.' }, { status: 400 })
    }

    const lead = {
      session_id: body.session_id || null,
      name: String(body.name || 'Unknown').trim() || 'Unknown',
      phone,
      budget: String(body.budget || 'Unknown').trim() || 'Unknown',
      timeline: String(body.timeline || 'Unknown').trim() || 'Unknown',
      intent: String(body.intent || 'Unknown').trim() || 'Unknown',
      source: body.source || 'website_chatbot',
      created_at: body.created_at || new Date().toISOString(),
    }

    const { error } = await supabaseAdmin.from('leads').insert([lead])
    if (error) {
      return NextResponse.json({ ok: false, error: error.message || 'Supabase insert error.' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err && err.message ? err.message : 'Server error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
