import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocationPickingComponent } from './location-picking.component';

describe('LocationPickingComponent', () => {
  let component: LocationPickingComponent;
  let fixture: ComponentFixture<LocationPickingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LocationPickingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LocationPickingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
