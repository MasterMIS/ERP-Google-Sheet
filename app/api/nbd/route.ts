
import { NextResponse } from 'next/server';
import { getNBDs, createNBD, updateNBD, deleteNBD } from '@/lib/sheets';

export async function GET() {
    try {
        const nbds = await getNBDs();
        return NextResponse.json(nbds);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch NBDs' }, { status: 500 });
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
                    const newNBD = await createNBD(record);
                    results.push(newNBD);
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
        const newNBD = await createNBD(data);
        return NextResponse.json(newNBD);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create NBD' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const data = await request.json();
        const { id, ...updateData } = data;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const updatedNBD = await updateNBD(id, updateData);
        return NextResponse.json(updatedNBD);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update NBD' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        await deleteNBD(parseInt(id));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete NBD' }, { status: 500 });
    }
}
