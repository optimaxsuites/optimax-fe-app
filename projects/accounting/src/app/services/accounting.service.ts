import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../ui/sharedComponent/service/environments/environment';
import { 
  AccountDTO, 
  AccountMappingDTO, 
  AccountingEventDTO, 
  AccountingTransactionDTO, 
  JournalEntryDTO, 
  JournalEntryStatus,
  TransactionReviewStatus,
  UserDTO,
  PaginationResult 
} from '../ui/domain/accounting.dto';

@Injectable({
  providedIn: 'root'
})
export class AccountingService {
  private readonly baseUrl = `${environment.apiBaseUrl}/x/api/v2/accounting`;
  private readonly tenantId = 'optimax';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'X-Tenant-ID': this.tenantId
    });
  }

  // ── Charts of Accounts ────────────────────────────────
  getAccounts(page: number = 0, size: number = 10): Observable<PaginationResult<AccountDTO>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<PaginationResult<AccountDTO>>(`${this.baseUrl}/accounts`, { headers: this.getHeaders(), params });
  }

  getAccountById(id: number): Observable<AccountDTO> {
    return this.http.get<AccountDTO>(`${this.baseUrl}/accounts/${id}`, { headers: this.getHeaders() });
  }

  createAccount(account: Partial<AccountDTO>): Observable<AccountDTO> {
    return this.http.post<AccountDTO>(`${this.baseUrl}/accounts`, account, { headers: this.getHeaders() });
  }

  updateAccount(id: number, account: Partial<AccountDTO>): Observable<AccountDTO> {
    return this.http.put<AccountDTO>(`${this.baseUrl}/accounts/${id}`, account, { headers: this.getHeaders() });
  }

  deleteAccount(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/accounts/${id}`, { headers: this.getHeaders() });
  }

  // ── Account Mappings ─────────────────────────────────
  getAccountMappings(page: number = 0, size: number = 10): Observable<PaginationResult<AccountMappingDTO>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<PaginationResult<AccountMappingDTO>>(`${this.baseUrl}/account-mappings`, { headers: this.getHeaders(), params });
  }

  getMappingById(id: number): Observable<AccountMappingDTO> {
    return this.http.get<AccountMappingDTO>(`${this.baseUrl}/account-mappings/${id}`, { headers: this.getHeaders() });
  }

  createAccountMapping(mapping: Partial<AccountMappingDTO>): Observable<AccountMappingDTO> {
    return this.http.post<AccountMappingDTO>(`${this.baseUrl}/account-mappings`, mapping, { headers: this.getHeaders() });
  }

  updateAccountMapping(id: number, mapping: Partial<AccountMappingDTO>): Observable<AccountMappingDTO> {
    return this.http.put<AccountMappingDTO>(`${this.baseUrl}/account-mappings/${id}`, mapping, { headers: this.getHeaders() });
  }

  deleteAccountMapping(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/account-mappings/${id}`, { headers: this.getHeaders() });
  }

  // ── Accounting Events ────────────────────────────────
  getEvents(page: number = 0, size: number = 10): Observable<PaginationResult<AccountingEventDTO>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<PaginationResult<AccountingEventDTO>>(`${this.baseUrl}/events`, { headers: this.getHeaders(), params });
  }

  getEventsBySource(source: string, page: number = 0, size: number = 10): Observable<PaginationResult<AccountingEventDTO>> {
    const params = new HttpParams().set('sourceModule', source).set('page', page.toString()).set('size', size.toString());
    return this.http.get<PaginationResult<AccountingEventDTO>>(`${this.baseUrl}/events/bySourceModule`, { headers: this.getHeaders(), params });
  }

  createEvent(event: Partial<AccountingEventDTO>): Observable<AccountingEventDTO> {
    return this.http.post<AccountingEventDTO>(`${this.baseUrl}/events`, event, { headers: this.getHeaders() });
  }

  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/events/${id}`, { headers: this.getHeaders() });
  }

  // ── Transactions ─────────────────────────────────────
  getTransactions(page: number = 0, size: number = 10): Observable<PaginationResult<AccountingTransactionDTO>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<PaginationResult<AccountingTransactionDTO>>(`${this.baseUrl}/transactions`, { headers: this.getHeaders(), params });
  }

  createTransaction(tx: Partial<AccountingTransactionDTO>): Observable<AccountingTransactionDTO> {
    return this.http.post<AccountingTransactionDTO>(`${this.baseUrl}/transactions`, tx, { headers: this.getHeaders() });
  }

  approveTransaction(transactionId: number): Observable<AccountingTransactionDTO> {
    return this.http.post<AccountingTransactionDTO>(`${this.baseUrl}/transactions/${transactionId}/approve`, {}, { headers: this.getHeaders() });
  }

  // ── Journal Entries ──────────────────────────────────
  getJournalEntries(page: number = 0, size: number = 10): Observable<PaginationResult<JournalEntryDTO>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<PaginationResult<JournalEntryDTO>>(`${this.baseUrl}/journal-entries`, { headers: this.getHeaders(), params });
  }

  createJournalEntry(entry: Partial<JournalEntryDTO>): Observable<JournalEntryDTO> {
    return this.http.post<JournalEntryDTO>(`${this.baseUrl}/journal-entries`, entry, { headers: this.getHeaders() });
  }

  // ── Journal Entry Lines ───────────────────────────────
  getJournalLines(page: number = 0, size: number = 10, journalId?: number): Observable<PaginationResult<any>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (journalId) params = params.set('journalEntryId', journalId.toString());
    return this.http.get<PaginationResult<any>>(`${this.baseUrl}/journal-entry-lines`, { headers: this.getHeaders(), params });
  }

  createJournalLine(line: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/journal-entry-lines`, line, { headers: this.getHeaders() });
  }

  // ── Ledger Entries ───────────────────────────────────
  getLedgerEntries(page: number = 0, size: number = 10, accountId?: number): Observable<PaginationResult<any>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (accountId) params = params.set('accountId', accountId.toString());
    return this.http.get<PaginationResult<any>>(`${this.baseUrl}/ledger-entries`, { headers: this.getHeaders(), params });
  }

  createLedgerEntry(entry: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/ledger-entries`, entry, { headers: this.getHeaders() });
  }

  // ── MASTER FLOW ORCHESTRATOR 🧠 ──
  // This implements the "Manual Orchestration" requested by the user
  orchestrateEventExecution(event: AccountingEventDTO, mapping: AccountMappingDTO, createdBy: UserDTO): Observable<any> {
    const transactionDate = new Date().toISOString();
    
    // 1. Start by creating the transaction
    return new Observable(observer => {
      this.createTransaction({
        transactionReference: event.reference,
        sourceModule: event.sourceModule,
        amount: event.amount,
        currency: event.currency,
        status: TransactionReviewStatus.APPROVED,
        accountId: mapping.debitAccountId || mapping.debitAccount.id, // Target the primary account
        description: event.description,
        transactionDate: transactionDate,
        createdBy: createdBy
      }).subscribe({
        next: (tx) => {
          // 2. Create Journal Entry
          this.createJournalEntry({
            transactionId: tx.id,
            entryDate: transactionDate,
            description: `Journal for ${tx.transactionReference}`,
            status: JournalEntryStatus.POSTED,
            // createdBy: createdBy // If JournalEntryDTO supports it
          }).subscribe({
            next: (journal) => {
              // 3. Create Journal Lines (Debit & Credit)
              const debitLine = {
                journalEntryId: journal.id,
                accountId: mapping.debitAccountId || mapping.debitAccount.id,
                debitAmount: event.amount,
                creditAmount: 0,
                description: `Debit: ${event.description}`,
                createdBy: createdBy
              };
              const creditLine = {
                journalEntryId: journal.id,
                accountId: mapping.creditAccountId || mapping.creditAccount.id,
                debitAmount: 0,
                creditAmount: event.amount,
                description: `Credit: ${event.description}`,
                createdBy: createdBy
              };

              this.createJournalLine(debitLine).subscribe();
              this.createJournalLine(creditLine).subscribe();

              // 4. Post to Ledger (Simplified for orchestration demo)
              this.createLedgerEntry({
                accountId: debitLine.accountId,
                debit: event.amount,
                credit: 0,
                balanceAfter: 0, // Should be calculated by server ideally
                entryDate: transactionDate
              }).subscribe();

              this.createLedgerEntry({
                accountId: creditLine.accountId,
                debit: 0,
                credit: event.amount,
                balanceAfter: 0,
                entryDate: transactionDate
              }).subscribe();

              observer.next({ success: true, transaction: tx, journal: journal });
              observer.complete();
            },
            error: err => observer.error(err)
          });
        },
        error: err => observer.error(err)
      });
    });
  }
}
