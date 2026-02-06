
import { getGoogleSheetsClient } from './lib/sheets.js';

async function checkHeaders() {
    const SPREADSHEET_ID = '1zR7ak9cKx559fowngKCCkpEddcMxFg4diRbjvHtpsMQ';
    const sheets = await getGoogleSheetsClient();
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'NBD_Followup!A1:Z1',
    });
    console.log('HEADERS:', JSON.stringify(response.data.values?.[0]));
}

checkHeaders();
