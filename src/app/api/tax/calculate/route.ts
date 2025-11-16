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

        if (!country) {
            return NextResponse.json(
                { rate: 0, message: 'Missing country data' },
                { status: 200 }
            );
        }

        const countryCode = country.toUpperCase();
        const stateCode = state?.toUpperCase();

        // Try to fetch state-specific tax rate first (if state is provided)
        if (stateCode) {
            const { data: stateTaxRate, error: stateError } = await supabase
                .from('tax_rates')
                .select('rate')
                .eq('country_code', countryCode)
                .eq('state_code', stateCode)
                .single();

            if (!stateError && stateTaxRate) {
                return NextResponse.json({
                    rate: stateTaxRate.rate,
                    country: countryCode,
                    state: stateCode,
                    level: 'state'
                });
            }
        }

        // Fallback to country-level tax rate
        const { data: countryTaxRate, error: countryError } = await supabase
            .from('tax_rates')
            .select('rate')
            .eq('country_code', countryCode)
            .is('state_code', null)
            .single();

        if (!countryError && countryTaxRate) {
            return NextResponse.json({
                rate: countryTaxRate.rate,
                country: countryCode,
                state: stateCode,
                level: 'country'
            });
        }

        // No tax rate found
        console.log('Tax rate not found for:', countryCode, stateCode);
        return NextResponse.json({
            rate: 0,
            country: countryCode,
            state: stateCode,
            level: 'none'
        });
    } catch (error) {
        console.error('Tax calculation error:', error);
        return NextResponse.json(
            { rate: 0, error: 'Failed to calculate tax' },
            { status: 200 }
        );
    }
}