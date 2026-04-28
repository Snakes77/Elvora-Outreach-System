import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    // Camouflage redirect out to the Microsoft Booking page to keep the initial link 
    // strictly aligned with the sending domain in the HTML template.
    const redirectUrl = 'https://outlook.office.com/bookwithme/user/e97f487ef98b49689b66cfc0528a60aa@elvoraconsulting.co.uk?anonymous&ep=pcard';
    return NextResponse.redirect(redirectUrl, 302);
}
