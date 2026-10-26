import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/** How far above a page's bottom edge to look for a blank row to break on, as a share of the page. */
const BREAK_SEARCH_SHARE = 0.15;

/** True when every pixel in row `y` is (near) white, i.e. the page can be cut there without slicing text. */
function isBlankRow(ctx: CanvasRenderingContext2D, width: number, y: number): boolean {
  const row = ctx.getImageData(0, y, width, 1).data;
  for (let i = 0; i < row.length; i += 4) {
    if (row[i] < 245 || row[i + 1] < 245 || row[i + 2] < 245) {
      return false;
    }
  }
  return true;
}

/** The row to end a page at: the lowest blank row just above `idealEnd`, or `idealEnd` if there is none. */
function findPageBreak(ctx: CanvasRenderingContext2D, width: number, idealEnd: number, pageHeightPx: number): number {
  const lowest = Math.max(idealEnd - Math.floor(pageHeightPx * BREAK_SEARCH_SHARE), 1);
  for (let y = idealEnd; y >= lowest; y--) {
    if (isBlankRow(ctx, width, y)) {
      return y;
    }
  }
  return idealEnd;
}

/**
 * Saves an element as an A4 PDF. Content taller than one page continues on further pages, with each
 * break moved up to the nearest blank row so lines of text aren't cut in half.
 */
export async function saveElementAsPdf(element: HTMLElement, fileName: string): Promise<void> {
  const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
  const ctx = canvas.getContext('2d');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  // Canvas pixels that fill one page when the canvas is scaled to the page width.
  const pageHeightPx = Math.floor((canvas.width * pageHeight) / pageWidth);

  let top = 0;
  let firstPage = true;
  while (top < canvas.height) {
    let end = Math.min(top + pageHeightPx, canvas.height);
    if (end < canvas.height && ctx) {
      end = findPageBreak(ctx, canvas.width, end, pageHeightPx);
    }

    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = end - top;
    slice.getContext('2d')?.drawImage(canvas, 0, top, canvas.width, slice.height, 0, 0, canvas.width, slice.height);

    if (!firstPage) {
      pdf.addPage();
    }
    pdf.addImage(slice.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, (slice.height * pageWidth) / canvas.width);
    firstPage = false;
    top = end;
  }

  pdf.save(fileName);
}
