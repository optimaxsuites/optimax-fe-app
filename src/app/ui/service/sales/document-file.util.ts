// document-file.util.ts
//
// Opening and downloading the files a seller uploaded along the way (the customer's LPO, the
// signed delivery note). Until the backend stores them, they're kept on the quote as base64
// (QuoteDocumentAttachment); once it does, records carry a URL instead. Both are handled here.

export interface ViewableDocument {
  fileName: string;
  contentType?: string;
  /** Raw base64 (no data: prefix) — how files kept on the quote are stored. */
  base64Content?: string;
  /** A stored file's URL, once the backend provides one. */
  url?: string;
  uploadedAt?: unknown;
}

export function hasDocumentContent(doc: ViewableDocument | null | undefined): boolean {
  return !!(doc?.url || doc?.base64Content);
}

export function isImageDocument(doc: ViewableDocument | null | undefined): boolean {
  return (doc?.contentType || '').startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(doc?.fileName || '');
}

/** A URL the browser can show — the stored URL, or an object URL built from the base64 (the
 *  caller revokes it with URL.revokeObjectURL when done). */
export function documentObjectUrl(doc: ViewableDocument): { url: string; revoke: boolean } | null {
  if (doc.url) return { url: doc.url, revoke: false };
  if (!doc.base64Content) return null;
  const bytes = Uint8Array.from(atob(doc.base64Content), ch => ch.charCodeAt(0));
  const blob = new Blob([bytes], { type: doc.contentType || 'application/octet-stream' });
  return { url: URL.createObjectURL(blob), revoke: true };
}

/** Saves the file to the seller's computer under its original name. */
export function downloadDocument(doc: ViewableDocument): boolean {
  const target = documentObjectUrl(doc);
  if (!target) return false;
  const a = document.createElement('a');
  a.href = target.url;
  a.download = doc.fileName || 'document';
  a.target = '_blank';
  a.rel = 'noopener';
  a.click();
  if (target.revoke) setTimeout(() => URL.revokeObjectURL(target.url), 1000);
  return true;
}
