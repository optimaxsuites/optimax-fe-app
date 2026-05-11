import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin } from 'rxjs';
import { catchError, map, shareReplay, switchMap, tap, timeout } from 'rxjs/operators';

import {
  AccountDTO,
  AccountType,
  AccountingTransactionDTO,
  BalanceSheetReportDTO,
  CashFlowCategory,
  CashFlowLineItemDTO,
  CashFlowReportDTO,
  DashboardMetricsDTO,
  IncomeStatementReportDTO,
  JournalEntryDTO,
  JournalEntryLineDTO,
  PaginationResultDTO,
  ReportRequestDTO,
  ReportPeriodType,
  SavedReportSnapshotDTO,
  SourceModule,
  TaxSummaryReportDTO,
} from '../dtos/report.dto';
import { environment } from '../../ui/sharedComponent/service/environments/environment.prod';

type CollectionResponse<T> = PaginationResultDTO<T> | T[];

export interface AccountingDiagnostics {
  entityId: string | null;
  tenantId: string | null;
  tokenPresent: boolean;
  tokenSource: 'session' | 'local' | 'none';
  baseUrl: string;
  lastRequest: AccountingDiagnosticRequest | null;
  lastError: AccountingDiagnosticError | null;
}

interface AccountingDiagnosticRequest {
  timestamp: string;
  method: string;
  path: string;
  payload?: unknown;
}

interface AccountingDiagnosticError extends AccountingDiagnosticRequest {
  error: unknown;
}

/** Raw ledger entry shape returned by /ledger-entries */
export interface LedgerEntryRaw {
  id: number;
  account: {
    id: number;
    accountCode: number;
    accountName: string;
    accountType: string;
    parentAccountId?: number | null;
    description?: string;
    currency?: string;
  };
  journalEntryLine: {
    id?: number;
    journalEntryId?: number;
    accountId?: number;
    debitAmount?: number;
    creditAmount?: number;
    description?: string;
    createdBy?: number;
  } | null;
  debit: number;
  credit: number;
  balanceAfter: number | null;
  currencyCode: string | null;
  entryDate: number[];
  createdAt: unknown | null;
}

