import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArtstatusComponent } from './artstatus.component';

describe('ArtstatusComponent', () => {
  let component: ArtstatusComponent;
  let fixture: ComponentFixture<ArtstatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ArtstatusComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ArtstatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
