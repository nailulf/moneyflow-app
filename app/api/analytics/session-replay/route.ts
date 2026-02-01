import { NextRequest, NextResponse } from 'next/server';

// Dedicated proxy endpoint for Amplitude Session Replay
// Session replay data goes to a different server than regular events

const SESSION_REPLAY_URL = 'https://api-sr.amplitude.com/sessions/track';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    const response = await fetch(SESSION_REPLAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
      },
      body,
    });

    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[Session Replay Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy session replay request' },
      { status: 500 }
    );
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