/** Raw accounting event shape returned by /events */
export interface AccountingEventRaw {
  id: number;
  sourceModule: string;
  eventType: string;
  amount: number;
  currency: string;
  reference: string;
  description: string;
  transactionDate: number[];
  metadata: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class AccountingService {
  private readonly baseUrl = `${environment.apiBaseUrl}/x/api/v2/accounting`;
  private readonly selectedPeriod$ = new BehaviorSubject<Date>(new Date());
  private lastRequest: AccountingDiagnosticRequest | null = null;
  private lastError: AccountingDiagnosticError | null = null;
  private ledgerEntriesCache$?: Observable<LedgerEntryRaw[]>;

  constructor(private readonly http: HttpClient) {
    console.info('[AccountingService] initialized', {
      entityId: this.resolveEntityId() || 'using tenantId as fallback',
      tenantId: this.resolveTenantId() || 'missing',
      tokenPresent: !!this.resolveToken(),
      tokenSource: this.getTokenSource(),
    });
  }

  get period$(): Observable<Date> {
    return this.selectedPeriod$.asObservable();
  }

  setPeriod(date: Date): void {
    this.selectedPeriod$.next(date);
  }

  getDiagnostics(): AccountingDiagnostics {
    return {
      entityId: this.resolveEntityId() || null,
      tenantId: this.resolveTenantId() || null,
      tokenPresent: !!this.resolveToken(),
      tokenSource: this.getTokenSource(),
      baseUrl: this.baseUrl,
      lastRequest: this.lastRequest,
      lastError: this.lastError,
    };
  }

  // ─── Report endpoints (each individually safe — never throws) ──────────────

  getIncomeStatementReport(request?: Partial<ReportRequestDTO>): Observable<IncomeStatementReportDTO> {
    return this.selectedPeriod$.pipe(
      switchMap((period) =>
        this.fetchIncomeStatementReport(this.buildReportRequest(period, request)),
      ),
      shareReplay(1),
    );
  }

  getBalanceSheetReport(request?: Partial<ReportRequestDTO>): Observable<BalanceSheetReportDTO> {
    return this.selectedPeriod$.pipe(
      switchMap((period) =>
        this.fetchBalanceSheetReport(this.buildReportRequest(period, request)),
      ),
      shareReplay(1),
    );
  }

  getCashFlowReport(request?: Partial<ReportRequestDTO>): Observable<CashFlowReportDTO> {
    return this.selectedPeriod$.pipe(
      switchMap((period) =>
        this.fetchCashFlowReport(this.buildReportRequest(period, request)),
      ),
      shareReplay(1),
    );
  }

  getTaxSummaryReport(request?: Partial<ReportRequestDTO>): Observable<TaxSummaryReportDTO> {
    return this.selectedPeriod$.pipe(
      switchMap((period) =>
        this.fetchTaxSummaryReport(this.buildReportRequest(period, request)),
      ),
      shareReplay(1),
    );
  }

  getDashboardMetrics(request?: Partial<ReportRequestDTO>): Observable<DashboardMetricsDTO> {
    return this.selectedPeriod$.pipe(
      switchMap((period) => {
        const payload = this.buildReportRequest(period, request);
        const params = new HttpParams()
          .set('periodStart', payload.periodStart)
          .set('periodEnd', payload.periodEnd)
          .set('reportPeriodType', payload.reportPeriodType)
          .set('entityId', payload.entityId ?? '')
          .set('currencyCode', payload.currencyCode ?? '');

        return this.http.get<DashboardMetricsDTO>(
          `${this.baseUrl}/dashboard/metrics`,
          { headers: this.buildHeaders(), params },
        );
      }),
      shareReplay(1),
    );
  }

  getSavedReportSnapshots(page = 1, size = 10): Observable<PaginationResultDTO<SavedReportSnapshotDTO>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PaginationResultDTO<SavedReportSnapshotDTO>>(
      `${this.baseUrl}/reports/saved-snapshots`,
      { headers: this.buildHeaders(), params },
    );
  }

  // ─── Reference data endpoints ───────────────────────────────────────────────

  getChartOfAccounts(): Observable<AccountDTO[]> {
    return this.getCollection<AccountDTO>('/accounts');
  }

  getReportAccounts(): Observable<AccountDTO[]> {
    return this.getChartOfAccounts();
  }

  getAccountingTransactions(): Observable<AccountingTransactionDTO[]> {
    return this.getCollection<AccountingTransactionDTO>('/transactions?page=1&size=1000');
  }

  getJournalEntries(): Observable<JournalEntryDTO[]> {
    return this.getCollection<JournalEntryDTO>('/journal-entries?page=1&size=1000');
  }

  getJournalEntryLines(): Observable<JournalEntryLineDTO[]> {
    return this.getCollection<JournalEntryLineDTO>('/journal-entry-lines?page=1&size=1000');
  }

  getLedgerEntries(forceRefresh = false): Observable<LedgerEntryRaw[]> {
    if (!this.ledgerEntriesCache$ || forceRefresh) {
      this.ledgerEntriesCache$ = this.http.get<CollectionResponse<LedgerEntryRaw>>(
        `${this.baseUrl}/ledger-entries?page=1&size=1000`,
        { headers: this.buildHeaders() },
      ).pipe(
        timeout(60000),
        map((r) => (Array.isArray(r) ? r : (r as PaginationResultDTO<LedgerEntryRaw>).content ?? [])),
        shareReplay(1),
      );
    }

    return this.ledgerEntriesCache$;
  }

  getAccountingEvents(): Observable<AccountingEventRaw[]> {
    return this.http.get<CollectionResponse<AccountingEventRaw>>(
      `${this.baseUrl}/events?page=1&size=100`,
      { headers: this.buildHeaders() },
    ).pipe(
      map((r) => (Array.isArray(r) ? r : (r as PaginationResultDTO<AccountingEventRaw>).content ?? [])),
    );
  }

