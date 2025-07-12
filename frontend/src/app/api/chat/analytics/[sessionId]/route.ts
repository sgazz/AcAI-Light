import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    
    // Prosleđujemo zahtev ka backend-u
    const response = await fetch(`http://localhost:8001/chat/analytics/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Greška pri dohvatanju analitike' },
      { status: 500 }
    );
  }
} 