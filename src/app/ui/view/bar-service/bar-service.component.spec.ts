import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BarServiceComponent } from './bar-service.component';

describe('BarServiceComponent', () => {
  let component: BarServiceComponent;
  let fixture: ComponentFixture<BarServiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BarServiceComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BarServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