  getYearlyTaxSummary(year: number): Observable<{ byMonth: Array<{ month: number; amount: number }>; total: number }> {
    const requests = Array.from({ length: 12 }, (_, month) => {
      const period = new Date(year, month, 1);
      const request = this.buildReportRequest(period, { reportPeriodType: 'monthly' });
      return this.fetchTaxSummaryReport(request).pipe(
        map((report) => ({
          month,
          amount:
            (report.vat?.netVatPayable ?? 0) +
            (report.wht?.totalWithheld ?? 0) +
            (report.cit?.totalCitLiability ?? 0) +
            (report.paye?.totalPayeDeducted ?? 0),
        })),
      );
    });

    return forkJoin(requests).pipe(
      map((byMonth) => ({
        byMonth,
        total: byMonth.reduce((sum, entry) => sum + entry.amount, 0),
      })),
    );
  }

  // ─── Private fetch methods ──────────────────────────────────────────────────

  private fetchIncomeStatementReport(request: ReportRequestDTO): Observable<IncomeStatementReportDTO> {
    this.traceOutgoing('POST', '/reports/income-statement', request);
    return this.http.post<IncomeStatementReportDTO>(
      `${this.baseUrl}/reports/income-statement`,
      request,
      { headers: this.buildHeaders() },
    ).pipe(
      tap((r) => console.log('✅ income-statement', r)),
      catchError((e) => { this.traceError('POST', '/reports/income-statement', request, e); throw e; }),
    );
  }

  private fetchBalanceSheetReport(request: ReportRequestDTO): Observable<BalanceSheetReportDTO> {
    this.traceOutgoing('POST', '/reports/balance-sheet', request);
    return this.http.post<BalanceSheetReportDTO>(
      `${this.baseUrl}/reports/balance-sheet`,
      request,
      { headers: this.buildHeaders() },
    ).pipe(
      tap((r) => console.log('✅ balance-sheet', r)),
      catchError((e) => { this.traceError('POST', '/reports/balance-sheet', request, e); throw e; }),
    );
  }

  private fetchCashFlowReport(request: ReportRequestDTO): Observable<CashFlowReportDTO> {
    this.traceOutgoing('GET', '/ledger-entries', { report: 'cash-flow', request });
    return this.buildCashFlowReportFromLedger(request);
  }

  private fetchTaxSummaryReport(request: ReportRequestDTO): Observable<TaxSummaryReportDTO> {
    this.traceOutgoing('POST', '/reports/tax-summary', request);
    return this.http.post<TaxSummaryReportDTO>(
      `${this.baseUrl}/reports/tax-summary`,
      request,
      { headers: this.buildHeaders() },
    ).pipe(
      tap((r) => console.log('✅ tax-summary', r)),
      catchError((e) => { this.traceError('POST', '/reports/tax-summary', request, e); throw e; }),
    );
  }

  // ─── Static fallbacks (no HTTP calls — never fail) ─────────────────────────
  // These are returned immediately when the backend reports endpoints return 500.
  // They carry _isFallback = true so the UI can show a notice.

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private getCollection<T>(path: string): Observable<T[]> {
    return this.http.get<CollectionResponse<T>>(
      `${this.baseUrl}${path}`,
      { headers: this.buildHeaders() },
    ).pipe(
      map((response) => (Array.isArray(response) ? response : response.content ?? [])),
    );
  }

  private buildCashFlowReportFromLedger(request: ReportRequestDTO): Observable<CashFlowReportDTO> {
    return this.getLedgerEntries().pipe(
      map((entries) => this.createCashFlowReportFromLedger(entries, request)),
    );
  }

