export type LeadConfig = {
  name: string;
  campaign_type?: string;
  contact_role?: string;
  branch?: string;
  tier?: number | string;
  size?: number | string;
  note?: string;
  provider?: string;
  cqc_location_id?: string;
  overall_rating?: string;
  last_inspection_date?: string;
  rating_safe?: string;
  rating_effective?: string;
  rating_caring?: string;
  rating_responsive?: string;
  rating_well_led?: string;
  local_authority?: string;
  cqc_service_type?: string;
};

export const formatName = (fullName: string) => {
  if (!fullName) return 'there';
  const lower = fullName.toLowerCase();
  if (lower === 'registered manager' || lower.includes('manager') || lower === 'director' || lower.includes('nominated individual') || lower.includes('registered')) {
    return 'there';
  }
  if (fullName.includes('&')) {
    return fullName.replace(/([a-zA-Z& ]+).*/, '$1').trim();
  }
  return fullName.split(' ')[0];
};

export const getWeakestQualityStatement = (lead: LeadConfig) => {
  const ratings = [
    { name: 'Safe', rating: lead.rating_safe },
    { name: 'Effective', rating: lead.rating_effective },
    { name: 'Caring', rating: lead.rating_caring },
    { name: 'Responsive', rating: lead.rating_responsive },
    { name: 'Well led', rating: lead.rating_well_led },
  ];
  const riRating = ratings.find(r => r.rating?.toLowerCase() === 'requires improvement');
  return riRating ? riRating.name : 'Well led';
};

export const getWeakRatingsSummary = (lead: LeadConfig): string => {
  const ratings = [
    { name: 'Safe', rating: lead.rating_safe },
    { name: 'Effective', rating: lead.rating_effective },
    { name: 'Caring', rating: lead.rating_caring },
    { name: 'Responsive', rating: lead.rating_responsive },
    { name: 'Well led', rating: lead.rating_well_led },
  ];
  const weak = ratings.filter(r =>
    r.rating?.toLowerCase() === 'requires improvement' ||
    r.rating?.toLowerCase() === 'inadequate'
  );
  return weak.length > 0 ? weak.map(r => `${r.name} (${r.rating})`).join(', ') : '';
};

export const formatInspectionDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  try { return new Date(dateStr).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }); }
  catch { return dateStr; }
};

export type ContactRole = 'Registered Manager' | 'Nominated Individual' | 'Director' | 'other';

export const resolveRole = (lead: LeadConfig): ContactRole => {
  const r = (lead.contact_role || '').toLowerCase();
  if (r.includes('nominated individual')) return 'Nominated Individual';
  if (r.includes('director')) return 'Director';
  if (r.includes('registered manager') || r === '') return 'Registered Manager';
  return 'other';
};

const BOOKING_URL = 'https://outlook.office.com/bookwithme/user/e97f487ef98b49689b66cfc0528a60aa@elvoraconsulting.co.uk?anonymous&ep=pcard';
const PHONE = '0115 646 8587';
const LOGO_URL = 'https://elvoraconsulting.co.uk/icon.png';

export const getSignatureHTML = (config: { name?: string; role?: string; phone?: string; email?: string; }) => {
  const name = config.name || 'Melissa Meakin';
  const role = config.role || 'CARE CONSULTANT';
  const phone = config.phone || PHONE;
  const email = config.email || 'melissa@elvoraconsulting.co.uk';

  return `<table style="font-family: Arial, sans-serif; font-size: 14px; color: #333; margin-top: 30px;">
    <tr><td style="padding-right: 15px; border-right: 2px solid #00938a;"><img src="${LOGO_URL}" alt="Elvora Consulting" width="100" style="display: block;" /></td>
      <td style="padding-left: 15px;"><p style="margin: 0; font-weight: bold; font-size: 16px;">${name}</p>
        <p style="margin: 0; font-size: 12px; color: #00938a; text-transform: uppercase; letter-spacing: 1px;">${role}</p>
        <table style="margin-top: 10px; font-size: 12px;">
          <tr><td style="font-weight: bold; padding-right: 10px;">T:</td><td>${phone}</td></tr>
          <tr><td style="font-weight: bold; padding-right: 10px;">E:</td><td><a href="mailto:${email}" style="color: #00938a; text-decoration: none;">${email}</a></td></tr>
          <tr><td style="font-weight: bold; padding-right: 10px;">W:</td><td><a href="https://elvoraconsulting.co.uk" style="color: #00938a; text-decoration: none;">elvoraconsulting.co.uk</a></td></tr>
        </table>
      </td></tr></table>`;
};

export const bookingButton = (text: string) => `
<div style="margin-top: 20px;">
  <a href="${BOOKING_URL}" style="display: inline-block; padding: 12px 24px; background-color: #00938a; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold;">
    ${text}
  </a>
</div>`;

export const signature = getSignatureHTML({});
