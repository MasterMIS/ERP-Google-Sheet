import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/sheets';
import { SPREADSHEET_IDS } from '@/lib/sheets';

// Helper to format date as YYYY-MM-DD
const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
};

// Helper to format Date to YYYY-MM-DD HH:mm:ss for Sheets (prevents locale confusion)
const formatToSheetDate = (date: Date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    // Using YYYY-MM-DD ensures Google Sheets parses it correctly regardless of locale (usually)
    return `${y}-${m}-${d} ${h}:${min}:${s}`;
};

// Helper to parse DD/MM/YYYY HH:mm:ss back to ISO string for frontend
const parseSheetDate = (dateStr: string) => {
    if (!dateStr) return null;
    try {
        if (dateStr.includes('T')) return new Date(dateStr).toISOString(); // Already ISO

        const [datePart, timePart] = dateStr.split(' ');
        if (!datePart) return null;

        const [d, m, y] = datePart.split('/').map(Number);

        let h = 0, min = 0, s = 0;
        if (timePart) {
            [h, min, s] = timePart.split(':').map(Number);
        }

        // Month is 0-indexed in JS Date
        const dateObj = new Date(y, m - 1, d, h || 0, min || 0, s || 0);
        return isNaN(dateObj.getTime()) ? null : dateObj.toISOString();
    } catch (e) {
        return null;
    }
};

// Helper to normalize date string to YYYY-MM-DD
const normalizeDate = (dateStr: string) => {
    if (!dateStr) return '';
    const cleanStr = dateStr.trim();
    // If it's the new Full format, extract just the date part for comparison
    if (cleanStr.includes(' ')) {
        const parts = cleanStr.split(' ')[0].split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }

    // Handle DD/MM/YYYY or DD-MM-YYYY
    if (cleanStr.includes('/') || cleanStr.includes('-')) {
        const parts = cleanStr.split(/[\/\-]/);
        if (parts.length === 3) {
            // Check if it looks like DD/MM/YYYY (day is first part)
            if (parts[0].length <= 2 && parts[2].length === 4) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
            // Check if it looks like YYYY-MM-DD
            if (parts[0].length === 4) {
                return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            }
        }
    }
    return cleanStr;
};

const SHEET_NAME = 'Sheet1';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        const sheets = await getGoogleSheetsClient();
        const spreadsheetId = SPREADSHEET_IDS.ATTENDANCE;

        // Read all rows
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${SHEET_NAME}!A:G`,
        });

        const rows = response.data.values || [];
        const headers = rows[0];
        const dataRows = rows.slice(1);

        // Filter for this user
        const userRecords = dataRows.filter((row: any[]) => row[1] === userId);

        const history = userRecords.map((row: any[]) => {
            const inTimeParsed = parseSheetDate(row[4]);
            const outTimeParsed = parseSheetDate(row[5]);
            return {
                date: normalizeDate(row[3]), // Normalized YYYY-MM-DD
                inTime: inTimeParsed,
                outTime: outTimeParsed,
                status: row[6]
            };
        });

        // Determine current status
        const todayStr = new Date().toISOString().split('T')[0];
        const todayRecord = history.find((h: any) => h.date === todayStr);

        let currentStatus = 'IDLE';
        let lastCheckIn = null;

        if (todayRecord) {
            if (todayRecord.inTime && !todayRecord.outTime) {
                currentStatus = 'CHECKED_IN';
                lastCheckIn = todayRecord.inTime;
            } else if (todayRecord.inTime && todayRecord.outTime) {
                currentStatus = 'COMPLETED';
            }
        }

        return NextResponse.json({
            history,
            currentStatus,
            lastCheckIn
        });

    } catch (error) {
        console.error('Error fetching attendance:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { action, userId, userName } = await request.json();

        if (!['CHECK_IN', 'CHECK_OUT'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        const sheets = await getGoogleSheetsClient();
        const spreadsheetId = SPREADSHEET_IDS.ATTENDANCE;

        // Get existing rows to find if we need to update or append
        const getResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${SHEET_NAME}!A:G`,
        });

        const rows = getResponse.data.values || [];
        const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Find today's row index for this user
        let userRowIndex = -1;

        // Parsing logic for finding today's row manually since we might have mixed formats
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const rowDateRaw = row[3]; // Date column
            const rowNormalized = normalizeDate(rowDateRaw);

            if (row[1] === userId && rowNormalized === todayStr) {
                userRowIndex = i;
                break;
            }
        }

        const timestamp = formatToSheetDate(new Date());

        if (action === 'CHECK_IN') {
            if (userRowIndex !== -1) {
                return NextResponse.json({ error: 'Already checked in for today' }, { status: 400 });
            }

            const id = `${userId}_${todayStr.replace(/\//g, '-')}`;
            const newRow = [
                id,
                userId,
                userName,
                todayStr, // Date
                timestamp, // In Time
                '', // Out Time
                'IN' // Status
            ];

            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: `${SHEET_NAME}!A:G`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [newRow]
                }
            });

            return NextResponse.json({ success: true, message: 'Checked in successfully', timestamp });

        } else if (action === 'CHECK_OUT') {
            if (userRowIndex === -1) {
                return NextResponse.json({ error: 'No check-in record found for today' }, { status: 400 });
            }

            // Update the row (Column F is Out Time, G is Status)
            const rowNumber = userRowIndex + 1;

            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${SHEET_NAME}!F${rowNumber}:G${rowNumber}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [[timestamp, 'COMPLETED']]
                }
            });

            return NextResponse.json({ success: true, message: 'Checked out successfully', timestamp });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Error processing attendance:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