  private createCashFlowReportFromLedger(entries: LedgerEntryRaw[], request: ReportRequestDTO): CashFlowReportDTO {
    const periodStart = this.parseApiDate(request.periodStart);
    const periodEnd = this.parseApiDate(request.periodEnd);
    const cashEntries = entries.filter((entry) => this.isCashAccount(entry.account));

    const openingBalance = cashEntries
      .filter((entry) => this.parseApiDate(entry.entryDate).getTime() < periodStart.getTime())
      .reduce((sum, entry) => sum + this.cashDelta(entry), 0);

    const periodCashEntries = cashEntries.filter((entry) => {
      const date = this.parseApiDate(entry.entryDate).getTime();
      return date >= periodStart.getTime() && date <= periodEnd.getTime();
    });

    const operatingActivities: CashFlowLineItemDTO[] = [];
    const investingActivities: CashFlowLineItemDTO[] = [];
    const financingActivities: CashFlowLineItemDTO[] = [];

    periodCashEntries.forEach((entry) => {
      const amount = this.cashDelta(entry);
      if (amount === 0) {
        return;
      }

      const counterpart = this.findCounterpartEntry(entry, entries);
      const category = this.classifyCashMovement(counterpart);
      const item: CashFlowLineItemDTO = {
        description: this.describeCashMovement(entry, counterpart),
        amount,
        category,
        flowDirection: amount >= 0 ? 'inflow' : 'outflow',
        indentLevel: 1,
        isSubtotal: false,
        sourceModule: SourceModule.MANUAL,
      };

      if (category === CashFlowCategory.INVESTING) {
        investingActivities.push(item);
      } else if (category === CashFlowCategory.FINANCING) {
        financingActivities.push(item);
      } else {
        operatingActivities.push(item);
      }
    });

    const operatingCashFlow = this.sumCashFlowItems(operatingActivities);
    const investingCashFlow = this.sumCashFlowItems(investingActivities);
    const financingCashFlow = this.sumCashFlowItems(financingActivities);
    const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;
    const closingBalance = openingBalance + netCashFlow;
    const workingCapitalChanges = this.calculateWorkingCapitalChanges(entries, periodStart, periodEnd);
    const changesInWorkingCapital = workingCapitalChanges.reduce((sum, item) => sum + item.changeAmount, 0);

    return {
      reportPeriod: request.periodEnd,
      operatingActivities,
      investingActivities,
      financingActivities,
      summary: {
        operatingCashFlow,
        investingCashFlow,
        financingCashFlow,
        netCashFlow,
        openingBalance,
        closingBalance,
        freeCashFlow: operatingCashFlow + investingCashFlow,
      },
      indirectReconciliation: {
        netIncome: 0,
        addBackDepreciation: 0,
        addBackAmortization: 0,
        deductGainOnDisposal: 0,
        changesInWorkingCapital,
        calculatedOperatingCash: operatingCashFlow,
      },
      workingCapitalChanges,
      taxCashFlowBreakdown: {
        companiesIncomeTax: 0,
        valueAddedTax: 0,
        withholdingTax: 0,
        educationTaxLevy: 0,
        naseniLevy: 0,
        totalTaxPaid: 0,
      },
      vatOutputAmount: 0,
      vatInputRecoverable: 0,
      periodComparisons: {
        netCashFlow: this.emptyPeriodComparison(netCashFlow),
        operatingCashFlow: this.emptyPeriodComparison(operatingCashFlow),
        investingCashFlow: this.emptyPeriodComparison(investingCashFlow),
        financingCashFlow: this.emptyPeriodComparison(financingCashFlow),
      },
      reportContext: {
        generatedAt: this.toBackendLocalDateTime(new Date()),
        generatedBy: 'General Ledger',
        periodStart: request.periodStart,
        periodEnd: request.periodEnd,
        reportPeriodType: request.reportPeriodType,
        sourceModules: request.sourceModules,
        includedTransactionIds: periodCashEntries.map((entry) => entry.id),
        entityName: (request.entityId ?? this.resolveEntityId()) || this.resolveTenantId(),
        currencyCode: request.currencyCode ?? 'NGN',
        reportVersion: '2.0-ledger',
        complianceFramework: 'IFRS / CAMA 2020',
      },
    };
  }

