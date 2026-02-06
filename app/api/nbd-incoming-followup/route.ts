
import { NextResponse } from 'next/server';
import { getGoogleSheetsClient, getNBDIncomings } from '@/lib/sheets';

const SPREADSHEET_ID = '1zR7ak9cKx559fowngKCCkpEddcMxFg4diRbjvHtpsMQ'; // NBD Spreadsheet

// Helper function to format date as dd/mm/yyyy HH:mm:ss
function formatDateTime(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// Helper to parse both ISO and dd/mm/yyyy formats
function parseDate(dateStr: string): Date {
    if (!dateStr) return new Date();

    // Try dd/mm/yyyy HH:mm:ss format
    const ddmmyyyyMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
    if (ddmmyyyyMatch) {
        const [_, day, month, year, hours, minutes, seconds] = ddmmyyyyMatch;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds));
    }

    // Fallback to native parsing (handles ISO)
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? new Date() : date;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const targetId = searchParams.get('id');
        const sheets = await getGoogleSheetsClient();

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'NBD Incoming_Followup!A:G',
        });

        const rows = response.data.values || [];
        if (rows.length === 0) {
            return NextResponse.json(targetId ? [] : { followUpData: [], stats: { totalFollowUps: 0, lastWeek: 0, lastMonth: 0 } });
        }

        // Handle specific ID request (Full History)
        if (targetId) {
            const history = rows.slice(1)
                .filter(row => parseInt(row[0]) === parseInt(targetId))
                .map(row => ({
                    nbd_id: parseInt(row[0]),
                    status: row[1] || '',
                    remark: row[2] || '',
                    created_at: row[3] || '',
                    next_follow_up_date: row[4] || '',
                    type: row[5] || '',
                    follow_up_date: row[6] || ''
                }));
            return NextResponse.json(history);
        }

        // Default summary logic
        const followUpMap = new Map<number, any>();
        const now = new Date();
        const lastWeekDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const lastMonthDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        let lastWeekCount = 0;
        let lastMonthCount = 0;

        for (let i = 1; i < rows.length; i++) {
            const [nbd_id, status, remark, created_at, next_follow_up_date, type, follow_up_date] = rows[i];
            const id = parseInt(nbd_id);
            if (isNaN(id)) continue;

            const createdDate = parseDate(created_at);

            const existing = followUpMap.get(id) || {
                nbd_id: id,
                status: '',
                remark: '',
                created_at: '',
                next_follow_up_date: '',
                type: '',
                follow_up_date: '',
                order_won_count: 0
            };

            const isOrderWon = status === 'Order Won';

            // Inheritance Logic:
            // 1. Remark and Created At always come from the latest row
            // 2. Status, Next Follow up Date, and Type inherit from previous if current is empty
            followUpMap.set(id, {
                nbd_id: id,
                status: status || existing.status,
                remark: remark || existing.remark,
                created_at: created_at || existing.created_at,
                next_follow_up_date: next_follow_up_date || existing.next_follow_up_date,
                type: type || existing.type,
                follow_up_date: follow_up_date || existing.follow_up_date,
                order_won_count: existing.order_won_count + (isOrderWon ? 1 : 0)
            });

            // Count follow-ups in last week and month
            if (createdDate >= lastWeekDate) {
                lastWeekCount++;
            }
            if (createdDate >= lastMonthDate) {
                lastMonthCount++;
            }
        }

        const followUpData = Array.from(followUpMap.values());
        return NextResponse.json({
            followUpData,
            stats: {
                totalFollowUps: followUpData.length,
                lastWeek: lastWeekCount,
                lastMonth: lastMonthCount
            }
        });
    } catch (error) {
        console.error('Error fetching follow-up data:', error);
        return NextResponse.json({ error: 'Failed to fetch follow-up data' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { nbd_id, status, remark, next_follow_up_date, type, follow_up_date } = await request.json();

        if (!nbd_id) {
            return NextResponse.json({ error: 'nbd_id is required' }, { status: 400 });
        }

        // Allow status to be empty ONLY if a remark is provided (Remark Only case)
        if (!status && !remark) {
            return NextResponse.json({ error: 'Either status or remark must be provided' }, { status: 400 });
        }

        const sheets = await getGoogleSheetsClient();

        const timestamp = formatDateTime(new Date());

        let final_next_follow_up_date = next_follow_up_date;
        let final_follow_up_date = follow_up_date;

        // Fallback to NBD's main data if not provided
        // But ONLY if this is a Status update (status provided). 
        // For Remark Only (no status), we do NOT want to auto-fill next_follow_up_date
        if (!final_next_follow_up_date || !final_follow_up_date) {
            try {
                const nbds = await getNBDIncomings();
                const nbd = nbds.find((n: any) => parseInt(n.id) === parseInt(nbd_id));
                if (nbd) {
                    // Only backfill next_follow_up_date if status is present (Review/Status update)
                    // If it's just a Remark, we leave it empty so it doesn't show as a "Next Followup" event
                    if (status && !final_next_follow_up_date && nbd.follow_up_date) {
                        final_next_follow_up_date = nbd.follow_up_date;
                    }
                    if (!final_follow_up_date && nbd.follow_up_date) {
                        final_follow_up_date = nbd.follow_up_date;
                    }
                }
            } catch (err) {
                console.error('Error fetching NBD Incoming for fallback dates:', err);
            }
        }

        // Append new follow-up entry with current follow-up date, next follow-up date and type
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'NBD Incoming_Followup!A1',
            valueInputOption: 'RAW',
            requestBody: {
                values: [
                    [nbd_id, status || '', remark || '', timestamp, final_next_follow_up_date || '', type || '', final_follow_up_date || '']
                ]
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Follow-up status updated',
            nbd_id,
            status,
            remark,
            next_follow_up_date,
            type
        });
    } catch (error) {
        console.error('Error creating follow-up entry:', error);
        return NextResponse.json({ error: 'Failed to create follow-up entry' }, { status: 500 });
    }
}
