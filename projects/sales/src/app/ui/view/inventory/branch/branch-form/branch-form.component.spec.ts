import { of } from 'rxjs';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { BranchFormComponent } from './branch-form.component';
import { InventoryService } from '../../../../service/inventory/inventory.service';

describe('BranchFormComponent', () => {
  let component: BranchFormComponent;
  let inventoryService: jasmine.SpyObj<InventoryService>;

  beforeEach(() => {
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['getBranchTypes', 'createBranchType']);
    inventoryService.getBranchTypes.and.returnValue(of(['STANDARD', 'FLAGSHIP', 'MINI']));

    const route = { params: of({}) } as unknown as ActivatedRoute;
    component = new BranchFormComponent(new FormBuilder(), inventoryService, { navigate: jasmine.createSpy('navigate') } as any, route);
    component.ngOnInit();
  });

  it('restores the previously selected branch type when "+ Add Branch Type" is cancelled', () => {
    component.branchForm.get('type')?.setValue('FLAGSHIP');
    // A native <select> bound via formControlName updates the control's value as part of the
    // browser's own 'change' event (via Angular's SelectControlValueAccessor) before the
    // template's own (change)="onBranchTypeChange($event)" handler runs on that same event —
    // that's what the pairwise() subscription in ngOnInit is watching for.
    component.branchForm.get('type')?.setValue('__add_branch_type__');
    component.onBranchTypeChange({ target: { value: '__add_branch_type__' } } as unknown as Event);

    expect(component.showAddTypeModal).toBeTrue();
    expect(component.branchForm.get('type')?.value).toBe('');

    component.closeAddTypeModal();

    expect(component.showAddTypeModal).toBeFalse();
    expect(component.branchForm.get('type')?.value).toBe('FLAGSHIP');
  });

  it('does not clobber a real type that was already set when the modal closes after a successful save', () => {
    component.branchForm.get('type')?.setValue('STANDARD');
    component.branchForm.get('type')?.setValue('__add_branch_type__');
    component.onBranchTypeChange({ target: { value: '__add_branch_type__' } } as unknown as Event);

    inventoryService.createBranchType.and.returnValue(of(['STANDARD', 'FLAGSHIP', 'MINI', 'Custom Type']));
    component.newBranchTypeName = 'Custom Type';
    component.saveCustomBranchType();

    expect(component.branchForm.get('type')?.value).toBe('Custom Type');
    expect(component.showAddTypeModal).toBeFalse();
  });
});
