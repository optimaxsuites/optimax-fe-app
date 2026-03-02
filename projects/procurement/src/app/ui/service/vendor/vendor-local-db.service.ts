import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import {
  PagedResult,
  VendorApprovalActionDto,
  VendorDto,
  VendorListQuery,
  VendorRegistrationResponseDto,
  VendorStatus,
} from '../../domain/vendor.dto';
import {
  ComplianceDocumentStatus,
  UploadComplianceDocumentRequestDto,
  VendorComplianceDocumentDto,
} from '../../domain/vendor.compliance.dto';
import { VendorCategoryDto } from '../../domain/vendor.category.dto';
import { Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';

// If you don’t have uuid installed: npm i uuid
// and ensure TS types: npm i -D @types/uuid

type TenantContext = { tenantId: string; tenantName: string };

@Injectable({ providedIn: 'root' })
export class VendorLocalDbService {
  private readonly KEY = 'ERP_VENDOR_DB_V1';
  private readonly REG_KEY = 'ERP_VENDOR_REG_LINKS_V1';
  private readonly NETWORK_DELAY = 200;

  // ------------------------------
  // Tenant / Registration Link
  // ------------------------------
  getRegistrationContext(token: string): Observable<TenantContext> {
    const map = this.readRegLinks();
    const ctx = map[token];
    if (!ctx) return throwError(() => new Error('Invalid registration link'));
    return of(ctx).pipe(delay(this.NETWORK_DELAY));
  }

  // Create a link for a tenant (you can call this from some admin UI later)
  // For now it will auto-seed on first run.
  ensureTenantLink(tenantId: string, tenantName: string): string {
    const links = this.readRegLinks();
    const existing = Object.entries(links).find(
      ([, v]) => v.tenantId === tenantId,
    );
    if (existing) return existing[0];

    const token =
      `TEN-${tenantId}-${Math.random().toString(36).slice(2, 10)}`.toUpperCase();
    links[token] = { tenantId, tenantName };
    this.writeRegLinks(links);
    return token;
  }

  // ------------------------------
  // Categories
  // ------------------------------
  getCategories(): Observable<VendorCategoryDto[]> {
    return of(this.seedCategories()).pipe(delay(this.NETWORK_DELAY));
  }

  // ------------------------------
  // Vendors
  // ------------------------------
  listVendors(
    tenantId: string,
    query: VendorListQuery,
  ): Observable<PagedResult<VendorDto>> {
    this.seedIfEmpty();

    const db = this.readDb();
    const all = (db.vendors[tenantId] ?? []).slice();

    const q = (query.q ?? '').trim().toLowerCase();
    const status = query.status ?? 'All';
    const categoryId = query.categoryId;

    let filtered = all;

    if (q) {
      filtered = filtered.filter(
        (v: any) => 
          (v.legalName ?? '').toLowerCase().includes(q) ||
          (v.tradingName ?? '').toLowerCase().includes(q) ||
          (v.email ?? '').toLowerCase().includes(q) ||
          (v.vendorCode ?? '').toLowerCase().includes(q),
      );
    }

    if (status && status !== 'All') {
      filtered = filtered.filter((v: any) => v.status === status);
    }

    if (categoryId) {
      filtered = filtered.filter((v: any) =>
        (v.categoryIds ?? []).includes(categoryId),
      );
    }

    // sort newest
    filtered.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return of({
      items,
      page,
      pageSize,
      total: filtered.length,
    }).pipe(delay(this.NETWORK_DELAY));
  }

  getVendorById(tenantId: string, id: string): Observable<VendorDto> {
    this.seedIfEmpty();
    const db = this.readDb();
    const v = (db.vendors[tenantId] ?? []).find((x: any) => x.id === id);
    if (!v) return throwError(() => new Error('Vendor not found'));
    return of(v).pipe(delay(this.NETWORK_DELAY));
  }

  getApprovedVendorsForSelection(
    tenantId: string,
    categoryId?: string,
  ): Observable<VendorDto[]> {
    this.seedIfEmpty();
    const db = this.readDb();
    let list = (db.vendors[tenantId] ?? []).filter(
      (v: any) => v.status === VendorStatus.Approved,
    );
    if (categoryId)
      list = list.filter((v: any) => (v.categoryIds ?? []).includes(categoryId));
    // stable ordering
    list.sort((a: any, b: any) =>
      (a.legalName ?? '').localeCompare(b.legalName ?? ''),
    );
    return of(list).pipe(delay(this.NETWORK_DELAY));
  }

  setVendorInactive(tenantId: string, id: string): Observable<void> {
    const db = this.readDb();
    const list = db.vendors[tenantId] ?? [];
    const idx = list.findIndex((v: any) => v.id === id);
    if (idx < 0) return throwError(() => new Error('Vendor not found'));
    list[idx] = {
      ...list[idx],
      status: VendorStatus.Inactive,
      updatedAt: new Date().toISOString(),
    };
    db.vendors[tenantId] = list;
    this.writeDb(db);
    return of(void 0).pipe(delay(this.NETWORK_DELAY));
  }

  // ------------------------------
  // Registration
  // ------------------------------
  // registerVendor(
  //   payload: VendorDto,
  // ): Observable<VendorRegistrationResponseDto> {
  //   this.seedIfEmpty();
  //   const ctxMap = this.readRegLinks();
  //   const ctx = ctxMap[payload.registrationToken];
  //   if (!ctx) return throwError(() => new Error('Invalid registration token'));

  //   const db = this.readDb();
  //   const tenantId = ctx.tenantId;

  //   const now = new Date().toISOString();

  //   const vendor: VendorDto = {
  //     id: uuidv4(),
  //     tenantId,
  //     registrationToken: '',
  //     vendorCode: `VND-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
  //     legalName: payload.legalName,
  //     tradingName: payload.tradingName,
  //     email: payload.email,
  //     phone: payload.phone,
  //     address: payload.address,
  //     country: payload.country,
  //     state: payload.state,
  //     categoryIds: payload.categoryIds ?? [],
  //     status: payload.status,
  //     createdAt: now,
  //     updatedAt: now,
  //     primaryContact: payload.primaryContact,
  //   };

  //   db.vendors[tenantId] = [vendor, ...(db.vendors[tenantId] ?? [])];
  //   this.writeDb(db);

  //   return of({
  //     vendorId: vendor.id,
  //     status: vendor.status,
  //     message: 'Registration submitted successfully. Status: Pending Approval.',
  //   }).pipe(delay(this.NETWORK_DELAY));
  // }

  registerVendor(payload: VendorDto & { registrationToken: string })
  : Observable<VendorRegistrationResponseDto> {

  this.seedIfEmpty();
  const ctxMap = this.readRegLinks();
  const ctx = ctxMap[payload.registrationToken];
  if (!ctx) return throwError(() => new Error('Invalid registration token'));

  const tenantId = ctx.tenantId;
  if (!tenantId) return throwError(() => new Error('Registration context is missing tenantId'));

  const db = this.readDb();
  const now = new Date().toISOString();

  const vendorId = uuidv4();                         // ✅ string
  const status: VendorStatus = VendorStatus.PendingApproval; // ✅ VendorStatus

  const vendor: any = {
    id: vendorId,
    tenantId,
    registrationToken: '',
    vendorCode: `VND-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    legalName: payload.legalName,
    tradingName: payload.tradingName,
    email: payload.email,
    phone: payload.phone,
    address: payload.address,
    country: payload.country,
    state: payload.state,
    categoryIds: payload.categoryIds ?? [],
    primaryContact: payload.primaryContact,
    status,
    createdAt: now,
    updatedAt: now,
  };

  db.vendors[tenantId] = [vendor, ...(db.vendors[tenantId] ?? [])];
  this.writeDb(db);

  // ✅ Now this exactly matches VendorRegistrationResponseDto
  return of({
    vendorId,
    status,
    message: 'Registration submitted successfully. Status: Pending Approval.',
  }).pipe(delay(this.NETWORK_DELAY));
}

  // ------------------------------
  // Approval
  // ------------------------------
  getPendingVendors(tenantId: string): Observable<VendorDto[]> {
    this.seedIfEmpty();
    const db = this.readDb();
    const list = (db.vendors[tenantId] ?? []).filter(
      (v: any) => v.status === VendorStatus.PendingRegistration,
    );
    list.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return of(list).pipe(delay(this.NETWORK_DELAY));
  }

  actOnVendor(
    tenantId: string,
    action: VendorApprovalActionDto,
  ): Observable<void> {
    const db = this.readDb();
    const list = db.vendors[tenantId] ?? [];
    const idx = list.findIndex((v: any) => v.id === action.vendorId);
    if (idx < 0) return throwError(() => new Error('Vendor not found'));

    const now = new Date().toISOString();
    const current = list[idx];

    if (action.action === 'Approve') {
      list[idx] = { ...current, status: VendorStatus.Approved, updatedAt: now };
    } else if (action.action === 'Reject') {
      list[idx] = { ...current, status: VendorStatus.Rejected, updatedAt: now };
    } else {
      // RequestMoreInfo keeps it pending but updates timestamp (and you could store note)
      list[idx] = { ...current, status: VendorStatus.Pending, updatedAt: now };
    }

    db.vendors[tenantId] = list;
    this.writeDb(db);

    return of(void 0).pipe(delay(this.NETWORK_DELAY));
  }

  // ------------------------------
  // Compliance Docs
  // ------------------------------
  getVendorDocuments(
    tenantId: string,
    vendorId: string,
  ): Observable<VendorComplianceDocumentDto[]> {
    this.seedIfEmpty();
    const db = this.readDb();
    const docs = db.documents[tenantId]?.[vendorId] ?? [];
    // newest first
    docs.sort(
      (a: any, b: any) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    );
    return of(docs).pipe(delay(this.NETWORK_DELAY));
  }

  uploadDocument(
    tenantId: string,
    req: UploadComplianceDocumentRequestDto,
  ): Observable<VendorComplianceDocumentDto> {
    this.seedIfEmpty();
    const db = this.readDb();

    const now = new Date().toISOString();
    const doc: VendorComplianceDocumentDto = {
      id: uuidv4(),
      vendorId: req.vendorId,
      documentType: req.documentType,
      status: ComplianceDocumentStatus.Pending,
      fileName: req.file.name,
      fileUrl: undefined, // local-only. later you’ll use real URL
      issuedDate: req.issuedDate,
      expiryDate: req.expiryDate,
      uploadedAt: now,
    };

    db.documents[tenantId] = db.documents[tenantId] ?? {};
    db.documents[tenantId][req.vendorId] = [
      doc,
      ...(db.documents[tenantId][req.vendorId] ?? []),
    ];
    this.writeDb(db);

    return of(doc).pipe(delay(this.NETWORK_DELAY));
  }

  approveDocument(
    tenantId: string,
    documentId: string,
    reviewerNote?: string,
  ): Observable<void> {
    return this.updateDocumentStatus(
      tenantId,
      documentId,
      ComplianceDocumentStatus.Approved,
      reviewerNote,
    );
  }

  rejectDocument(
    tenantId: string,
    documentId: string,
    reviewerNote: string,
  ): Observable<void> {
    return this.updateDocumentStatus(
      tenantId,
      documentId,
      ComplianceDocumentStatus.Rejected,
      reviewerNote,
    );
  }

  // ------------------------------
  // Internal helpers
  // ------------------------------
  private updateDocumentStatus(
    tenantId: string,
    documentId: string,
    status: ComplianceDocumentStatus,
    reviewerNote?: string,
  ): Observable<void> {
    const db = this.readDb();
    const tenantDocs = db.documents[tenantId] ?? {};
    let found = false;

    Object.keys(tenantDocs).forEach((vendorId) => {
      const docs = tenantDocs[vendorId] ?? [];
      const idx = docs.findIndex((d: any) => d.id === documentId);
      if (idx >= 0) {
        docs[idx] = {
          ...docs[idx],
          status,
          reviewerNote,
          reviewedAt: new Date().toISOString(),
        };
        tenantDocs[vendorId] = docs;
        found = true;
      }
    });

    if (!found) return throwError(() => new Error('Document not found'));

    db.documents[tenantId] = tenantDocs;
    this.writeDb(db);
    return of(void 0).pipe(delay(this.NETWORK_DELAY));
  }

  private seedIfEmpty() {
    // Seed registration link + sample tenant + vendors if DB empty
    const db = this.readDb();
    const empty = !db || !db.vendors || Object.keys(db.vendors).length === 0;
    if (!empty) return;

    // create default tenant link
    const tenantId = 'TENANT_DEMO';
    const tenantName = 'Demo Procurement Account';
    const token = this.ensureTenantLink(tenantId, tenantName);

    const now = new Date().toISOString();
    // const vendors: VendorDto[] = [
    //   {
    //     id: uuidv4(),
    //     tenantId,
    //     vendorCode: 'VND-AX21K',
    //     legalName: 'Apex Logistics Ltd',
    //     tradingName: 'Apex',
    //     email: 'hello@apexlogistics.com',
    //     phone: '+234 800 000 0000',
    //     address: '12 Marina, Lagos',
    //     country: 'Nigeria',
    //     state: 'Lagos',
    //     categoryIds: ['logistics'],
    //     status: VendorStatus.Approved,
    //     createdAt: now,
    //     updatedAt: now,
    //     primaryContact: {
    //       name: 'Tolu A.',
    //       email: 'tolu@apexlogistics.com',
    //       phone: '+234 801 111 2222',
    //     },
    //   },
    //   {
    //     id: uuidv4(),
    //     tenantId,
    //     vendorCode: 'VND-KT91P',
    //     legalName: 'Keystone IT Services',
    //     email: 'sales@keystoneit.ng',
    //     categoryIds: ['it'],
    //     status: VendorStatus.Pending,
    //     createdAt: now,
    //     updatedAt: now,
    //     primaryContact: { name: 'Ifeoma K.', email: 'ifeoma@keystoneit.ng' },
    //   },
    // ];

    // this.writeDb({
    //   vendors: { [tenantId]: vendors },
    //   documents: { [tenantId]: {} },
    //   meta: { seededAt: now, demoRegistrationToken: token },
    // });
  }

  private seedCategories(): VendorCategoryDto[] {
    return [
      { id: 'it', name: 'IT' },
      { id: 'logistics', name: 'Logistics' },
      { id: 'facilities', name: 'Facilities' },
      { id: 'insurance', name: 'Insurance' },
      { id: 'stationery', name: 'Stationery' },
    ];
  }

  private readDb(): any {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : { vendors: {}, documents: {}, meta: {} };
    } catch {
      return { vendors: {}, documents: {}, meta: {} };
    }
  }

  private writeDb(db: any) {
    localStorage.setItem(this.KEY, JSON.stringify(db));
  }

  private readRegLinks(): Record<string, TenantContext> {
    try {
      const raw = localStorage.getItem(this.REG_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private writeRegLinks(map: Record<string, TenantContext>) {
    localStorage.setItem(this.REG_KEY, JSON.stringify(map));
  }
}
