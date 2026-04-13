import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RolesNpermissionComponent } from './roles-npermission.component';

describe('RolesNpermissionComponent', () => {
  let component: RolesNpermissionComponent;
  let fixture: ComponentFixture<RolesNpermissionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RolesNpermissionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RolesNpermissionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
