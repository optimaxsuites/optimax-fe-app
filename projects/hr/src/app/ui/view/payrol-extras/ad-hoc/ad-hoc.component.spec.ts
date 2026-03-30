import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdHocComponent } from './ad-hoc.component';

describe('AdHocComponent', () => {
  let component: AdHocComponent;
  let fixture: ComponentFixture<AdHocComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdHocComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AdHocComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
