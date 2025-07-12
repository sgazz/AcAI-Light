import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const response = await fetch('http://localhost:8001/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: body.message || "Test poruka",
        session_id: body.session_id || "test-session",
        model: body.model || "gpt-4"
      }),
    });
    
    const data = await response.json();
    
    return NextResponse.json({
      status: 'success',
      backend_response: data,
      message: 'Frontend uspešno pozvao chat endpoint'
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: 'Greška pri pozivanju chat endpoint-a',
      error: error.message
    }, { status: 500 });
  }
} 