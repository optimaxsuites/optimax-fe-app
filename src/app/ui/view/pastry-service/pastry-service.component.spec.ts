import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PastryServiceComponent } from './pastry-service.component';

describe('PastryServiceComponent', () => {
  let component: PastryServiceComponent;
  let fixture: ComponentFixture<PastryServiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PastryServiceComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PastryServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
