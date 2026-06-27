import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../sharedComponent/service/environments/environment.prod';
import {
  Account, Activity, Campaign, Contact, Contract, Deal,
  DealLineItem, Lead, Pipeline, PipelineStage, Quote, Ticket
} from '../domain/crm.model';

@Injectable({ providedIn: 'root' })
export class CrmApiService {

  constructor(private http: HttpClient) {}

  private base = () => `${environment.apiBaseUrl}/x/api/v2/crm`;

  // ── Contacts ────────────────────────────────────────────────
  getContacts(page = 1, size = 50) {
    return this.http.get<Contact[]>(`${this.base()}/contacts?page=${page}&size=${size}`).pipe(catchError(this.err));
  }
  getContactsByType(type: string) {
    return this.http.get<Contact[]>(`${this.base()}/contacts/by-type/${type}`).pipe(catchError(this.err));
  }
  getContact(id: number) {
    return this.http.get<Contact>(`${this.base()}/contacts/${id}`).pipe(catchError(this.err));
  }
  createContact(body: Contact) {
    return this.http.post<Contact>(`${this.base()}/contacts`, body).pipe(catchError(this.err));
  }
  updateContact(id: number, body: Contact) {
    return this.http.put<Contact>(`${this.base()}/contacts/${id}`, body).pipe(catchError(this.err));
  }
  deleteContact(id: number) {
    return this.http.delete<void>(`${this.base()}/contacts/${id}`).pipe(catchError(this.err));
  }

  // ── Accounts ────────────────────────────────────────────────
  getAccounts(page = 1, size = 50) {
    return this.http.get<Account[]>(`${this.base()}/accounts?page=${page}&size=${size}`).pipe(catchError(this.err));
  }
  getAccount(id: number) {
    return this.http.get<Account>(`${this.base()}/accounts/${id}`).pipe(catchError(this.err));
  }
  createAccount(body: Account) {
    return this.http.post<Account>(`${this.base()}/accounts`, body).pipe(catchError(this.err));
  }
  updateAccount(id: number, body: Account) {
    return this.http.put<Account>(`${this.base()}/accounts/${id}`, body).pipe(catchError(this.err));
  }
  deleteAccount(id: number) {
    return this.http.delete<void>(`${this.base()}/accounts/${id}`).pipe(catchError(this.err));
  }

  // ── Pipelines ───────────────────────────────────────────────
  getPipelines() {
    return this.http.get<Pipeline[]>(`${this.base()}/pipelines`).pipe(catchError(this.err));
  }
  getPipeline(id: number) {
    return this.http.get<Pipeline>(`${this.base()}/pipelines/${id}`).pipe(catchError(this.err));
  }
  createPipeline(body: Pipeline) {
    return this.http.post<Pipeline>(`${this.base()}/pipelines`, body).pipe(catchError(this.err));
  }
  updatePipeline(id: number, body: Pipeline) {
    return this.http.put<Pipeline>(`${this.base()}/pipelines/${id}`, body).pipe(catchError(this.err));
  }
  createStage(body: PipelineStage) {
    return this.http.post<PipelineStage>(`${this.base()}/pipelines/stages`, body).pipe(catchError(this.err));
  }
  updateStage(stageId: number, body: PipelineStage) {
    return this.http.put<PipelineStage>(`${this.base()}/pipelines/stages/${stageId}`, body).pipe(catchError(this.err));
  }
  deleteStage(stageId: number) {
    return this.http.delete<void>(`${this.base()}/pipelines/stages/${stageId}`).pipe(catchError(this.err));
  }

  // ── Deals ───────────────────────────────────────────────────
  getDeals(page = 1, size = 100) {
    return this.http.get<Deal[]>(`${this.base()}/deals?page=${page}&size=${size}`).pipe(catchError(this.err));
  }
  getDealsByPipeline(pipelineId: number) {
    return this.http.get<Deal[]>(`${this.base()}/deals/by-pipeline/${pipelineId}`).pipe(catchError(this.err));
  }
  getDeal(id: number) {
    return this.http.get<Deal>(`${this.base()}/deals/${id}`).pipe(catchError(this.err));
  }
  createDeal(body: Deal) {
    return this.http.post<Deal>(`${this.base()}/deals`, body).pipe(catchError(this.err));
  }
  updateDeal(id: number, body: Deal) {
    return this.http.put<Deal>(`${this.base()}/deals/${id}`, body).pipe(catchError(this.err));
  }
  moveDealStage(id: number, stageId: number, stageName: string) {
    return this.http.put<Deal>(`${this.base()}/deals/${id}/move-stage?stageId=${stageId}&stageName=${encodeURIComponent(stageName)}`, {}).pipe(catchError(this.err));
  }
  deleteDeal(id: number) {
    return this.http.delete<void>(`${this.base()}/deals/${id}`).pipe(catchError(this.err));
  }

  // ── Leads ───────────────────────────────────────────────────
  getLeads(page = 1, size = 50) {
    return this.http.get<Lead[]>(`${this.base()}/leads?page=${page}&size=${size}`).pipe(catchError(this.err));
  }
  getLead(id: number) {
    return this.http.get<Lead>(`${this.base()}/leads/${id}`).pipe(catchError(this.err));
  }
  createLead(body: Lead) {
    return this.http.post<Lead>(`${this.base()}/leads`, body).pipe(catchError(this.err));
  }
  updateLead(id: number, body: Lead) {
    return this.http.put<Lead>(`${this.base()}/leads/${id}`, body).pipe(catchError(this.err));
  }
  convertLead(id: number, contactId?: number, dealId?: number) {
    let params = new HttpParams();
    if (contactId) params = params.set('contactId', contactId);
    if (dealId) params = params.set('dealId', dealId);
    return this.http.put<Lead>(`${this.base()}/leads/${id}/convert`, {}, { params }).pipe(catchError(this.err));
  }
  deleteLead(id: number) {
    return this.http.delete<void>(`${this.base()}/leads/${id}`).pipe(catchError(this.err));
  }

