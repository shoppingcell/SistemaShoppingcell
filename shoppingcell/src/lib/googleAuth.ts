import { google } from 'googleapis';

export function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing GOOGLE_OAUTH_CLIENT_ID/GOOGLE_OAUTH_CLIENT_SECRET/GOOGLE_OAUTH_REDIRECT_URI');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getGoogleSheetsClient() {
  const oauth2 = getGoogleOAuthClient();
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!refreshToken) throw new Error('Missing GOOGLE_OAUTH_REFRESH_TOKEN');

  oauth2.setCredentials({ refresh_token: refreshToken });

  return google.sheets({ version: 'v4', auth: oauth2 });
}
