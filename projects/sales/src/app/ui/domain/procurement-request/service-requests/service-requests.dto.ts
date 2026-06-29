export interface ServiceRequest {
  id: string;
  customerId: string;
  customerName: string;
  
  // Service specific fields
  serviceType: ServiceType;
  serviceName: string;
  description: string;
  scopeOfWork: string;
  deliverables: string[];
  
  // Duration & Timeline
  estimatedDuration: number;
  durationUnit: DurationUnit;
  startDate?: Date;
  completionDate?: Date;
  
  // Pricing
  rateType: RateType;
  rateAmount: number;
  estimatedTotal: number;
  currency: string;
  
  // Resource requirements
  requiredSkills: string[];
  requiredStaffCount: number;
  locationType: LocationType;
  serviceLocation?: string;
  
  // Additional
  specialInstructions?: string;
  attachments: ServiceAttachment[];
  
  // Vendor & Status
  status: ServiceRequestStatus;
  selectedVendorId?: string;
  selectedVendorName?: string;
  selectedQuotationId?: string;
  
  // Milestones (for milestone-based pricing)
  milestones?: ServiceMilestone[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
}

export type ServiceType = 
  | 'CONSULTING'
  | 'DEVELOPMENT'
  | 'DESIGN'
  | 'MARKETING'
  | 'ACCOUNTING'
  | 'LEGAL'
  | 'IT_SUPPORT'
  | 'CLEANING'
  | 'MAINTENANCE'
  | 'TRAINING'
  | 'LOGISTICS'
  | 'OTHER';

export type DurationUnit = 'HOURS' | 'DAYS' | 'WEEKS' | 'MONTHS';

export type RateType = 
  | 'FIXED_PRICE'
  | 'HOURLY'
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'MILESTONE_BASED';

export type LocationType = 'ONSITE' | 'REMOTE' | 'HYBRID';

export type ServiceRequestStatus = 
  | 'DRAFT'
  | 'PENDING'
  | 'VENDORS_QUOTING'
  | 'VENDOR_SELECTED'
  | 'CONTRACT_SIGNED'
  | 'IN_PROGRESS'
  | 'MILESTONE_1_COMPLETE'
  | 'MILESTONE_2_COMPLETE'
  | 'MILESTONE_3_COMPLETE'
  | 'COMPLETED'
  | 'CANCELLED';

export interface ServiceAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  type: 'SOW' | 'REQUIREMENTS' | 'CONTRACT' | 'OTHER';
  uploadedAt: Date;
}

export interface ServiceMilestone {
  id: string;
  name: string;
  description: string;
  percentageComplete: number;
  dueDate: Date;
  paymentAmount: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  completedAt?: Date;
}

// Helper mapping for display labels
export const ServiceTypeLabels: Record<ServiceType, string> = {
  'CONSULTING': 'Consulting',
  'DEVELOPMENT': 'Development',
  'DESIGN': 'Design',
  'MARKETING': 'Marketing',
  'ACCOUNTING': 'Accounting',
  'LEGAL': 'Legal',
  'IT_SUPPORT': 'IT Support',
  'CLEANING': 'Cleaning',
  'MAINTENANCE': 'Maintenance',
  'TRAINING': 'Training',
  'LOGISTICS': 'Logistics',
  'OTHER': 'Other'
};

export const RateTypeLabels: Record<RateType, string> = {
  'FIXED_PRICE': 'Fixed Price',
  'HOURLY': 'Per Hour',
  'DAILY': 'Per Day',
  'WEEKLY': 'Per Week',
  'MONTHLY': 'Per Month',
  'MILESTONE_BASED': 'Milestone Based'
};

export const DurationUnitLabels: Record<DurationUnit, string> = {
  'HOURS': 'Hours',
  'DAYS': 'Days',
  'WEEKS': 'Weeks',
  'MONTHS': 'Months'
};

export const LocationTypeLabels: Record<LocationType, string> = {
  'ONSITE': 'Onsite (Vendor comes to you)',
  'REMOTE': 'Remote (Work done remotely)',
  'HYBRID': 'Hybrid (Mix of onsite and remote)'
};