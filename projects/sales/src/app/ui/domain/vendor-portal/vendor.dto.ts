interface VendorProfile {
  id: string;
  businessName: string;
  registrationNumber: string;
  capabilities: string[];  // categories they can supply
  deliveryRegions: string[];
  averageResponseTime: number;  // hours
  rating: number;  // 1-5
  totalQuotationsSubmitted: number;
  quotationAcceptanceRate: number;  // %
  onTimeDeliveryRate: number;  // %
  certifications: Certification[];
}

interface Certification {
  id: string;
  name: string;
  fileUrl: string;
  expiryDate?: Date;
}