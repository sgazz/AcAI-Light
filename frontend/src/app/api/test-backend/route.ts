import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('http://localhost:8001/');
    const data = await response.json();
    
    return NextResponse.json({
      status: 'success',
      backend_status: data,
      message: 'Frontend uspešno povezan sa backendom'
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: 'Greška pri povezivanju sa backendom',
      error: error.message
    }, { status: 500 });
  }
} 