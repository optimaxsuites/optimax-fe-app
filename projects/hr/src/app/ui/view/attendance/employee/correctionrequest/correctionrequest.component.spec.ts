import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CorrectionrequestComponent } from './correctionrequest.component';

describe('CorrectionrequestComponent', () => {
  let component: CorrectionrequestComponent;
  let fixture: ComponentFixture<CorrectionrequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CorrectionrequestComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CorrectionrequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
