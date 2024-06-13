import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KPDataVisualizationComponent } from './kpdatavisualization.component';

describe('KPPivotTableComponent', () => {
  let component: KPDataVisualizationComponent;
  let fixture: ComponentFixture<KPDataVisualizationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ KPDataVisualizationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(KPDataVisualizationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
