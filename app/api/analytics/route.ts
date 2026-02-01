import { NextRequest, NextResponse } from 'next/server';

// Proxy endpoint for Amplitude to bypass ad blockers/tracking protection
// This forwards requests to Amplitude's API through your own domain

// Amplitude endpoints
const AMPLITUDE_ENDPOINTS = {
  // Regular analytics events
  httpapi: 'https://api2.amplitude.com/2/httpapi',
  // Batch events
  batch: 'https://api2.amplitude.com/batch',
  // Session replay
  sessionReplay: 'https://api-sr.amplitude.com/sessions/track',
  // Identify
  identify: 'https://api2.amplitude.com/identify',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const url = new URL(request.url);

    // Determine which Amplitude endpoint to use based on query param or request body
    const endpoint = url.searchParams.get('endpoint') || 'httpapi';

    // Parse body to detect session replay requests
    let targetUrl = AMPLITUDE_ENDPOINTS.httpapi;

    // Check for explicit endpoint param first (but sessionReplay detection takes priority later)
    if (endpoint && endpoint !== 'httpapi' && endpoint in AMPLITUDE_ENDPOINTS) {
      targetUrl = AMPLITUDE_ENDPOINTS[endpoint as keyof typeof AMPLITUDE_ENDPOINTS];
    }

    try {
      const parsedBody = JSON.parse(body);

      // Session replay events - detect various payload structures
      // The session replay plugin sends data in multiple formats:
      // 1. Events with session replay event types
      // 2. RRweb event batches with specific fields
      // 3. Payload with 'e' (events), 'seq', 'session_id' fields
      // 4. Payload with start_timestamp and events array (rrweb format)
      const isSessionReplay =
        // Explicit session replay endpoint param
        endpoint === 'sessionReplay' ||
        // Check for session replay event types
        parsedBody.events?.some((e: any) =>
          e.event_type?.includes('[Amplitude] Session') ||
          e.event_type?.includes('session_replay') ||
          e.event_type === '[Amplitude] Session Recorded'
        ) ||
        // Check for session replay batch structure (has 'e' array and 'seq')
        (parsedBody.e && Array.isArray(parsedBody.e) && parsedBody.seq !== undefined) ||
        // Check for session_id with events_batch
        (parsedBody.session_id && parsedBody.events_batch) ||
        // Check for rrweb session replay format (has start_timestamp and events array)
        (parsedBody.start_timestamp !== undefined && Array.isArray(parsedBody.events)) ||
        // Check for version field with type (rrweb event structure)
        (parsedBody.version !== undefined && parsedBody.type !== undefined && parsedBody.data) ||
        // Check for flattened session replay data with session_id and device_id
        (parsedBody.session_id && parsedBody.device_id && parsedBody.api_key && Array.isArray(parsedBody.events));

      // Session replay detection takes priority
      if (isSessionReplay) {
        targetUrl = AMPLITUDE_ENDPOINTS.sessionReplay;
        console.log('[Analytics Proxy] Session replay detected, routing to:', targetUrl);
      }
      // Batch requests (only if not session replay)
      else if (endpoint === 'batch' || (parsedBody.api_key && !isSessionReplay)) {
        targetUrl = AMPLITUDE_ENDPOINTS.batch;
      }
      // Identify requests
      else if (endpoint === 'identify' || parsedBody.identification) {
        targetUrl = AMPLITUDE_ENDPOINTS.identify;
      }
    } catch {
      // If body isn't JSON, use default endpoint based on query param
    }

    const response = await fetch(targetUrl, {
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
    console.error('[Analytics Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy analytics request' },
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
