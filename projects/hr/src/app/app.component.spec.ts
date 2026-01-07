import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { AppHrComponent } from './app.component';

describe('AppHrComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterModule.forRoot([])
      ],
      declarations: [
        AppHrComponent
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppHrComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'ERP-HR'`, () => {
    const fixture = TestBed.createComponent(AppHrComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('ERP-HR');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppHrComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Hello, ERP-HR');
  });
});
