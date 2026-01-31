import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// OAuth2 credentials
export const OAUTH_CREDENTIALS = {
  client_id: process.env.GOOGLE_CLIENT_ID!,
  client_secret: process.env.GOOGLE_CLIENT_SECRET!,
  redirect_uri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback"
};

const TOKEN_PATH = path.join(process.cwd(), 'google-oauth-tokens.json');

// Read tokens from file or environment variable
function readTokens() {
  try {
    // Priority 1: Environment Variable (for Vercel/Production)
    if (process.env.GOOGLE_OAUTH_TOKENS) {
      return JSON.parse(process.env.GOOGLE_OAUTH_TOKENS);
    }

    // Priority 2: Local File (for Development)
    if (fs.existsSync(TOKEN_PATH)) {
      const data = fs.readFileSync(TOKEN_PATH, 'utf8');
      return JSON.parse(data);
    }

    throw new Error('OAuth tokens not found. Check GOOGLE_OAUTH_TOKENS env var or local file.');
  } catch (error) {
    console.error('Error reading OAuth tokens:', error);
    throw error;
  }
}

// Save tokens to file (Local Development only)
function saveTokens(tokens: any) {
  try {
    // In Vercel/Production, we can't write to files. 
    // We rely on the refresh_token in the env var to generate new access tokens in-memory.
    // So we only attempt to save if we're essentially in a local environment where the file matches.
    if (process.env.GOOGLE_OAUTH_TOKENS) {
      // Log that we refreshed, but we can't persist it to env vars programmatically.
      // This is okay because the refresh_token in env vars is typically long-lived.
      // console.log('Tokens refreshed in memory.');
      return;
    }

    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  } catch (error) {
    // Ignore write errors in production (read-only file system)
    console.warn('Could not save tokens to file (likely read-only environment):', error);
  }
}

// Get authenticated OAuth2 client
export async function getOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    OAUTH_CREDENTIALS.client_id,
    OAUTH_CREDENTIALS.client_secret,
    OAUTH_CREDENTIALS.redirect_uri
  );

  // Read tokens
  const tokens = readTokens();
  oauth2Client.setCredentials(tokens);

  // Set up automatic token refresh
  oauth2Client.on('tokens', (newTokens) => {
    // Merge with existing tokens to ensure we keep the refresh token if the new one doesn't have it
    const updatedTokens = { ...tokens, ...newTokens };
    saveTokens(updatedTokens);

    // Also update the current client's credentials in memory
    oauth2Client.setCredentials(updatedTokens);
  });

  return oauth2Client;
}

// Get Google Sheets API client with OAuth
export async function getGoogleSheetsClient() {
  const auth = await getOAuth2Client();
  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

// Get Google Drive API client with OAuth
export async function getGoogleDriveClient() {
  const auth = await getOAuth2Client();
  const drive = google.drive({ version: 'v3', auth });
  return drive;
}
