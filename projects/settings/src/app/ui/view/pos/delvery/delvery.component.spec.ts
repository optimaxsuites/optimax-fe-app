import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DelveryComponent } from './delvery.component';

describe('DelveryComponent', () => {
  let component: DelveryComponent;
  let fixture: ComponentFixture<DelveryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DelveryComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DelveryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
