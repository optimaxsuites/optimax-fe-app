import { FormBuilder } from '@angular/forms';

import { ActivityComponent } from './activity.component';
import { VendorLifecycleHistory, VendorLifecycleEvent } from '../../../../domain/vendor-management/vendor-management.dto';

describe('ActivityComponent', () => {
  let component: ActivityComponent;

  const event = (over: Partial<VendorLifecycleHistory> = {}): VendorLifecycleHistory => ({
    id: 1, vendorId: '7', event: VendorLifecycleEvent.ACTIVATED, description: 'x',
    performedBy: 'Admin', timestamp: new Date('2026-01-10'), ...over
  } as VendorLifecycleHistory);

  beforeEach(() => {
    component = new ActivityComponent({} as any, new FormBuilder());
  });

  it('re-processes when lifecycleHistory arrives after the tab was already created', () => {
    component.ngOnInit();
    expect(component.events.length).toBe(0); // created before the async history resolved

    component.lifecycleHistory = [event()];
    component.ngOnChanges({
      lifecycleHistory: { currentValue: component.lifecycleHistory, previousValue: [], firstChange: false, isFirstChange: () => false }
    });

    expect(component.events.length).toBe(1);
  });

  it('the initial binding (firstChange) does not double-process what ngOnInit already handled', () => {
    component.lifecycleHistory = [event()];
    component.ngOnChanges({
      lifecycleHistory: { currentValue: component.lifecycleHistory, previousValue: undefined, firstChange: true, isFirstChange: () => true }
    });
    component.ngOnInit();
    expect(component.events.length).toBe(1);
  });

  describe('date filter', () => {
    it('"To" a given day includes events later that same day, not just midnight', () => {
      component.lifecycleHistory = [event({ timestamp: new Date('2026-01-10T18:00:00') })];
      component.ngOnInit();
      component.filterForm.patchValue({ dateTo: '2026-01-10' });
      expect(component.filteredEvents.length).toBe(1);
    });

    it('still excludes a day after the selected "To" date', () => {
      component.lifecycleHistory = [event({ timestamp: new Date('2026-01-11T00:01:00') })];
      component.ngOnInit();
      component.filterForm.patchValue({ dateTo: '2026-01-10' });
      expect(component.filteredEvents.length).toBe(0);
    });
  });

  describe('event type -> icon/label matching', () => {
    it('an exact match wins over any substring match', () => {
      component.lifecycleHistory = [event({ event: 'ACTIVATED' as VendorLifecycleEvent })];
      component.ngOnInit();
      expect(component.events[0].typeLabel).toBe('Activated');
    });

    it('DEACTIVATED no longer matches ACTIVATED (was shown as green "Activated")', () => {
      component.lifecycleHistory = [event({ event: 'DEACTIVATED' as VendorLifecycleEvent })];
      component.ngOnInit();
      expect(component.events[0].typeLabel).not.toBe('Activated');
    });

    it('DOCUMENT_REJECTED no longer matches the plain REJECTED bucket', () => {
      component.lifecycleHistory = [event({ event: 'DOCUMENT_REJECTED' as VendorLifecycleEvent })];
      component.ngOnInit();
      expect(component.events[0].typeLabel).not.toBe('Rejected');
    });

    it('an unrecognised event type falls back to General, not a wrong specific bucket', () => {
      component.lifecycleHistory = [event({ event: 'SOMETHING_UNKNOWN' as VendorLifecycleEvent })];
      component.ngOnInit();
      expect(component.events[0].typeLabel).toBe('General Event');
    });
  });
});
