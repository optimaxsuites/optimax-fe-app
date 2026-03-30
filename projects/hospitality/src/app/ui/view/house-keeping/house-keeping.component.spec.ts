import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HouseKeepingComponent } from './house-keeping.component';

describe('HouseKeepingComponent', () => {
  let component: HouseKeepingComponent;
  let fixture: ComponentFixture<HouseKeepingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HouseKeepingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HouseKeepingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
