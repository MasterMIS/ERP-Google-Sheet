const { google } = require('googleapis');
const path = require('path');

const O2D_SPREADSHEET_ID = '1WYu62z7fWlkyaFbf-YAV_hXkZbbyOrRZ_skT7IGNLec';

async function getGoogleSheetsClient() {
    const auth = new google.auth.GoogleAuth({
        keyFile: path.join(process.cwd(), 'credentials.json'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return google.sheets({ version: 'v4', auth });
}

async function updateHeaders() {
    try {
        const sheets = await getGoogleSheetsClient();

        // Updated headers (removed stage and tat_days)
        const targetHeaders = [
            'id', 'party_name', 'type', 'contact_person', 'email', 'contact_no_1', 'contact_no_2',
            'location', 'state', 'field_person_name', 'items', 'created_at'
        ];

        console.log('Updating headers...');
        await sheets.spreadsheets.values.update({
            spreadsheetId: O2D_SPREADSHEET_ID,
            range: 'O2D!A1:L1',
            valueInputOption: 'RAW',
            requestBody: { values: [targetHeaders] },
        });

        // Clear the rest of the original header row explicitly if needed, 
        // but updating A1:L1 with 12 items will effectively replace the first 12.
        // Let's clear M1 and N1 which had stage and tat_days.
        await sheets.spreadsheets.values.clear({
            spreadsheetId: O2D_SPREADSHEET_ID,
            range: 'O2D!M1:N1',
        });

        console.log('Headers refined successfully!');
    } catch (error) {
        console.error('Error:', error);
    }
}

updateHeaders();
