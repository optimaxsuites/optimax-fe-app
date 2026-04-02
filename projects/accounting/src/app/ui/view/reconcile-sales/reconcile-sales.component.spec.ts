import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReconcileSalesComponent } from './reconcile-sales.component';

describe('ReconcileSalesComponent', () => {
  let component: ReconcileSalesComponent;
  let fixture: ComponentFixture<ReconcileSalesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReconcileSalesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReconcileSalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
