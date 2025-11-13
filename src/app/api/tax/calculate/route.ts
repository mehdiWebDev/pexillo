// app/api/tax/calculate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const { country, state } = await req.json();

        if (!country || !state) {
            return NextResponse.json(
                { rate: 0, message: 'Missing location data' },
                { status: 200 }
            );
        }

        // Fetch tax rate from database
        const { data: taxRate, error } = await supabase
            .from('tax_rates')
            .select('rate')
            .eq('country_code', country.toUpperCase())
            .eq('state_code', state.toUpperCase())
            .single();

        if (error || !taxRate) {
            // Default tax rate if not found
            console.log('Tax rate not found for:', country, state);
            return NextResponse.json({ rate: 0 });
        }

        return NextResponse.json({
            rate: taxRate.rate,
            country,
            state
        });
    } catch (error) {
        console.error('Tax calculation error:', error);
        return NextResponse.json(
            { rate: 0, error: 'Failed to calculate tax' },
            { status: 200 }
        );
    }
}