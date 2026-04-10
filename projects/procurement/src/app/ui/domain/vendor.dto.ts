export interface VendorDto {
  id: number;
  token: string;
  companyProfile: CompanyProfileDto;
  contacts: VendorContactDto[];
  category: VendorCategoryDto[];
  capabilityStatement: string;
  bankDetails: VendorBankDetailsDto[];
  status: VendorStatus;
  aiStatus?: VendorAIStatus;
  submittedOn?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  lastUpdatedAt?: string;
  documentsRequired: DocumentType[];
  documentsSubmitted: string[];
  documents: VendorUploadedDocumentDto[];
  invitedOn: string;
  acceptsTerms: boolean;

  password: string;
}

export interface VendorDocumentTypeDto {
  id: number;
  name: string;
  description?: string;
  isRequired: boolean;
}

export interface VendorUploadedDocumentDto {
  id: number;
  documentType: DocumentType;
  fileName: string;
  fileDataUrl: string;
  uploadedAt: string;
}

export interface VendorBankDetailsDto {
  id: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  currency: string;
}

export interface VendorCategoryDto {
  id: number;
  name: string;
  des: string;
}

export interface VendorContactDto {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: string;
}

export interface CompanyProfileDto {
  id: number;
  legalName: string;
  tradingName?: string;
  businessType: string;
  companyEmail: string;
  companyPhone: string;
  address: string;
  city?: string;
  state: string;
  country: string;
  postalCode?: string;
  website?: string;
  yearEstablished?: number;
  employeeCount?: number;

  createdAt: string;
  createdBy: string;
}

export enum VendorStatus {
  Invited = 'Invited',
  Draft = 'Draft',
  UnderReview = 'UnderReview',
  Approved = 'Approved',
  Rejected = 'Rejected',
  PendingRegistration = 'PendingRegistration',
  PendingApproval = 'PendingApproval',
  RegistrationInProgress = 'RegistrationInProgress',

  Suspended = 'Suspended',
}

export enum VendorAIStatus {
  Pending = 'Pending',
  AIApproved = 'AIApproved',
  AIRejected = 'AIRejected',
  NeedsAttention = 'NeedsAttention',
}

export enum DocumentType {
  CAC = 'CAC',
  TIN = 'TIN',
  VAT = 'VAT',
  BankLetter = 'BankLetter',
  SupportingDocument = 'SupportingDocument',
}

// export enum VendorStatus {
//   Pending = 'Pending',
//   Approved = 'Approved',
//   Rejected = 'Rejected',
//   Inactive = 'Inactive',
//   UnderReview = 'UnderReview',
//   PendingRegistration = 'PendingRegistration',
//   PendingApproval = 'PendingApproval',
//   RegistrationInProgress = 'RegistrationInProgress',
//   AiFlagged = 'AiFlagged',
//   Draft = "Draft"
// }

// export interface VendorContactDto {
//   name: string;
//   email: string;
//   phone?: string;
//   role?: string;
// }

// export interface VendorDto {
//   reason: any;
//   rejectedBy: string;
//   rejectedAt: string;
//   audit: any;
//   aiStatus: string;
//   approvedAt: string | number | Date;
//   approvedBy: string;
//   // ================================
//   // System / Identity
//   // ================================
//   id?: string;                 // exists after creation
//   tenantId?: string;           // system assigned
//   vendorCode?: string;         // system generated
//   registrationToken: string;  // only during registration

//   // ================================
//   // Company
//   // ================================
//   legalName: string;
//   tradingName?: string;

//   businessType?: 'Limited' | 'SoleProprietor' | 'Partnership' | 'NGO' | 'Other';

//   email: string;
//   phone?: string;

//   address?: string;
//   country?: string;
//   state?: string;

//   website?: string;
//   yearEstablished?: number;
//   employeeCount?: number;

//   // ================================
//   // Categorization
//   // ================================
//   categoryIds: string[];
//   capabilityStatement?: string;

//   // ================================
//   // Status
//   // ================================
//   status: VendorStatus;

//   // ================================
//   // Contact
//   // ================================
//   primaryContact:

//   // ================================
//   // Payment
//   // ================================
//   bankName?: string;
//   accountName?: string;
//   accountNumber?: string;
//   currency?: string;

//   // ================================
//   // Confirmation
//   // ================================
//   acceptsTerms?: boolean;

//   // ================================
//   // Audit
//   // ================================
//   createdAt?: string;
//   updatedAt?: string;
// }

// export

// export interface VendorListQuery {
//   q?: string;
//   status?: VendorStatus | 'All';
//   categoryId?: string;
//   page?: number;
//   pageSize?: number;
// }

// export interface PagedResult<T> {
//   items: T[];
//   page: number;
//   pageSize: number;
//   total: number;
// }

// // export interface VendorRegistrationRequestDto {
// //   registrationToken: string;

// //   // Company
// //   legalName: string;
// //   tradingName?: string;
// //   businessType: 'Limited' | 'SoleProprietor' | 'Partnership' | 'NGO' | 'Other';

// //   email: string;
// //   phone?: string;

// //   address: string;
// //   country: string;
// //   state: string;

// //   status: VendorStatus;

// //   website?: string;
// //   yearEstablished?: number;
// //   employeeCount?: number;

// //   // Categorization
// //   categoryIds: string[];
// //   capabilityStatement: string;

// //   // Primary Contact
// //   primaryContact: {
// //     name: string;
// //     email: string;
// //     phone?: string;
// //     role?: string;
// //   };

// //   // Payment (optional)
// //   bankName?: string;
// //   accountName?: string;
// //   accountNumber?: string;
// //   currency?: string;

// //   // Confirmation
// //   acceptsTerms: boolean;
// // }

// export interface VendorRegistrationResponseDto {
//   vendorId: string;
//   status: VendorStatus; // should be Pending
//   message: string;
// }

// export interface VendorApprovalActionDto {
//   vendorId: string;
//   action: 'Approve' | 'Reject' | 'RequestChanges';
//   reason?: string;
// }
