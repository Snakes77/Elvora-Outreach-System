import * as cheerio from 'cheerio';

async function run() {
  const res = await fetch('https://www.cqc.org.uk/location/1-2093133330/inspection-summary');
  const html = await res.text();
  const $ = cheerio.load(html);
  
  const findings: Record<string, string> = {};

  let currentSection = '';
  $('*').each((i, el) => {
      const tag = el.tagName;
      const text = $(el).text().trim();
      if (!text) return;

      if (tag === 'h2') {
          currentSection = ''; // Stop when we hit a new major section like "Similar services nearby..."
      } else if (tag === 'h3' && $(el).hasClass('rating__title')) {
          const lowerTitles = text.toLowerCase();
          if (lowerTitles.includes('our current view')) currentSection = 'current_view';
          else if (lowerTitles.includes("people's experience")) currentSection = 'peoples_experience';
          else currentSection = '';
      } else if (tag === 'p' && currentSection && !$(el).hasClass('rating__value')) {
          if (!text.startsWith('Updated') && !text.startsWith('Date of assessment') && !text.startsWith('Read the latest assessment') && text.length > 50) {
              findings[currentSection] = (findings[currentSection] || '') + ' ' + text;
          }
      }
  });

  // Trim up the values
  for (const key of Object.keys(findings)) {
      findings[key] = findings[key].trim().replace(/\s+/g, ' ');
  }

  console.log(JSON.stringify(findings, null, 2));
}

run();
