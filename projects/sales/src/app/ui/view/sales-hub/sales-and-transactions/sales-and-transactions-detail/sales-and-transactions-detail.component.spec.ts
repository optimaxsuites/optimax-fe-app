import { of, Subject } from 'rxjs';

import { SalesAndTransactionsDetailComponent } from './sales-and-transactions-detail.component';
import { SalesService } from '../../../../service/sales/sales.service';
import { SalesandTransactions, SaleLifecycleStatus } from '../../../../domain/sales/sales.dto';

describe('SalesAndTransactionsDetailComponent', () => {
  let component: SalesAndTransactionsDetailComponent;
  let salesService: jasmine.SpyObj<SalesService>;

  const tx = (status: SaleLifecycleStatus): SalesandTransactions => ({ id: 1, status } as SalesandTransactions);

  const activatedRoute = (paramMap$: any = of({ get: () => null } as any)) => ({
    paramMap: paramMap$,
    snapshot: { paramMap: { get: () => null } }
  } as any);

  beforeEach(() => {
    salesService = jasmine.createSpyObj<SalesService>('SalesService', ['getSalesandTransactionsById', 'orderNumberFor']);
    salesService.orderNumberFor.and.callFake((tx: any) => tx?.orderId || '');
    salesService.getSalesandTransactionsById.and.returnValue(of(null));
    component = new SalesAndTransactionsDetailComponent(
      activatedRoute(),
      { navigate: jasmine.createSpy('navigate') } as any,
      salesService
    );
  });

  describe('isStepCompleted: every real SaleLifecycleStatus is accounted for', () => {
    it('shows no progress before the transaction has loaded', () => {
      component.transaction = null;
      expect(component.isStepCompleted(2)).toBeFalse();
    });

    it('DISPATCHED and IN_TRANSIT complete steps 2 and 3 — the exact statuses this delivery-tracking view exists to show', () => {
      component.transaction = tx('DISPATCHED');
      expect(component.isStepCompleted(2)).toBeTrue();
      expect(component.isStepCompleted(3)).toBeTrue();
      expect(component.isStepCompleted(4)).toBeTrue();
      expect(component.isStepCompleted(5)).toBeFalse();

      component.transaction = tx('IN_TRANSIT');
      expect(component.isStepCompleted(3)).toBeTrue();
      expect(component.isStepCompleted(5)).toBeFalse();
    });

    it('a QUOTE_SENT order has not reached step 2 yet', () => {
      component.transaction = tx('QUOTE_SENT');
      expect(component.isStepCompleted(1)).toBeTrue();
      expect(component.isStepCompleted(2)).toBeFalse();
    });

    it('PAYMENT_IN_PROGRESS/PAYMENT_FAILED reached the invoice step but not the payment-completed step', () => {
      component.transaction = tx('PAYMENT_IN_PROGRESS');
      expect(component.isStepCompleted(3)).toBeTrue();
      expect(component.isStepCompleted(4)).toBeFalse();

      component.transaction = tx('PAYMENT_FAILED');
      expect(component.isStepCompleted(3)).toBeTrue();
      expect(component.isStepCompleted(4)).toBeFalse();
    });

    it('DELIVERED and RETURNED both reached the final delivered milestone', () => {
      component.transaction = tx('DELIVERED');
      expect(component.isStepCompleted(5)).toBeTrue();

      component.transaction = tx('RETURNED');
      expect(component.isStepCompleted(5)).toBeTrue();
    });
  });

  describe('navigation staleness: reloads when the route id actually changes', () => {
    it('calls getSalesandTransactionsById again for a second id pushed through the same paramMap subscription', () => {
      const paramMap$ = new Subject<any>();
      salesService.getSalesandTransactionsById.and.returnValue(of(tx('QUOTE_SENT')));
      const c = new SalesAndTransactionsDetailComponent(
        activatedRoute(paramMap$.asObservable()),
        { navigate: jasmine.createSpy('navigate') } as any,
        salesService
      );

      c.ngOnInit();
      paramMap$.next({ get: () => '1' } as any);
      expect(salesService.getSalesandTransactionsById).toHaveBeenCalledWith('1');

      paramMap$.next({ get: () => '2' } as any);
      expect(salesService.getSalesandTransactionsById).toHaveBeenCalledWith('2');
      expect(salesService.getSalesandTransactionsById).toHaveBeenCalledTimes(2);
    });
  });
});
