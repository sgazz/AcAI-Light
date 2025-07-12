import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Prosleđujemo zahtev ka backend-u
    const response = await fetch('http://localhost:8001/chat/suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Suggestions error:', error);
    return NextResponse.json(
      { error: 'Greška pri generisanju predloga' },
      { status: 500 }
    );
  }
} 