import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorMessagingComponent } from './vendor-messaging.component';

describe('VendorMessagingComponent', () => {
  let component: VendorMessagingComponent;
  let fixture: ComponentFixture<VendorMessagingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VendorMessagingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendorMessagingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
