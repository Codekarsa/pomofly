import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read the OpenAPI spec file
    const specPath = path.join(process.cwd(), 'src', 'app', 'api', 'openapi.json');
    const specContent = fs.readFileSync(specPath, 'utf-8');
    const openapiSpec = JSON.parse(specContent);

    return NextResponse.json(openapiSpec, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error reading OpenAPI specification:', error);
    return NextResponse.json(
      { 
        error: 'Failed to load API specification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}