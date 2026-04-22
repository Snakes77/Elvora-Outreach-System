import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RATING_COLORS: Record<string, string> = {
  'Outstanding': '#4F46E5', // Indigo
  'Good': '#10B981',       // Emerald
  'Requires Improvement': '#F59E0B', // Amber
  'Inadequate': '#EF4444',  // Red
  'Not rated': '#9CA3AF',   // Gray
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ locationId: string }> }
) {
  const { locationId } = await context.params;

  // 1. Fetch lead from Supabase
  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('cqc_location_id', locationId)
    .single();

  if (error || !lead) {
    return new NextResponse('Location not found in Elvora system.', { status: 404 });
  }

  // 2. Build the Branded HTML (Glassmorphism & Premium Design)
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600&display=swap" rel="stylesheet">
      <style>
        body { margin: 0; padding: 0; font-family: 'Outfit', sans-serif; background: transparent; overflow: hidden; }
        .elvora-widget {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 16px;
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.1);
          max-width: 280px;
          color: #1F2937;
          border-bottom: 4px solid ${RATING_COLORS[lead.overall_rating || 'Not rated']};
          transition: transform 0.2s ease;
        }
        .elvora-widget:hover { transform: translateY(-2px); }
        .logo { font-weight: 600; font-size: 14px; letter-spacing: 0.05em; color: #4F46E5; margin-bottom: 8px; }
        .name { font-size: 18px; font-weight: 600; text-align: center; margin-bottom: 4px; line-height: 1.2; }
        .rating-label { font-size: 11px; text-transform: uppercase; color: #6B7280; letter-spacing: 0.025em; margin-bottom: 4px; }
        .rating-value { 
          font-size: 20px; 
          font-weight: 600; 
          color: ${RATING_COLORS[lead.overall_rating || 'Not rated']};
          margin-bottom: 12px;
        }
        .details { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 10px; margin-bottom: 12px; }
        .detail-item { display: flex; flex-direction: column; background: rgba(255, 255, 255, 0.5); padding: 6px; border-radius: 8px; }
        .detail-label { color: #9CA3AF; margin-bottom: 2px; }
        .detail-value { font-weight: 600; }
        .footer { font-size: 10px; color: #9CA3AF; margin-top: 4px; }
      </style>
    </head>
    <body>
      <div class="elvora-widget">
        <div class="logo">ELVORA INSIGHTS</div>
        <div class="name">${lead.name}</div>
        <div class="rating-label">Overall CQC Quality</div>
        <div class="rating-value">${lead.overall_rating || 'Not Yet Rated'}</div>
        
        <div class="details">
          <div class="detail-item">
            <span class="detail-label">SAFE</span>
            <span class="detail-value">${lead.rating_safe || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">WELL LED</span>
            <span class="detail-value">${lead.rating_well_led || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">EFFECTIVE</span>
            <span class="detail-value">${lead.rating_effective || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">CARING</span>
            <span class="detail-value">${lead.rating_caring || '-'}</span>
          </div>
        </div>

        <div class="footer">Last Verified: ${lead.last_inspection_date || 'Live Data'}</div>
      </div>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}
