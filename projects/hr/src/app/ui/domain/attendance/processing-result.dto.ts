/**
 * ⚠️ NEW FILE (2026-07-14) - Processing and error response DTOs
 * Used for event processing results and standardized error handling
 */

export type FraudFlagCode = 'SUSPICIOUS_LOCATION' | 'VPN_DETECTED' | 'RAPID_LOCATION_CHANGE' | 'NEW_DEVICE' | 'DEVICE_CLONING' | 'LOCATION_SPOOFING';

export interface ProcessingResultDTO {
  // Event reference
  eventId: number; // Processed event ID
  recordId?: number; // Associated record ID (if created)

  // Processing status
  status: 'PROCESSED' | 'DUPLICATE' | 'FRAUD_FLAGGED' | 'ERROR'; // Processing result
  message: string; // Result message

  // Fraud detection (optional)
  fraudFlags?: FraudFlagCode[]; // Any fraud flags detected
}

export interface ErrorResponseDTO {
  // Error identification
  code: string; // Error code (e.g., 'ERR_INVALID_EVENT', 'ERR_DUPLICATE_CHECK_IN')
  message: string; // Human-readable error message

  // Timestamp & location
  timestamp: string; // ISO timestamp - Error occurrence timestamp
  path: string; // API endpoint path (e.g., '/attendance-events/check-in')

  // Additional details
  details?: any; // Additional error context or validation details
}

export interface ApiResponseWrapper<T> {
  // Standard API response wrapper
  success: boolean; // Whether request was successful
  data?: T; // Response data (if successful)
  error?: ErrorResponseDTO; // Error details (if failed)
  timestamp: string; // ISO timestamp - Response timestamp
}

export interface ListResponseDTO<T> {
  // Paginated list response
  content: T[]; // Array of results
  totalElements: number; // Total count of all elements
  totalPages: number; // Total number of pages
  currentPage: number; // Current page number (0-indexed)
  pageSize: number; // Records per page
  hasNext: boolean; // Whether more pages exist
  hasPrevious: boolean; // Whether previous page exists
}

export interface BulkOperationResult {
  // Result of bulk operations
  successCount: number; // Successfully processed items
  failureCount: number; // Failed items
  errors?: Array<{
    itemId: number; // ID of failed item
    error: string; // Error message for this item
  }>; // Detailed errors (optional)
}
