/**
 * Profile Change Request Models
 * Used for employee profile field change requests
 * 
 * Architecture supports flexible field types:
 * - bank, emergency_contact, address, phone, email, NOK, guarantor
 * 
 * Uses localStorage initially, easy migration to backend API
 */

export type RequestType = 'change' | 'update' | 'new' | 'delete';
export type FieldChangeType = 'bank' | 'emergency_contact' | 'address' | 'phone' | 'email' | 'NOK' | 'guarantor';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface RequestDTO {
  id?: number;
  profileChangeRequestId?: number;
  fieldName: string;      // e.g., 'bankName', 'accountNumber', 'name', 'phone'
  value: any;             // New value(s)
  oldValue: any;          // Current value(s)
}

export interface ProfileChangeRequestDTO {
  id?: string | number;   // Backend ID or timestamp-based ID for localStorage fallback
  employeeId: string | number;
  employeeName?: string;  // For display in HR table
  employeeEmail?: string; // For local notification flow until backend joins employee data
  requestType: RequestType;
  fieldChangeType: FieldChangeType;
  request: RequestDTO[];
  reason?: string;
  status: RequestStatus;
  submittedDate: Date;
  processedDate?: Date;
  processedBy?: any;
  rejectionReason?: string;
}

/**
 * Bank-specific payload for convenience
 * This will be stored as RequestDTO[] in ProfileChangeRequestDTO
 */
export interface BankChangePayload {
  bankName: string;
  accountNumber: string;
}

/**
 * Emergency Contact specific payload
 */
export interface EmergencyContactPayload {
  name: string;
  phone: string;
  email?: string;
  relationship?: string;
}

/**
 * Address specific payload
 */
export interface AddressPayload {
  address: string;
}

/**
 * Filter options for profile change requests
 */
export interface ProfileChangeRequestFilter {
  status?: RequestStatus;
  fieldChangeType?: FieldChangeType;
  employeeId?: string | number;
  page?: number;
  size?: number;
}
