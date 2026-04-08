import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PdfParsingService {

  constructor() { }

  async extractTableData(buffer: ArrayBuffer): Promise<any[]> {
    console.log('PdfParsingService: Starting extraction...');
    let pdfjs: any;
    try {
      // Direct import if possible, otherwise fallback to window
      pdfjs = (window as any).pdfjsLib || await import('pdfjs-dist');
    } catch (importErr) {
      console.warn('PdfParsingService: Dynamic import of pdfjs-dist failed, falling back to window.pdfjsLib');
      pdfjs = (window as any).pdfjsLib;
    }
    
    if (!pdfjs) {
      console.error('PdfParsingService: pdfjsLib not found in window or via import');
      throw new Error('PDF library (pdf.js) not found. This browser might be blocking the external dependency.');
    }

    try {
      // Set worker source - use a version-specific CDN link for better compatibility
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        const v = pdfjs.version || '3.4.120';
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${v}/pdf.worker.min.js`;
      }

      const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
      console.log(`PdfParsingService: PDF loaded, pages: ${pdf.numPages}`);
      const allRows: string[][] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const items: any[] = textContent.items;
        
        if (items.length === 0) continue;

        // Group items by Y coordinate with a more permissive threshold
        const thresholdY = 8; 
        const rows: any[][] = [];
        
        // Sort by Y descending (top to bottom)
        items.sort((a, b) => b.transform[5] - a.transform[5]);

        let currentRow: any[] = [];
        let lastY = items[0].transform[5];

        items.forEach(item => {
          const y = item.transform[5];
          if (Math.abs(y - lastY) < thresholdY) {
            currentRow.push(item);
          } else {
            rows.push(currentRow);
            currentRow = [item];
            lastY = y;
          }
        });
        if (currentRow.length > 0) rows.push(currentRow);

        // For each row, sort items by X coordinate (left to right) and merge close fragments
        rows.forEach(rowItems => {
          rowItems.sort((a, b) => a.transform[4] - b.transform[4]);
          
          const mergedRow: string[] = [];
          let currentCell = '';
          let lastX = -1;
          let lastWidth = 0;

          rowItems.forEach(item => {
            const x = item.transform[4];
            const width = item.width || (item.str.length * 5); // Fallback width calculation

            // If gap is small (less than 15 units), merge into same cell
            // This threshold is crucial for grouping characters into words/columns
            if (lastX === -1 || (x - (lastX + lastWidth)) < 15) {
              // Add space if there's a small gap
              if (lastX !== -1 && (x - (lastX + lastWidth)) > 3) {
                currentCell += ' ';
              }
              currentCell += item.str;
            } else {
              if (currentCell.trim()) mergedRow.push(currentCell.trim());
              currentCell = item.str;
            }
            lastX = x;
            lastWidth = width;
          });
          if (currentCell.trim()) mergedRow.push(currentCell.trim());

          if (mergedRow.length > 0) {
            allRows.push(mergedRow);
          }
        });
      }

      console.log(`PdfParsingService: Extracted ${allRows.length} raw rows.`);
      if (allRows.length > 0) {
        console.log('Sample row data:', JSON.stringify(allRows.slice(0, 3)));
      }
      
      return this.processExtractedRows(allRows);
    } catch (err: any) {
      console.error('PdfParsingService: Extraction error:', err);
      throw new Error(`Failed to parse PDF content: ${err.message}`);
    }
  }

  private processExtractedRows(rows: string[][]): any[] {
    if (rows.length === 0) return [];

    // Improved keyword list for header detection
    const headerKeywords = ['date', 'description', 'narrative', 'amount', 'credit', 'debit', 'balance', 'withdrawal', 'deposit', 'ref', 'value', 'details'];
    let headerIdx = -1;
    
    // Look for a row that has multiple header-like words
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const row = rows[i];
      const matchCount = row.filter(cell => 
        headerKeywords.some(kw => cell.toLowerCase().includes(kw))
      ).length;
      
      if (matchCount >= 2) {
        headerIdx = i;
        console.log(`PdfParsingService: Found header at row ${i}:`, JSON.stringify(row));
        break;
      }
    }

    if (headerIdx === -1) {
      console.warn('PdfParsingService: No clear header found. Using fallback column names.');
      // Special fallback: Find the row with the most columns and treat that as "header" or just use indices
      const maxCols = Math.max(...rows.map(r => r.length));
      
      return rows.map(row => {
        const obj: any = {};
        // If the row has data, map it to generic column names
        for (let i = 0; i < maxCols; i++) {
          obj[`Column_${i + 1}`] = row[i] || '';
        }
        return obj;
      });
    }

    const headers = rows[headerIdx];
    const dataRows = rows.slice(headerIdx + 1);

    // Filter out rows that are likely empty or page footers (e.g., page numbers)
    const filteredData = dataRows.filter(row => {
      const hasContent = row.some(cell => cell.length > 0);
      const isPageNumber = row.length === 1 && /^\d+$/.test(row[0]);
      return hasContent && !isPageNumber;
    });

    return filteredData.map(row => {
      const obj: any = {};
      headers.forEach((header, i) => {
        // Use the header text as key, or fallback to index if header is empty
        const key = header.trim() || `Column_${i + 1}`;
        obj[key] = row[i] || '';
      });
      return obj;
    });
  }
}
