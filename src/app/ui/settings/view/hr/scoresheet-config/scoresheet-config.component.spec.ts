import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScoresheetConfigComponent } from './scoresheet-config.component';

describe('ScoresheetConfigComponent', () => {
  let component: ScoresheetConfigComponent;
  let fixture: ComponentFixture<ScoresheetConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ScoresheetConfigComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ScoresheetConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
