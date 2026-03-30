import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorIndividualComponent } from './vendor-individual.component';

describe('VendorIndividualComponent', () => {
  let component: VendorIndividualComponent;
  let fixture: ComponentFixture<VendorIndividualComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VendorIndividualComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VendorIndividualComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
