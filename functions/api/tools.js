export async function onRequestGet() {
  return Response.json({
    tools: [
      { id: 'akas-dura', name: 'Akas Dura', type: 'web-tool', url: 'https://tools.shanex.lk/tools/akas-dura', version: '1.0.0', permissions: ['export-pdf'] },
      { id: 'business-card-planner', name: 'Business Card Planner', type: 'web-tool', url: 'https://tools.shanex.lk/tools/business-card-planner', version: '1.0.0', permissions: ['export-pdf'] },
      { id: 'bill-numbering', name: 'Bill Book Numbering', type: 'web-tool', url: 'https://tools.shanex.lk/tools/bill-numbering', version: '1.0.0', permissions: ['export-pdf'] }
    ]
  });
}
