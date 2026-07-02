import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BankTellerMappingComponent } from './bank-teller-mapping.component';

describe('BankTellerMappingComponent', () => {
  let component: BankTellerMappingComponent;
  let fixture: ComponentFixture<BankTellerMappingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BankTellerMappingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BankTellerMappingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
