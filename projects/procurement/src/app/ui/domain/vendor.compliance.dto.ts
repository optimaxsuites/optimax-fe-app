export enum VendorStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Inactive = 'Inactive',
}

export interface VendorContactDto {
  name: string;
  email: string;
  phone?: string;
  role?: string;
}

export interface VendorDto {
  id: string;
  tenantId: string;

  vendorCode?: string;

  legalName: string;
  tradingName?: string;

  email: string;
  phone?: string;

  address?: string;
  country?: string;
  state?: string;

  categoryIds: string[];

  status: VendorStatus;

  createdAt: string;
  updatedAt?: string;

  primaryContact?: VendorContactDto;
}

export interface VendorListQuery {
  q?: string;
  status?: VendorStatus | 'All';
  categoryId?: string;
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface VendorRegistrationRequestDto {
  // comes from the unique account vendor registration link
  registrationToken: string;

  legalName: string;
  tradingName?: string;

  email: string;
  phone?: string;

  address?: string;
  country?: string;
  state?: string;

  categoryIds: string[];

  primaryContact: VendorContactDto;
}

export interface VendorRegistrationResponseDto {
  vendorId: string;
  status: VendorStatus; // should be Pending
  message: string;
}

export interface VendorApprovalActionDto {
  vendorId: string;
  action: 'Approve' | 'Reject' | 'RequestMoreInfo';
  reason?: string;
}


// src/app/ui/domain/vendor-compliance.dto.ts

export enum ComplianceDocumentStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Expired = 'Expired',
}

export interface VendorComplianceDocumentDto {
  id: string;
  vendorId: string;

  documentType: string;              // e.g. CAC, TIN, VAT, NDA, etc.
  status: ComplianceDocumentStatus;

  fileName: string;                  // original file name
  fileUrl?: string;                  // optional (later for backend). For localStorage, can be omitted.

  issuedDate?: string;               // ISO date string: '2026-02-04'
  expiryDate?: string;               // ISO date string: '2027-02-04'

  reviewerNote?: string;             // approval/rejection note

  uploadedAt: string;                // ISO datetime
  reviewedAt?: string;               // ISO datetime
}

export interface UploadComplianceDocumentRequestDto {
  vendorId: string;
  documentType: string;
  issuedDate?: string;
  expiryDate?: string;

  // For frontend/localStorage, this is enough.
  file: File;
}
