import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlysummaryComponent } from './monthlysummary.component';

describe('MonthlysummaryComponent', () => {
  let component: MonthlysummaryComponent;
  let fixture: ComponentFixture<MonthlysummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MonthlysummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonthlysummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
