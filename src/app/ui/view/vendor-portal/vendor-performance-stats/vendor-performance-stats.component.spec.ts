import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorPerformanceStatsComponent } from './vendor-performance-stats.component';

describe('VendorPerformanceStatsComponent', () => {
  let component: VendorPerformanceStatsComponent;
  let fixture: ComponentFixture<VendorPerformanceStatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VendorPerformanceStatsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendorPerformanceStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
