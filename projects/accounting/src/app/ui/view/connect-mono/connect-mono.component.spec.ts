import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConnectMonoComponent } from './connect-mono.component';

describe('ConnectMonoComponent', () => {
  let component: ConnectMonoComponent;
  let fixture: ComponentFixture<ConnectMonoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ConnectMonoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ConnectMonoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
