import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CorrectionrequestformComponent } from './correctionrequestform.component';

describe('CorrectionrequestformComponent', () => {
  let component: CorrectionrequestformComponent;
  let fixture: ComponentFixture<CorrectionrequestformComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CorrectionrequestformComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CorrectionrequestformComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
