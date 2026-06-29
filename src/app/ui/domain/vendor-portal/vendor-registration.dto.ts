// ─── Vendor Registration DTOs ────────────────────────────────────────────────

export type VendorType = 'SOLE_PROPRIETOR' | 'PARTNERSHIP' | 'LLC' | 'PLC' | 'NGO' | 'COOPERATIVE' | 'OTHER';
export type BusinessSize = 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
export type OwnershipType = 'PRIVATE' | 'PUBLIC' | 'GOVERNMENT' | 'MIXED' | 'FOREIGN';
export type YearsInOperation = 'LESS_THAN_1' | '1_TO_3' | '3_TO_5' | '5_TO_10' | '10_TO_20' | 'MORE_THAN_20';
export type AnnualTurnover = 'BELOW_1M' | '1M_TO_10M' | '10M_TO_50M' | '50M_TO_100M' | 'ABOVE_100M';
export type DocumentStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'PENDING';
export type PaymentMethod = 'BANK_TRANSFER' | 'CHEQUE' | 'MOBILE_MONEY' | 'ONLINE_PAYMENT';
export type VendorCertificationType =
  | 'ISO_9001'
  | 'ISO_14001'
  | 'ISO_45001'
  | 'NAFDAC'
  | 'SON'
  | 'COREN'
  | 'NIA'
  | 'NBA'
  | 'ICAN'
  | 'OTHER';

// ─── Step 1: Business Information ─────────────────────────────────────────────
export interface BusinessInformationDto {
  // Core Identity
  businessName: string;
  tradingName?: string;
  vendorType: VendorType;
  businessSize: BusinessSize;
  ownershipType: OwnershipType;
  yearsInOperation: YearsInOperation;
  annualTurnover: AnnualTurnover;
  numberOfEmployees: number;

  // Registration Details
  registrationNumber: string;
  taxIdentificationNumber: string;
  vatRegistrationNumber?: string;
  cacNumber?: string; // Corporate Affairs Commission (Nigeria)
  dateOfIncorporation: string; // ISO date string

  // Industry & Categories
  primaryIndustry: string;
  secondaryIndustries: string[];
  supplierCategories: string[];
  productServiceDescription: string;

  // Web Presence
  companyWebsite?: string;
  linkedinProfile?: string;
}

// ─── Step 2: Contact & Location ────────────────────────────────────────────────
export interface ContactLocationDto {
  // Registered Address
  registeredAddress: AddressDto;

  // Operating Address (if different)
  operatingAddressSameAsRegistered: boolean;
  operatingAddress?: AddressDto;

  // Primary Contact
  primaryContact: ContactPersonDto;

  // Secondary Contact
  hasSecondaryContact: boolean;
  secondaryContact?: ContactPersonDto;

  // Business Communication
  businessEmail: string;
  businessPhone: string;
  businessPhoneAlt?: string;
  faxNumber?: string;

  // Social Media (optional)
  twitterHandle?: string;
  facebookPage?: string;
}

export interface AddressDto {
  streetLine1: string;
  streetLine2?: string;
  city: string;
  state: string;
  lga?: string; // Local Government Area
  country: string;
  postalCode?: string;
  landmark?: string;
}

export interface ContactPersonDto {
  firstName: string;
  lastName: string;
  jobTitle: string;
  department?: string;
  email: string;
  phoneNumber: string;
  phoneNumberAlt?: string;
  isAuthorizedSignatory: boolean;
}

// ─── Step 3: Financial & Banking ──────────────────────────────────────────────
export interface FinancialBankingDto {
  // Primary Bank Account
  primaryBankAccount: BankAccountDto;

  // Secondary Bank Account (optional)
  hasSecondaryBankAccount: boolean;
  secondaryBankAccount?: BankAccountDto;

  // Financial Details
  preferredPaymentMethod: PaymentMethod;
  paymentTermsPreference: string; // e.g. "Net 30", "Net 60"
  currencyPreference: string; // e.g. "NGN", "USD"

  // Credit & Financial Standing
  hasBankReference: boolean;
  bankReferenceName?: string;
  bankReferenceContact?: string;

  // Insurance
  hasLiabilityInsurance: boolean;
  liabilityInsuranceProvider?: string;
  liabilityInsurancePolicyNumber?: string;
  liabilityInsuranceExpiryDate?: string;
  liabilityInsuranceCoverageAmount?: number;
}

export interface BankAccountDto {
  bankName: string;
  bankBranch?: string;
  accountName: string;
  accountNumber: string;
  accountType: 'SAVINGS' | 'CURRENT' | 'DOMICILIARY';
  sortCode?: string;
  swiftCode?: string;
  iban?: string;
  currency: string;
}

// ─── Step 4: Compliance & Certifications ──────────────────────────────────────
export interface ComplianceDto {
  // Certifications
  certifications: CertificationDto[];

  // Legal & Compliance
  hasBeenDebarred: boolean;
  debarmentDetails?: string;
  hasPendingLitigation: boolean;
  litigationDetails?: string;
  hasBeenBankrupt: boolean;
  bankruptcyDetails?: string;

  // Health, Safety & Environment
  hasHsePolicy: boolean;
  hsePolicyDocumentRef?: string;
  hasEnvironmentalPolicy: boolean;

  // Quality Management
  hasQualityManagementSystem: boolean;
  qualityManagementSystemDetails?: string;

  // Data Protection
  acceptsDataProtectionPolicy: boolean;
  acceptsAntiCorruptionPolicy: boolean;
  acceptsCodeOfConduct: boolean;
}

export interface CertificationDto {
  certificationType: VendorCertificationType;
  certificationName: string;
  issuingBody: string;
  certificateNumber?: string;
  issueDate: string;
  expiryDate?: string;
  isNeverExpiring: boolean;
}

