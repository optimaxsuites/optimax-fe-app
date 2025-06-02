import { TestBed } from '@angular/core/testing';
import { AppTenderComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppTenderComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppTenderComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'erp-tender' title`, () => {
    const fixture = TestBed.createComponent(AppTenderComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('erp-tender');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppTenderComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Hello, erp-tender');
  });
});
