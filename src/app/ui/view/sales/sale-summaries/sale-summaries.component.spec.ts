import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaleSummariesComponent } from './sale-summaries.component';

describe('SaleSummariesComponent', () => {
  let component: SaleSummariesComponent;
  let fixture: ComponentFixture<SaleSummariesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SaleSummariesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SaleSummariesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