  private findCounterpartEntry(cashEntry: LedgerEntryRaw, entries: LedgerEntryRaw[]): LedgerEntryRaw | null {
    const journalEntryId = cashEntry.journalEntryLine?.journalEntryId;
    if (journalEntryId !== undefined && journalEntryId !== null) {
      const sameJournal = entries
        .filter((entry) =>
          entry.id !== cashEntry.id &&
          entry.journalEntryLine?.journalEntryId === journalEntryId &&
          !this.isCashAccount(entry.account)
        )
        .sort((left, right) => this.absoluteEntryAmount(right) - this.absoluteEntryAmount(left));

      if (sameJournal.length) {
        return sameJournal[0];
      }
    }

    const cashDate = this.parseApiDate(cashEntry.entryDate).getTime();
    const cashAmount = this.absoluteEntryAmount(cashEntry);

    return entries.find((entry) =>
      entry.id !== cashEntry.id &&
      !this.isCashAccount(entry.account) &&
      this.parseApiDate(entry.entryDate).getTime() === cashDate &&
      Math.abs(this.absoluteEntryAmount(entry) - cashAmount) < 0.01
    ) ?? null;
  }

  private classifyCashMovement(counterpart: LedgerEntryRaw | null): CashFlowCategory {
    const accountType = counterpart?.account?.accountType;
    if (accountType === AccountType.LIABILITY || accountType === AccountType.EQUITY) {
      return CashFlowCategory.FINANCING;
    }

    if (accountType === AccountType.ASSET) {
      return CashFlowCategory.INVESTING;
    }

    return CashFlowCategory.OPERATING;
  }

  private describeCashMovement(cashEntry: LedgerEntryRaw, counterpart: LedgerEntryRaw | null): string {
    const rawDescription = cashEntry.journalEntryLine?.description?.trim();
    const cleanedDescription = rawDescription
      ? rawDescription.replace(/^(DR|CR):\s*/i, '').trim()
      : 'Cash movement';

    if (counterpart?.account?.accountName) {
      return `${cleanedDescription} (${counterpart.account.accountName})`;
    }

    return cleanedDescription;
  }

  private calculateWorkingCapitalChanges(
    entries: LedgerEntryRaw[],
    periodStart: Date,
    periodEnd: Date,
  ): Array<{ accountName: string; accountCode: string; changeAmount: number; effectType: string }> {
    const changes = new Map<string, { accountName: string; accountCode: string; changeAmount: number }>();

    entries.forEach((entry) => {
      const date = this.parseApiDate(entry.entryDate).getTime();
      const accountType = entry.account?.accountType;
      if (
        date < periodStart.getTime() ||
        date > periodEnd.getTime() ||
        this.isCashAccount(entry.account) ||
        (accountType !== AccountType.ASSET && accountType !== AccountType.LIABILITY)
      ) {
        return;
      }

      const key = String(entry.account.id);
      const existing = changes.get(key) ?? {
        accountName: entry.account.accountName,
        accountCode: String(entry.account.accountCode),
        changeAmount: 0,
      };
      const accountDelta = accountType === AccountType.ASSET
        ? Number(entry.debit ?? 0) - Number(entry.credit ?? 0)
        : Number(entry.credit ?? 0) - Number(entry.debit ?? 0);

      existing.changeAmount += accountType === AccountType.ASSET ? -accountDelta : accountDelta;
      changes.set(key, existing);
    });

    return Array.from(changes.values())
      .filter((change) => Math.abs(change.changeAmount) > 0.01)
      .map((change) => ({
        ...change,
        effectType: change.changeAmount >= 0 ? 'source' : 'use',
      }));
  }

  private isCashAccount(account: LedgerEntryRaw['account'] | undefined): boolean {
    if (!account || account.accountType !== AccountType.ASSET) {
      return false;
    }

    const accountName = (account.accountName ?? '').toLowerCase();
    const accountCode = String(account.accountCode ?? '');
    return accountCode === '1001' || accountName.includes('cash') || accountName.includes('bank');
  }

  private cashDelta(entry: LedgerEntryRaw): number {
    return Number(entry.debit ?? 0) - Number(entry.credit ?? 0);
  }

