import * as cheerio from 'cheerio';

async function run() {
  const res = await fetch('https://www.cqc.org.uk/location/1-2093133330/inspection-summary');
  const html = await res.text();
  const $ = cheerio.load(html);
  
  // Find all elements that have text, maybe specifically paragraphs
  const results: any[] = [];
  $('h1, h2, h3, p').each((_, el) => {
      const text = $(el).text().trim();
      if(text.length > 0) {
          results.push({ tag: el.tagName, text: text.substring(0, 100), class: $(el).attr('class') || '' });
      }
  });

  console.log(JSON.stringify(results, null, 2));
}

run();
