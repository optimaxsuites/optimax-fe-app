import { of, Subject } from 'rxjs';

import { QuoteDetailComponent } from './quote-detail.component';
import { SalesService } from '../../../../service/sales/sales.service';
import { Quote, QuoteStatus } from '../../../../domain/sales/sales.dto';

describe('QuoteDetailComponent', () => {
  let component: QuoteDetailComponent;
  let salesService: jasmine.SpyObj<SalesService>;

  const quote = (over: Partial<Quote> = {}): Quote => ({
    id: 1, quoteNumber: 'QUO-1', status: 'SENT' as QuoteStatus, ...over
  } as Quote);

  const activatedRoute = (paramMap$: any = of({ get: () => null } as any)) => ({
    paramMap: paramMap$,
    snapshot: { paramMap: { get: () => null } }
  } as any);

  beforeEach(() => {
    salesService = jasmine.createSpyObj<SalesService>('SalesService', ['getQuoteById', 'updateQuote']);
    salesService.getQuoteById.and.returnValue(of(null));
    component = new QuoteDetailComponent(
      { add: jasmine.createSpy('add') } as any,
      activatedRoute(),
      { navigate: jasmine.createSpy('navigate') } as any,
      salesService
    );
  });

  describe('canDeleteQuote / deleteQuote: same guard as QuoteListComponent', () => {
    it('is false once a quote has been converted (or on its way there)', () => {
      component.quote = quote({ status: 'CONVERTED' as QuoteStatus });
      expect(component.canDeleteQuote()).toBeFalse();

      component.quote = quote({ status: 'ACCEPTED' as QuoteStatus });
      expect(component.canDeleteQuote()).toBeFalse();
    });

    it('is true for a quote that never produced a downstream order', () => {
      component.quote = quote({ status: 'SENT' as QuoteStatus });
      expect(component.canDeleteQuote()).toBeTrue();
    });

    it('refuses to open the archive-confirm modal for a converted quote', () => {
      component.quote = quote({ status: 'CONVERTED' as QuoteStatus });

      component.deleteQuote();

      expect(component.showDeleteQuoteModal).toBeFalse();
    });
  });

  describe('confirmDeleteQuote: archives (marks EXPIRED), does not actually delete', () => {
    it('calls updateQuote with status EXPIRED, never a real delete endpoint', () => {
      salesService.updateQuote.and.returnValue(of({ ...quote(), status: 'EXPIRED' } as any));
      component.quote = quote({ id: 5, status: 'SENT' as QuoteStatus });

      component.confirmDeleteQuote();

      expect(salesService.updateQuote).toHaveBeenCalledWith('5', { status: 'EXPIRED' });
    });

    it('does not call updateQuote at all for an already-converted quote (defensive re-check)', () => {
      component.quote = quote({ status: 'CONVERTED' as QuoteStatus });

      component.confirmDeleteQuote();

      expect(salesService.updateQuote).not.toHaveBeenCalled();
    });
  });

  describe('navigation staleness: reloads when the route id actually changes', () => {
    it('calls getQuoteById again for a second id pushed through the same paramMap subscription', () => {
      const paramMap$ = new Subject<any>();
      salesService.getQuoteById.and.returnValue(of(quote({ id: 1 })));
      const c = new QuoteDetailComponent(
        { add: jasmine.createSpy('add') } as any,
        activatedRoute(paramMap$.asObservable()),
        { navigate: jasmine.createSpy('navigate') } as any,
        salesService
      );

      c.ngOnInit();
      paramMap$.next({ get: () => '1' } as any);
      expect(salesService.getQuoteById).toHaveBeenCalledWith('1');

      paramMap$.next({ get: () => '2' } as any);
      expect(salesService.getQuoteById).toHaveBeenCalledWith('2');
      expect(salesService.getQuoteById).toHaveBeenCalledTimes(2);
    });
  });
});
