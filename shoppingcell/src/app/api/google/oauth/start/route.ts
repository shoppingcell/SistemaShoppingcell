import { NextResponse } from 'next/server';
import { getGoogleOAuthClient } from '@/lib/googleAuth';

export async function GET() {
  const oauth2 = getGoogleOAuthClient();

  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return NextResponse.redirect(url);
}