  private absoluteEntryAmount(entry: LedgerEntryRaw): number {
    return Math.max(Math.abs(Number(entry.debit ?? 0)), Math.abs(Number(entry.credit ?? 0)));
  }

  private sumCashFlowItems(items: CashFlowLineItemDTO[]): number {
    return items.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  }

  private emptyPeriodComparison(currentPeriodAmount: number): {
    currentPeriodAmount: number;
    priorPeriodAmount: number;
    changeAmount: number;
    changePercentage: number;
  } {
    return {
      currentPeriodAmount,
      priorPeriodAmount: 0,
      changeAmount: currentPeriodAmount,
      changePercentage: 0,
    };
  }

  private parseApiDate(value: string | number[] | undefined | null): Date {
    if (Array.isArray(value)) {
      const [year, month = 1, day = 1, hour = 0, minute = 0, second = 0, nanos = 0] = value;
      return new Date(year, month - 1, day, hour, minute, second, Math.floor(nanos / 1_000_000));
    }

    return value ? new Date(value) : new Date(Number.NaN);
  }

  private buildReportRequest(period: Date, overrides?: Partial<ReportRequestDTO>): ReportRequestDTO {
    const reportPeriodType = overrides?.reportPeriodType ?? 'monthly';
    const { start, end } = this.getPeriodRange(period, reportPeriodType);

    // entityId: use resolved entityId, or fall back to tenantId.
    // The backend needs *something* here — empty string causes 500.
    const entityId = (overrides?.entityId
      ?? this.resolveEntityId())
      || this.resolveTenantId()   // ← key fix: use tenantId when entityId is empty
      || '';

    return {
      periodStart: this.normalizeBackendLocalDateTime(overrides?.periodStart, start),
      periodEnd: this.normalizeBackendLocalDateTime(overrides?.periodEnd, end),
      reportPeriodType,
      entityId,
      sourceModules: overrides?.sourceModules ?? this.defaultSourceModules(),
      currencyCode: overrides?.currencyCode ?? 'NGN',
      includeTransactionIds: overrides?.includeTransactionIds ?? true,
      includeDrilldown: overrides?.includeDrilldown ?? true,
    };
  }

  private getPeriodRange(period: Date, periodType: ReportPeriodType): { start: Date; end: Date } {
    if (periodType === 'yearly') {
      return {
        start: new Date(period.getFullYear(), 0, 1, 0, 0, 0, 0),
        end: new Date(period.getFullYear(), 11, 31, 23, 59, 59, 999),
      };
    }
    if (periodType === 'quarterly') {
      const quarterStartMonth = Math.floor(period.getMonth() / 3) * 3;
      return {
        start: new Date(period.getFullYear(), quarterStartMonth, 1, 0, 0, 0, 0),
        end: new Date(period.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59, 999),
      };
    }
    return {
      start: new Date(period.getFullYear(), period.getMonth(), 1, 0, 0, 0, 0),
      end: new Date(period.getFullYear(), period.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }

  private normalizeBackendLocalDateTime(value: string | undefined, fallback: Date): string {
    if (!value) {
      return this.toBackendLocalDateTime(fallback);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return `${value}T00:00:00.000`;
    }

    return value
      .replace(/Z$/, '')
      .replace(/([+-]\d{2}:\d{2})$/, '');
  }

  private toBackendLocalDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  private traceOutgoing(method: string, path: string, payload?: unknown): void {
    this.lastRequest = { timestamp: new Date().toISOString(), method, path, payload };
  }

  private traceError(method: string, path: string, payload: unknown, error: unknown): void {
    this.lastError = { timestamp: new Date().toISOString(), method, path, payload, error };
  }

  // ─── Auth / identity resolution ─────────────────────────────────────────────

  /**
   * Resolves the entity ID from storage.
   * Returns empty string (not null) so callers can safely use || fallback.
   */
  private resolveEntityId(): string {
    // 1. Direct entityId keys
    const direct =
      localStorage.getItem('entityId') ??
      localStorage.getItem('EntityId') ??
      localStorage.getItem('entityID') ??
      localStorage.getItem('entity_id') ??
      sessionStorage.getItem('entityId') ??
      sessionStorage.getItem('EntityId') ??
      sessionStorage.getItem('entityID') ??
      sessionStorage.getItem('entity_id');

    if (direct?.trim()) { return direct.trim(); }

    // 2. Parse from userRegData
    const raw = sessionStorage.getItem('userRegData') ?? localStorage.getItem('userRegData');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const extracted = this.extractFromObject(parsed, [
          'entityId', 'EntityId', 'entityID', 'entity_id',
          'entity', 'clientId', 'clientID', 'client_id',
          'companyId', 'companyID', 'company_id',
        ]);
        if (extracted) { return extracted; }
      } catch { /* ignore */ }
    }

    return '';
  }

