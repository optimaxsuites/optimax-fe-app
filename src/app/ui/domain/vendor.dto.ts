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

// export interface VendorRegistrationRequestDto {
//   // comes from the unique account vendor registration link
//   registrationToken: string;

//   legalName: string;
//   tradingName?: string;

//   email: string;
//   phone?: string;

//   address?: string;
//   country?: string;
//   state?: string;

//   categoryIds: string[];

//   primaryContact: VendorContactDto;
// }
export interface VendorRegistrationRequestDto {
  registrationToken: string;

  // Company
  legalName: string;
  tradingName?: string;
  businessType: 'Limited' | 'SoleProprietor' | 'Partnership' | 'NGO' | 'Other';

  email: string;
  phone?: string;

  address: string;
  country: string;
  state: string;

  website?: string;
  yearEstablished?: number;
  employeeCount?: number;

  // Categorization
  categoryIds: string[];
  capabilityStatement: string;

  // Primary Contact
  primaryContact: {
    name: string;
    email: string;
    phone?: string;
    role?: string;
  };

  // Payment (optional)
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  currency?: string;

  // Confirmation
  acceptsTerms: boolean;
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
