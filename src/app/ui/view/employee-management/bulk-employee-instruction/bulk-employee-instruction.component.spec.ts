import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BulkEmployeeInstructionComponent } from './bulk-employee-instruction.component';

describe('BulkEmployeeInstructionComponent', () => {
  let component: BulkEmployeeInstructionComponent;
  let fixture: ComponentFixture<BulkEmployeeInstructionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BulkEmployeeInstructionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BulkEmployeeInstructionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
