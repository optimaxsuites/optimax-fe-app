import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BankAccountOverviewComponent } from './bank-account-overview.component';

describe('BankAccountOverviewComponent', () => {
  let component: BankAccountOverviewComponent;
  let fixture: ComponentFixture<BankAccountOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BankAccountOverviewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BankAccountOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
