
import { NextResponse } from 'next/server';
import { getCRRs, createCRR, updateCRR, deleteCRR } from '@/lib/sheets';

export async function GET() {
    try {
        const crrs = await getCRRs();
        return NextResponse.json(crrs);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch CRRs' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const data = await request.json();

        // Handle bulk upload
        if (data.bulkUpload && Array.isArray(data.records)) {
            const results = [];
            const errors = [];

            for (const record of data.records) {
                try {
                    const newCRR = await createCRR(record);
                    results.push(newCRR);
                } catch (error: any) {
                    errors.push({
                        party_name: record.party_name,
                        error: error.message || 'Failed to create record'
                    });
                }
            }

            return NextResponse.json({
                success: true,
                message: `Successfully imported ${results.length} records${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
                imported: results.length,
                errors: errors.length > 0 ? errors : undefined
            });
        }

        // Handle single record creation
        const newCRR = await createCRR(data);
        return NextResponse.json(newCRR);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create CRR' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const data = await request.json();
        const { id, ...updateData } = data;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const updatedCRR = await updateCRR(id, updateData);
        return NextResponse.json(updatedCRR);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update CRR' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        await deleteCRR(parseInt(id));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete CRR' }, { status: 500 });
    }
}
