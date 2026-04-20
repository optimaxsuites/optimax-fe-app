import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WhatsappWidgetComponent } from './whatsapp-widget.component';

describe('WhatsappWidgetComponent', () => {
  let component: WhatsappWidgetComponent;
  let fixture: ComponentFixture<WhatsappWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WhatsappWidgetComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(WhatsappWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
