import { NextRequest, NextResponse } from 'next/server';

// Proxy endpoint for Amplitude to bypass ad blockers/tracking protection
// This forwards requests to Amplitude's API through your own domain

const AMPLITUDE_API_URL = 'https://api2.amplitude.com/2/httpapi';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    const response = await fetch(AMPLITUDE_API_URL, {
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
      },
    });
  } catch (error) {
    console.error('[Analytics Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy analytics request' },
      { status: 500 }
    );
  }
}
