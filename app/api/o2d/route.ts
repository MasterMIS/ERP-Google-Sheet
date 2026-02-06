import { NextResponse } from 'next/server';
import { createO2DOrder } from '@/lib/sheets';

export async function POST(request: Request) {
    try {
        const data = await request.json();

        // Validate required fields
        if (!data.party_name || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
            return NextResponse.json(
                { error: 'Party name and items are required' },
                { status: 400 }
            );
        }

        // Validate items
        for (const item of data.items) {
            if (!item.item || !item.qty) {
                return NextResponse.json(
                    { error: 'Each item must have a name and quantity' },
                    { status: 400 }
                );
            }
        }

        const newOrder = await createO2DOrder(data);
        return NextResponse.json(newOrder);
    } catch (error) {
        console.error('Error creating O2D order:', error);
        return NextResponse.json(
            { error: 'Failed to create order' },
            { status: 500 }
        );
    }
}
