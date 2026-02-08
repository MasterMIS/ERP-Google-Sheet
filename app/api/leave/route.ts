import { getAllUsers } from '@/lib/sheets';
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/sheets';
import { SPREADSHEET_IDS } from '@/lib/sheets';

// Helper to normalize date to YYYY-MM-DD
const normalizeDate = (dateStr: string) => {
    if (!dateStr) return '';
    const clean = dateStr.trim();
    if (clean.includes('/')) {
        const parts = clean.split(' ')[0].split('/'); // Handle potential time part
        if (parts.length === 3) {
            // Assume DD/MM/YYYY if first part is small
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }
    return clean; // Assume ISO or valid
};

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const role = searchParams.get('role'); // Pass role from frontend
        const type = searchParams.get('type'); // 'leaves' or 'remarks'
        const leaveId = searchParams.get('leaveId');

        const sheets = await getGoogleSheetsClient();
        const spreadsheetId = SPREADSHEET_IDS.ATTENDANCE;

        // FETCH REMARKS
        if (type === 'remarks') {
            if (!leaveId) return NextResponse.json({ error: 'Leave ID required' }, { status: 400 });

            // Check if leave_remark sheet exists, if not create header
            try {
                await sheets.spreadsheets.values.get({ spreadsheetId, range: `leave_remark!A1` });
            } catch (e) {
                // Initialize sheet
                await sheets.spreadsheets.values.update({
                    spreadsheetId, range: `leave_remark!A1:E1`, valueInputOption: 'RAW',
                    requestBody: { values: [['id', 'leave_id', 'user_name', 'comment', 'created_at']] }
                });
            }

            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `leave_remark!A:E`,
            });

            const rows = response.data.values || [];
            const remarks = rows.slice(1)
                .map(row => ({
                    id: row[0],
                    leaveId: row[1],
                    userName: row[2],
                    comment: row[3],
                    createdAt: row[4]
                }))
                .filter(r => r.leaveId === leaveId);

            return NextResponse.json({ remarks });
        }

        // FETCH LEAVES
        const [leaveResponse, users] = await Promise.all([
            sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `Leave!A:G`,
            }),
            getAllUsers()
        ]);

        const rows = leaveResponse.data.values || [];
        const userImageMap = users.reduce((acc: any, u: any) => {
            acc[u.id] = u.image_url;
            return acc;
        }, {});

        let leaves = rows.slice(1).map((row) => ({
            id: row[0],
            userId: row[1],
            userName: row[2],
            userImage: userImageMap[row[1]] || '', // Add user actual image
            startDate: normalizeDate(row[3]),
            endDate: normalizeDate(row[4]),
            reason: row[5],
            status: row[6] || 'Pending'
        }));

        // Filter based on Role
        if (role !== 'Admin') {
            if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });
            leaves = leaves.filter(record => record.userId === userId);
        } else {
            // Admin sees all. Sort by pending first?
            leaves.sort((a, b) => {
                if (a.status === 'Pending' && b.status !== 'Pending') return -1;
                if (a.status !== 'Pending' && b.status === 'Pending') return 1;
                return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
            });
        }

        return NextResponse.json({ leaves });

    } catch (error) {
        console.error('Error fetching leaves:', error);
        return NextResponse.json({ error: 'Failed to fetch leaves' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action } = body;

        const sheets = await getGoogleSheetsClient();
        const spreadsheetId = SPREADSHEET_IDS.ATTENDANCE;

        // 1. ADD REMARK
        if (action === 'ADD_REMARK') {
            const { leaveId, userName, comment } = body;
            const newRow = [
                `${Date.now()}`,
                leaveId,
                userName,
                comment,
                new Date().toISOString()
            ];

            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: `leave_remark!A:E`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [newRow] }
            });

            return NextResponse.json({ success: true });
        }

        // 2. UPDATE STATUS (Approve/Reject)
        if (action === 'UPDATE_STATUS') {
            const { leaveId, status } = body;
            // Find row index
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `Leave!A:A`,
            });

            const rows = response.data.values || [];
            const rowIndex = rows.findIndex(r => r[0] === leaveId);

            if (rowIndex === -1) return NextResponse.json({ error: 'Leave not found' }, { status: 404 });

            const rowNumber = rowIndex + 1;
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `Leave!G${rowNumber}`, // Col G is Status
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [[status]] }
            });

            return NextResponse.json({ success: true });
        }

        // 3. APPLY LEAVE (Default)
        const { userId, userName, startDate, endDate, reason } = body;

        if (!userId || !startDate || !endDate || !reason) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const id = `${userId}_${Date.now()}`;

        // Save as YYYY-MM-DD to avoid ambiguity in calculations, 
        // OR as DD/MM/YYYY text if preferred. 
        // Current decision: Send 'DD/MM/YYYY' as STRING to force format if user insists on visual matching,
        // BUT 'YYYY-MM-DD' is safer. 
        // Let's use standard 'YYYY-MM-DD' compatible string.

        const newRow = [
            id,
            userId,
            userName,
            startDate, // Sending YYYY-MM-DD directly
            endDate,
            reason,
            'Pending'
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `Leave!A:G`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [newRow]
            }
        });

        return NextResponse.json({ success: true, message: 'Leave applied successfully' });

    } catch (error) {
        console.error('Error applying for leave:', error);
        return NextResponse.json({ error: 'Failed to apply for leave' }, { status: 500 });
    }
}
