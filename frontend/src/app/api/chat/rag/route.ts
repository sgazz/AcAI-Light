import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Prosleđujemo zahtev ka backend-u
    const response = await fetch('http://localhost:8001/chat/rag', {
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
    console.error('RAG chat error:', error);
    return NextResponse.json(
      { error: 'Greška u RAG chat komunikaciji' },
      { status: 500 }
    );
  }
} 