
import { NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/sheets';

const SPREADSHEET_ID = '1zR7ak9cKx559fowngKCCkpEddcMxFg4diRbjvHtpsMQ';

export async function POST(request: Request) {
    try {
        const { id, ids, source } = await request.json();
        const targetIds = ids || (id ? [id] : []);

        if (targetIds.length === 0) {
            return NextResponse.json({ error: 'IDs are required' }, { status: 400 });
        }

        // Determine the source sheet name based on the source parameter
        const sourceSheetName = source === 'nbd-incoming' ? 'NBD Incoming' : 'NBD';
        console.log(`📋 Shift to CRR - Using source sheet: "${sourceSheetName}" (source parameter: "${source}")`);

        const sheets = await getGoogleSheetsClient();

        // 1. Get the source records
        const nbdResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sourceSheetName}!A:O`,
        });

        const nbdRows = nbdResponse.data.values || [];
        const recordsToShift = [];
        const indicesToDelete = [];

        // Skip header row if exists
        const foundIds: any[] = [];
        for (let i = 0; i < nbdRows.length; i++) {
            const row = nbdRows[i];
            if (targetIds.includes(row[0]) || targetIds.includes(Number(row[0]))) {
                recordsToShift.push(row);
                indicesToDelete.push(i);
                foundIds.push(row[0]);
            }
        }

        if (recordsToShift.length === 0) {
            const allSheetIds = nbdRows.map(row => row[0]).filter(Boolean);
            console.error('❌ Shift to CRR - No records found:');
            console.error('  Requested IDs:', targetIds);
            console.error('  All NBD sheet IDs:', allSheetIds.slice(0, 20), '... (showing first 20)');
            console.error('  Total rows in NBD sheet:', nbdRows.length);

            return NextResponse.json({
                error: 'No records found to shift',
                details: {
                    requestedIds: targetIds,
                    requestedCount: targetIds.length,
                    totalNbdRows: nbdRows.length,
                    message: 'The requested IDs were not found in the NBD sheet. They may have already been shifted or deleted.'
                }
            }, { status: 404 });
        }

        console.log('✅ Found records to shift:');
        console.log('  Requested IDs:', targetIds);
        console.log('  Found IDs:', foundIds);
        console.log('  Missing IDs:', targetIds.filter((id: any) => !foundIds.includes(id) && !foundIds.includes(String(id))));
        console.log('  Records to shift:', recordsToShift.length);

        // 2. Map records to CRR format
        const crrFullResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'CRR!A:A',
        });
        const crrIds = crrFullResponse.data.values?.map(row => Number(row[0])).filter(id => !isNaN(id)) || [];
        const lastId = crrIds.length > 0 ? Math.max(...crrIds) : 0;

        const crrHeaderResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'CRR!A1:Z1',
        });
        const crrHeaders = crrHeaderResponse.data.values?.[0] || [];

        const newCrrRows = recordsToShift.map((sourceRecord, idx) => {
            const newCrrRow = new Array(crrHeaders.length).fill('');
            // New sequential ID for CRR
            newCrrRow[0] = lastId + idx + 1;

            // Map other fields
            for (let i = 1; i < sourceRecord.length; i++) {
                if (i < newCrrRow.length) {
                    newCrrRow[i] = sourceRecord[i];
                }
            }
            return newCrrRow;
        });

        // 3. Append to CRR
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'CRR!A1',
            valueInputOption: 'RAW',
            requestBody: {
                values: newCrrRows
            }
        });

        // 4. Delete from source sheet (in descending order of index)
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });
        const nbdSheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === sourceSheetName)?.properties?.sheetId;

        if (nbdSheetId !== undefined) {
            const deleteRequests = indicesToDelete
                .sort((a, b) => b - a)
                .map(index => ({
                    deleteDimension: {
                        range: {
                            sheetId: nbdSheetId,
                            dimension: 'ROWS',
                            startIndex: index,
                            endIndex: index + 1,
                        }
                    }
                }));

            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                requestBody: {
                    requests: deleteRequests
                }
            });
        }

        return NextResponse.json({
            success: true,
            message: `Shifted ${recordsToShift.length} record(s) to CRR successfully`
        });
    } catch (error) {
        console.error('Error shifting to CRR:', error);
        return NextResponse.json({ error: 'Failed to shift record' }, { status: 500 });
    }
}
