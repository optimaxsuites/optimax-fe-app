import { Component, ElementRef, ViewChild } from '@angular/core';
// // import { CompanyProfileService }

@Component({
  selector: 'app-pre-onboarding-form',
  templateUrl: './pre-onboarding-form.component.html',
  styleUrl: './pre-onboarding-form.component.scss'
})
export class PreOnboardingFormComponent {
  readonly ten   = Array(10).fill(0);
  readonly eleven = Array(11).fill(0);
  //   // get companyProfile$() { return this.companyProfileService.companyProfile$; }

  @ViewChild('formPage') formPage?: ElementRef<HTMLElement>;

  constructor() {}

  /**
   * Prints just the form, from a hidden frame. Printing the app window printed the app's scrolling
   * layout too, which clipped the form after the first page (no next of kin or guarantor section).
   * The frame gets the app's stylesheets, so the form looks the same and its print rules apply.
   */
  async print(): Promise<void> {
    const page = this.formPage?.nativeElement;
    if (!page) { window.print(); return; }

    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(frame);

    const doc = frame.contentDocument!;
    const win = frame.contentWindow!;
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join('');
    doc.open();
    doc.write(`<!doctype html><html><head><base href="${document.baseURI}"><title>Pre-Onboarding Form</title>${styles}</head>`
      + `<body style="margin:0;background:#fff">${page.outerHTML}</body></html>`);
    doc.close();

    // Wait for the stylesheets, the logo and fonts, or the print comes out unstyled.
    if (doc.readyState !== 'complete') {
      await new Promise((resolve) => win.addEventListener('load', resolve, { once: true }));
    }
    await Promise.all(Array.from(doc.images).map((img) => img.complete
      ? null
      : new Promise((resolve) => { img.onload = img.onerror = resolve; })));
    await (doc as any).fonts?.ready;

    const cleanUp = () => frame.remove();
    win.addEventListener('afterprint', cleanUp, { once: true });
    setTimeout(cleanUp, 60_000);
    win.focus();
    win.print();
  }
}
