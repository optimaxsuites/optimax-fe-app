import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PregnancylistComponent } from './pregnancylist.component';

describe('PregnancylistComponent', () => {
  let component: PregnancylistComponent;
  let fixture: ComponentFixture<PregnancylistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PregnancylistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PregnancylistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