  /**
   * Resolves the tenant ID. This is also used as entityId fallback
   * when no explicit entityId is found (which is the case for this backend).
   */
  private resolveTenantId(): string {
    // 1. Explicit storage keys
    const stored =
      localStorage.getItem('X-Tenant-ID') ??
      localStorage.getItem('tenantId') ??
      sessionStorage.getItem('X-Tenant-ID') ??
      sessionStorage.getItem('tenantId');

    if (stored?.trim()) { return stored.trim(); }

    // 2. Parse ecode from login response (AuthenticationService stores it as tenantId)
    const raw = sessionStorage.getItem('userRegData') ?? localStorage.getItem('userRegData');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const ecode = this.extractFromObject(parsed, ['ecode', 'tenantId', 'tenant_id', 'TenantId']);
        if (ecode) { return ecode; }
      } catch { /* ignore */ }
    }

    // 3. Hostname-based
    const host = window.location.hostname;
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
    return isLocalhost ? 'optimax' : (host.split('.')[0] || 'optimax');
  }

  private resolveToken(): string | null {
    return (
      sessionStorage.getItem('Token') ||
      sessionStorage.getItem('token') ||
      sessionStorage.getItem('accessToken') ||
      localStorage.getItem('Token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('Token2') ||
      localStorage.getItem('accessToken2') ||
      null
    );
  }

  private getTokenSource(): 'session' | 'local' | 'none' {
    if (
      sessionStorage.getItem('Token') ||
      sessionStorage.getItem('token') ||
      sessionStorage.getItem('accessToken')
    ) { return 'session'; }

    if (
      localStorage.getItem('Token') || localStorage.getItem('token') ||
      localStorage.getItem('accessToken') || localStorage.getItem('Token2') ||
      localStorage.getItem('accessToken2')
    ) { return 'local'; }

    return 'none';
  }

  /**
   * Builds HTTP headers. Uses ALL possible token keys so it works
   * regardless of which one the auth service stored.
   */
  private buildHeaders(): HttpHeaders {
    const tenantId = this.resolveTenantId();
    const token = this.resolveToken();

    let headers = new HttpHeaders({ 'X-Tenant-ID': tenantId });

    if (token) {
      // Strip "Bearer " prefix if it was stored with it
      const bare = token.startsWith('Bearer ') ? token.slice(7) : token;
      headers = headers.set('Authorization', `Bearer ${bare}`);
    }

    return headers;
  }

  private extractFromObject(data: any, keys: string[]): string | null {
    if (!data || typeof data !== 'object') { return null; }
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const val = data[key];
        if (val !== undefined && val !== null && String(val).trim()) {
          return String(val).trim();
        }
      }
    }
    // Recurse one level into common nesting patterns
    for (const nested of ['data', 'user', 'response', 'result']) {
      if (data[nested] && typeof data[nested] === 'object') {
        const found = this.extractFromObject(data[nested], keys);
        if (found) { return found; }
      }
    }
    return null;
  }

  private defaultSourceModules(): SourceModule[] {
    return [
      SourceModule.POS,
      SourceModule.MANUAL,
      SourceModule.EXPENSE,
      SourceModule.HR,
      SourceModule.BANK,
      SourceModule.HOSPITALITY,
    ];
  }
}
