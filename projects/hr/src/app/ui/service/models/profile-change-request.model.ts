/**
 * Profile Change Request Models
 * Used for managing employee profile change requests (bank, contact info, etc.)
 */

export interface RequestDTO {
  id?: number;
  fieldName: string;        // 'bankName', 'accountNumber', etc.
  value: string;            // New value
  oldValue: string;         // Current value
}

export interface ProfileChangeRequestDTO {
  id?: number;
  employeeId: number;
  requestType: 'delete' | 'change' | 'update' | 'new';
  fieldChangeType: 'bank' | 'emergency_contact' | 'address' | 'phone' | 'email' | 'NOK' | 'guarantor';
  request: RequestDTO[];
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: Date;
  processedDate?: Date;
  processedBy?: any;       // UserDTO
  rejectionReason?: string;
}

export interface ProfileChangeRequestResponse {
  success: boolean;
  data?: ProfileChangeRequestDTO;
  message?: string;
  error?: string;
}

export interface ProfileChangeRequestListResponse {
  success: boolean;
  data?: ProfileChangeRequestDTO[];
  message?: string;
  error?: string;
}
