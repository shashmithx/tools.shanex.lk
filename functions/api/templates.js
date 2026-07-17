const templates = [
  {
    id: 'fast-a4-bw',
    name: 'Fast A4 B&W',
    version: '1.0.0',
    description: 'Everyday school document printing with safe margins.',
    settings: { paperSize: 'A4', orientation: 'portrait', colorMode: 'grayscale', duplex: 'single', pagesPerSheet: 1, scale: 'fit95', paperSafeMargin: 3 }
  },
  {
    id: 'business-card-a4',
    name: 'Business Card Sheet',
    version: '1.0.0',
    description: 'Color A4 output suitable for imposed card sheets.',
    settings: { paperSize: 'A4', orientation: 'portrait', colorMode: 'color', duplex: 'single', pagesPerSheet: 1, scale: 'noscale', paperSafeMargin: 0 }
  },
  {
    id: 'bill-book-numbering',
    name: 'Bill Book Numbering',
    version: '1.0.0',
    description: 'Single-sided numbering output for bill books and receipt books.',
    settings: { paperSize: 'A4', orientation: 'portrait', colorMode: 'grayscale', duplex: 'single', pagesPerSheet: 1, scale: 'noscale', paperSafeMargin: 3 }
  }
];

export async function onRequestGet() {
  return Response.json({ templates });
}
