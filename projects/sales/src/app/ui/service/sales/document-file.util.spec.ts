import { documentObjectUrl, hasDocumentContent, isImageDocument } from './document-file.util';

describe('document-file.util', () => {
  it('knows whether there is anything to show', () => {
    expect(hasDocumentContent(null)).toBeFalse();
    expect(hasDocumentContent({ fileName: 'a.pdf' })).toBeFalse();
    expect(hasDocumentContent({ fileName: 'a.pdf', base64Content: 'eA==' })).toBeTrue();
    expect(hasDocumentContent({ fileName: 'a.pdf', url: 'https://x/a.pdf' })).toBeTrue();
  });

  it('uses a stored URL as-is, and builds a revocable object URL from base64', () => {
    expect(documentObjectUrl({ fileName: 'a.pdf', url: 'https://x/a.pdf' })).toEqual({ url: 'https://x/a.pdf', revoke: false });
    const built = documentObjectUrl({ fileName: 'a.pdf', base64Content: btoa('%PDF'), contentType: 'application/pdf' })!;
    expect(built.url).toMatch(/^blob:/);
    expect(built.revoke).toBeTrue();
    URL.revokeObjectURL(built.url);
  });

  it('tells images from PDFs', () => {
    expect(isImageDocument({ fileName: 'scan.jpg' })).toBeTrue();
    expect(isImageDocument({ fileName: 'lpo', contentType: 'image/png' })).toBeTrue();
    expect(isImageDocument({ fileName: 'lpo.pdf', contentType: 'application/pdf' })).toBeFalse();
  });
});
