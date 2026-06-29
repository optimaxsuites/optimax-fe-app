import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReconciliationTabComponent } from './reconciliation-tab.component';

describe('ReconciliationTabComponent', () => {
  let component: ReconciliationTabComponent;
  let fixture: ComponentFixture<ReconciliationTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReconciliationTabComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReconciliationTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