  // ── Activities ──────────────────────────────────────────────
  getActivities(page = 1, size = 50) {
    return this.http.get<Activity[]>(`${this.base()}/activities?page=${page}&size=${size}`).pipe(catchError(this.err));
  }
  getActivitiesByContact(contactId: number) {
    return this.http.get<Activity[]>(`${this.base()}/activities/by-contact/${contactId}`).pipe(catchError(this.err));
  }
  getActivitiesByDeal(dealId: number) {
    return this.http.get<Activity[]>(`${this.base()}/activities/by-deal/${dealId}`).pipe(catchError(this.err));
  }
  createActivity(body: Activity) {
    return this.http.post<Activity>(`${this.base()}/activities`, body).pipe(catchError(this.err));
  }
  updateActivity(id: number, body: Activity) {
    return this.http.put<Activity>(`${this.base()}/activities/${id}`, body).pipe(catchError(this.err));
  }
  completeActivity(id: number, outcome?: string) {
    const params = outcome ? `?outcome=${encodeURIComponent(outcome)}` : '';
    return this.http.put<Activity>(`${this.base()}/activities/${id}/complete${params}`, {}).pipe(catchError(this.err));
  }
  deleteActivity(id: number) {
    return this.http.delete<void>(`${this.base()}/activities/${id}`).pipe(catchError(this.err));
  }

  // ── Campaigns ───────────────────────────────────────────────
  getCampaigns(page = 1, size = 50) {
    return this.http.get<Campaign[]>(`${this.base()}/campaigns?page=${page}&size=${size}`).pipe(catchError(this.err));
  }
  createCampaign(body: Campaign) {
    return this.http.post<Campaign>(`${this.base()}/campaigns`, body).pipe(catchError(this.err));
  }
  updateCampaign(id: number, body: Campaign) {
    return this.http.put<Campaign>(`${this.base()}/campaigns/${id}`, body).pipe(catchError(this.err));
  }
  deleteCampaign(id: number) {
    return this.http.delete<void>(`${this.base()}/campaigns/${id}`).pipe(catchError(this.err));
  }

  // ── Quotes ──────────────────────────────────────────────────
  getQuotes(page = 1, size = 50) {
    return this.http.get<Quote[]>(`${this.base()}/quotes?page=${page}&size=${size}`).pipe(catchError(this.err));
  }
  getQuote(id: number) {
    return this.http.get<Quote>(`${this.base()}/quotes/${id}`).pipe(catchError(this.err));
  }
  createQuote(body: Quote) {
    return this.http.post<Quote>(`${this.base()}/quotes`, body).pipe(catchError(this.err));
  }
  updateQuote(id: number, body: Quote) {
    return this.http.put<Quote>(`${this.base()}/quotes/${id}`, body).pipe(catchError(this.err));
  }
  deleteQuote(id: number) {
    return this.http.delete<void>(`${this.base()}/quotes/${id}`).pipe(catchError(this.err));
  }

  // ── Contracts ───────────────────────────────────────────────
  getContracts(page = 1, size = 50) {
    return this.http.get<Contract[]>(`${this.base()}/contracts?page=${page}&size=${size}`).pipe(catchError(this.err));
  }
  createContract(body: Contract) {
    return this.http.post<Contract>(`${this.base()}/contracts`, body).pipe(catchError(this.err));
  }
  updateContract(id: number, body: Contract) {
    return this.http.put<Contract>(`${this.base()}/contracts/${id}`, body).pipe(catchError(this.err));
  }
  deleteContract(id: number) {
    return this.http.delete<void>(`${this.base()}/contracts/${id}`).pipe(catchError(this.err));
  }

  // ── Tickets ─────────────────────────────────────────────────
  getTickets(page = 1, size = 50) {
    return this.http.get<Ticket[]>(`${this.base()}/tickets?page=${page}&size=${size}`).pipe(catchError(this.err));
  }
  createTicket(body: Ticket) {
    return this.http.post<Ticket>(`${this.base()}/tickets`, body).pipe(catchError(this.err));
  }
  updateTicket(id: number, body: Ticket) {
    return this.http.put<Ticket>(`${this.base()}/tickets/${id}`, body).pipe(catchError(this.err));
  }
  resolveTicket(id: number, resolution?: string) {
    const params = resolution ? `?resolution=${encodeURIComponent(resolution)}` : '';
    return this.http.put<Ticket>(`${this.base()}/tickets/${id}/resolve${params}`, {}).pipe(catchError(this.err));
  }
  closeTicket(id: number) {
    return this.http.put<Ticket>(`${this.base()}/tickets/${id}/close`, {}).pipe(catchError(this.err));
  }
  deleteTicket(id: number) {
    return this.http.delete<void>(`${this.base()}/tickets/${id}`).pipe(catchError(this.err));
  }

  private err(e: any) {
    const msg = e?.error?.message || e?.message || 'An error occurred';
    return throwError(() => msg);
  }
}