// ─── Step 5: References & Experience ──────────────────────────────────────────
export interface ReferencesExperienceDto {
  // Client References
  clientReferences: ClientReferenceDto[];

  // Key Projects / Experience
  keyProjects: KeyProjectDto[];

  // Trade Associations
  tradeAssociations: TradeAssociationDto[];

  // Awards & Recognition
  awards?: string;

  // Additional Information
  additionalInformation?: string;
}

export interface ClientReferenceDto {
  companyName: string;
  contactPersonName: string;
  contactEmail: string;
  contactPhone: string;
  relationshipDescription: string;
  yearsOfRelationship: number;
}

export interface KeyProjectDto {
  projectTitle: string;
  clientName: string;
  projectValue?: number;
  projectCurrency?: string;
  startDate: string;
  endDate?: string;
  isOngoing: boolean;
  description: string;
}

export interface TradeAssociationDto {
  associationName: string;
  membershipNumber?: string;
  memberSince?: string;
}

// ─── Step 6: Documents Upload ─────────────────────────────────────────────────
export interface DocumentsUploadDto {
  // Required Documents
  cacCertificate?: FileUploadDto;
  tinCertificate?: FileUploadDto;
  vatCertificate?: FileUploadDto;
  incorporationCertificate?: FileUploadDto;

  // Financial Documents
  auditedFinancialStatements?: FileUploadDto;
  bankStatement?: FileUploadDto; // Last 6 months

  // Compliance Documents
  taxClearanceCertificate?: FileUploadDto;
  pencomClearance?: FileUploadDto; // Pension clearance (Nigeria)
  itfClearance?: FileUploadDto;    // ITF clearance (Nigeria)
  nsitfClearance?: FileUploadDto;  // NSITF clearance (Nigeria)

  // Identity Documents
  directorId?: FileUploadDto;
  authorizedSignatoryId?: FileUploadDto;

  // Optional Documents
  companyProfile?: FileUploadDto;
  isoCertificate?: FileUploadDto;
  otherDocuments?: FileUploadDto[];
}

export interface FileUploadDto {
  file?: File;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt?: string;
  documentStatus?: DocumentStatus;
  expiryDate?: string;
}

// ─── Master Registration DTO ──────────────────────────────────────────────────
export interface VendorRegistrationDto {
  businessInformation: BusinessInformationDto;
  contactLocation: ContactLocationDto;
  financialBanking: FinancialBankingDto;
  compliance: ComplianceDto;
  referencesExperience: ReferencesExperienceDto;
  documents: DocumentsUploadDto;
  termsAndConditionsAccepted: boolean;
  privacyPolicyAccepted: boolean;
  registrationDate?: string;
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface VendorRegistrationResponse {
  success: boolean;
  vendorId?: string;
  registrationNumber?: string;
  message: string;
  errors?: Record<string, string[]>;
}

// ─── Lookup Data ──────────────────────────────────────────────────────────────
export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT (Abuja)', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

export const AFRICAN_COUNTRIES = [
  'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'Ethiopia',
  'Tanzania', 'Uganda', 'Rwanda', 'Senegal', 'Côte d\'Ivoire', 'Cameroon',
  'Mozambique', 'Zambia', 'Zimbabwe', 'Other'
];

export const ALL_COUNTRIES = [
  ...AFRICAN_COUNTRIES,
  'United Kingdom', 'United States', 'France', 'Germany', 'China',
  'India', 'United Arab Emirates', 'Canada', 'Australia', 'Other'
];

export const SUPPLIER_CATEGORIES = [
  'IT Equipment & Software', 'Office Supplies & Stationery', 'Furniture & Fixtures',
  'Construction & Civil Works', 'Electrical & Electronics', 'Mechanical & Engineering',
  'Medical Supplies & Equipment', 'Pharmaceuticals', 'Food & Beverages',
  'Uniforms & Protective Gear', 'Vehicles & Transportation', 'Fuel & Lubricants',
  'Cleaning & Janitorial Services', 'Security Services', 'Catering Services',
  'Consulting & Professional Services', 'Legal Services', 'Financial Services',
  'Training & Capacity Development', 'Marketing & Advertising', 'Printing & Publishing',
  'Agriculture & Farm Produce', 'Logistics & Warehousing', 'Telecommunications',
  'Renewable Energy', 'Oil & Gas', 'Mining & Minerals', 'Textile & Garments', 'Other'
];

export const INDUSTRY_OPTIONS = [
  'Agriculture', 'Automotive', 'Banking & Finance', 'Construction',
  'Education', 'Energy & Utilities', 'Entertainment & Media', 'Food & Beverage',
  'Government & Public Sector', 'Healthcare', 'Hospitality & Tourism',
  'Information Technology', 'Insurance', 'Legal', 'Logistics & Supply Chain',
  'Manufacturing', 'Mining & Resources', 'Oil & Gas', 'Pharmaceutical',
  'Real Estate', 'Retail & Distribution', 'Telecommunications', 'Other'
];

export const BANKS_NIGERIA = [
  'Access Bank', 'Citibank Nigeria', 'Ecobank Nigeria', 'Fidelity Bank',
  'First Bank of Nigeria', 'First City Monument Bank (FCMB)', 'Globus Bank',
  'Guaranty Trust Bank (GTBank)', 'Heritage Bank', 'Jaiz Bank',
  'Keystone Bank', 'Polaris Bank', 'Providus Bank', 'Stanbic IBTC Bank',
  'Standard Chartered Bank', 'Sterling Bank', 'SunTrust Bank', 'Titan Trust Bank',
  'Union Bank', 'United Bank for Africa (UBA)', 'Unity Bank', 'Wema Bank',
  'Zenith Bank', 'Other'
];