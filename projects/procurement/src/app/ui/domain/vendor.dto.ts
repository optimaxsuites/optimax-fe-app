export enum VendorStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Inactive = 'Inactive',
  UnderReview = 'UnderReview',
  PendingRegistration = 'PendingRegistration',
  PendingApproval = 'PendingApproval',
  RegistrationInProgress = 'RegistrationInProgress',
  AiFlagged = 'AiFlagged'
}

export interface VendorContactDto {
  name: string;
  email: string;
  phone?: string;
  role?: string;
}

export interface VendorDto {
  aiStatus: string;
  approvedAt: string | number | Date;
  approvedBy: string;
  // ================================
  // System / Identity
  // ================================
  id?: string;                 // exists after creation
  tenantId?: string;           // system assigned
  vendorCode?: string;         // system generated
  registrationToken: string;  // only during registration

  // ================================
  // Company
  // ================================
  legalName: string;
  tradingName?: string;

  businessType?: 'Limited' | 'SoleProprietor' | 'Partnership' | 'NGO' | 'Other';

  email: string;
  phone?: string;

  address?: string;
  country?: string;
  state?: string;

  website?: string;
  yearEstablished?: number;
  employeeCount?: number;

  // ================================
  // Categorization
  // ================================
  categoryIds: string[];
  capabilityStatement?: string;

  // ================================
  // Status
  // ================================
  status: VendorStatus;

  // ================================
  // Contact
  // ================================
  primaryContact: {
    name: string;
    email: string;
    phone: string;
    role: string;
  };

  // ================================
  // Payment
  // ================================
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  currency?: string;

  // ================================
  // Confirmation
  // ================================
  acceptsTerms?: boolean;

  // ================================
  // Audit
  // ================================
  createdAt?: string;
  updatedAt?: string;
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


// export interface VendorRegistrationRequestDto {
//   registrationToken: string;

//   // Company
//   legalName: string;
//   tradingName?: string;
//   businessType: 'Limited' | 'SoleProprietor' | 'Partnership' | 'NGO' | 'Other';

//   email: string;
//   phone?: string;

//   address: string;
//   country: string;
//   state: string;

//   status: VendorStatus;

//   website?: string;
//   yearEstablished?: number;
//   employeeCount?: number;

//   // Categorization
//   categoryIds: string[];
//   capabilityStatement: string;

//   // Primary Contact
//   primaryContact: {
//     name: string;
//     email: string;
//     phone?: string;
//     role?: string;
//   };

//   // Payment (optional)
//   bankName?: string;
//   accountName?: string;
//   accountNumber?: string;
//   currency?: string;

//   // Confirmation
//   acceptsTerms: boolean;
// }


export interface VendorRegistrationResponseDto {
  vendorId: string;
  status: VendorStatus; // should be Pending
  message: string;
}

export interface VendorApprovalActionDto {
  vendorId: string;
  action: 'Approve' | 'Reject' | 'RequestChanges';
  reason?: string;
}
