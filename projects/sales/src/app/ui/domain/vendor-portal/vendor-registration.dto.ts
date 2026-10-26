// ─── Enums & Union Types ──────────────────────────────────────────────────────
export type RegistrationStatus =
  | 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'suspended';

export type BusinessType =
  | 'sole_proprietorship' | 'partnership' | 'limited_liability'
  | 'public_limited' | 'cooperative' | 'ngo' | 'government_entity' | 'other';

export type BusinessSize = 'micro' | 'small' | 'medium' | 'large' | 'enterprise';

export type OwnershipType =
  | 'indigenous' | 'foreign' | 'joint_venture' | 'government' | 'mixed';

export type Currency = 'NGN' | 'USD' | 'GBP' | 'EUR' | 'GHS' | 'KES' | 'ZAR';

export type AccountType = 'current' | 'savings' | 'domiciliary';

export type DocumentStatus = 'pending' | 'verified' | 'expired' | 'rejected';

// Must match the backend's SupplyCategory enum (sent uppercased) — it rejects any other value.
export type SupplyCategory =
  | 'building_materials' | 'pharmaceutical' | 'legal_services'
  | 'vehicles' | 'fuel_lubricants' | 'engineering_services'
  | 'consultancy' | 'office_supplies' | 'furniture'
  | 'food_beverages' | 'electrical_materials' | 'maintenance_repair'
  | 'it_equipment' | 'medical_supplies' | 'security_services'
  | 'catering_services' | 'safety_equipment' | 'training_education'
  | 'cleaning_supplies' | 'printing_publishing' | 'plumbing_materials'
  | 'ict_services' | 'logistics_transport' | 'uniforms_workwear'
  | 'other';

export type DeliveryRegion =
  | 'lagos' | 'abuja' | 'rivers' | 'kano' | 'oyo' | 'delta'
  | 'anambra' | 'edo' | 'enugu' | 'kwara' | 'ogun' | 'ondo'
  | 'osun' | 'ekiti' | 'cross_river' | 'akwa_ibom' | 'bayelsa'
  | 'imo' | 'abia' | 'ebonyi' | 'benue' | 'kogi' | 'nasarawa'
  | 'plateau' | 'kaduna' | 'sokoto' | 'kebbi' | 'zamfara' | 'katsina'
  | 'jigawa' | 'yobe' | 'borno' | 'adamawa' | 'taraba' | 'gombe'
  | 'bauchi' | 'niger' | 'nationwide' | 'international';

// ─── Step 1: Business Identity ────────────────────────────────────────────────
export interface BusinessIdentity {
  // Core
  businessName:         string;
  tradingName?:         string;
  businessType:         BusinessType;
  businessSize:         BusinessSize;
  ownershipType:        OwnershipType;
  yearEstablished:      number;
  numberOfEmployees:    string;  // range e.g. "1-10"
  annualTurnoverRange:  string;  // e.g. "₦50M - ₦200M"
  currency:             Currency;

  // Description
  businessDescription:  string;
  missionStatement?:    string;
  websiteUrl?:          string;
  linkedinUrl?:         string;

  // Branding
  logoFileUrl?:         string;
  logoFile?:            File;
}

// ─── Step 2: Legal & Compliance ───────────────────────────────────────────────
export interface LegalCompliance {
  // CAC / Registration
  cacRegistrationNumber:   string;
  cacRegistrationDate:     string;
  cacCertificateFileUrl?:  string;
  cacCertificateFile?:     File;

  // Tax
  tinNumber:               string;
  vatRegistered:           boolean;
  vatNumber?:              string;
  taxClearanceCertFileUrl?: string;
  taxClearanceCertFile?:   File;
  taxClearanceExpiryDate?: string;

  // Regulatory
  nafdacNumber?:           string;
  dprLicenceNumber?:       string;
  sonCertificationNumber?: string;
  pencomNumber?:           string;
  nscNumber?:              string;
  otherLicences?:          string;

  // Insurance
  hasPublicLiabilityInsurance: boolean;
  publicLiabilityInsurer?:     string;
  publicLiabilityPolicyNo?:    string;
  publicLiabilityExpiryDate?:  string;
  publicLiabilityFileUrl?:     string;
  publicLiabilityFile?:        File;

  hasProfessionalIndemnity: boolean;
  professionalIndemnityInsurer?:   string;
  professionalIndemnityPolicyNo?:  string;
  professionalIndemnityExpiry?:    string;

  // Certifications
  isoStandards:            string[];   // e.g. ["ISO 9001:2015", "ISO 14001"]
  otherCertifications?:    string;

  // Legal declarations
  hasBeenBlacklisted:      boolean;
  blacklistedDetails?:     string;
  hasLitigationPending:    boolean;
  litigationDetails?:      string;
  hasCriminalConviction:   boolean;
  criminalDetails?:        string;
}

// ─── Step 3: Contact & Location ───────────────────────────────────────────────
export interface ContactLocation {
  // Primary contact
  primaryContactName:    string;
  primaryContactTitle:   string;
  primaryContactEmail:   string;
  primaryContactPhone:   string;
  primaryContactPhone2?: string;

  // Secondary contact
  hasSecondaryContact:   boolean;
  secondaryContactName?: string;
  secondaryContactTitle?: string;
  secondaryContactEmail?: string;
  secondaryContactPhone?: string;

  // Registered address
  registeredAddressLine1:  string;
  registeredAddressLine2?: string;
  registeredCity:          string;
  registeredState:         string;
  registeredPostalCode?:   string;
  registeredCountry:       string;

  // Operating / correspondence address
  operatingAddressSameAsRegistered: boolean;
  operatingAddressLine1?:  string;
  operatingAddressLine2?:  string;
  operatingCity?:          string;
  operatingState?:         string;
  operatingPostalCode?:    string;
  operatingCountry?:       string;

  // Warehouse / storage
  hasWarehouse:            boolean;
  warehouseAddressLine1?:  string;
  warehouseCity?:          string;
  warehouseState?:         string;
  warehouseCapacity?:      string;

  // Delivery
  deliveryRegions:         DeliveryRegion[];
  hasOwnDeliveryFleet:     boolean;
  fleetSize?:              number;
  deliveryLeadTimeDays:    number;
  canDeliverNationwide:    boolean;
  canDeliverInternationally: boolean;
}

// ─── Step 4: Banking & Finance ────────────────────────────────────────────────
export interface BankingFinance {
  // Primary bank account
  primaryBankName:         string;
  primaryBankBranch?:      string;
  primaryAccountName:      string;
  primaryAccountNumber:    string;
  primaryAccountType:      AccountType;
  primaryCurrency:         Currency;
  primarySortCode?:        string;
  primaryIban?:            string;
  primarySwiftCode?:       string;

  // Secondary bank (optional)
  hasSecondaryBankAccount: boolean;
  secondaryBankName?:      string;
  secondaryAccountName?:   string;
  secondaryAccountNumber?: string;
  secondaryAccountType?:   AccountType;
  secondaryCurrency?:      Currency;

  // Payment preferences
  preferredPaymentTerms:   string;   // e.g. "Net 30"
  acceptsAdvancePayment:   boolean;
  advancePaymentPercentage?: number;
  acceptsLetterOfCredit:   boolean;
  acceptsMobileMoney:      boolean;
  mobileMoneyCurrency?:    string;
  mobileMoneyNumber?:      string;

  // Financial standing
  creditRating?:           string;
  annualAuditedAccounts:   boolean;
  auditFirmName?:          string;
  lastAuditYear?:          number;

  // References
  bankReference1Name?:     string;
  bankReference1Contact?:  string;
  tradeReference1Company?: string;
  tradeReference1Contact?: string;
  tradeReference1Email?:   string;
  tradeReference2Company?: string;
  tradeReference2Contact?: string;
  tradeReference2Email?:   string;
}

// ─── Step 5: Capabilities & Experience ───────────────────────────────────────
export interface CapabilitiesExperience {
  // Supply categories
  supplyCategories:         SupplyCategory[];
  primaryCategory:          SupplyCategory;
  categoryDescription:      string;

  // Capacity
  canHandleEmergencyOrders: boolean;
  emergencyLeadTimeHours?:  number;
  minimumOrderValue?:       number;
  maximumOrderValue?:       number;
  bulkDiscountAvailable:    boolean;
  bulkDiscountDetails?:     string;

  // Quality
  hasQualityManagementSystem: boolean;
  qmsStandard?:             string;
  hasInspectionFacility:    boolean;
  testingEquipmentList?:    string;

  // Production / supply
  isManufacturer:           boolean;
  isDistributor:            boolean;
  isServiceProvider:        boolean;
  isImporter:               boolean;
  primarySuppliersCountries?: string;

  // Past performance
  majorClients:             MajorClient[];
  completedProjectsCount:   number;
  averageProjectValue?:     number;
  largestProjectValue?:     number;
  largestProjectDescription?: string;

  // Staff & expertise
  technicalStaffCount?:     number;
  keyPersonnelList:         KeyPersonnel[];

  // Memberships
  industryAssociations?:    string;
  professionalMemberships?: string;
  awardsRecognitions?:      string;
}

export interface MajorClient {
  id:           string;
  companyName:  string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contractValue?: number;
  contractYear?:  number;
  description?:   string;
}

export interface KeyPersonnel {
  id:           string;
  name:         string;
  title:        string;
  qualification?: string;
  yearsExperience?: number;
}

// ─── Step 6: Documents & Declaration ─────────────────────────────────────────
export interface DocumentsDeclaration {
  // Uploaded documents
  uploadedDocuments:     UploadedDocument[];

  // Declaration
  declarantName:         string;
  declarantTitle:        string;
  declarantEmail:        string;
  declarantPhone:        string;
  declarationDate:       string;

  // Agreements
  agreedToTerms:         boolean;
  agreedToPrivacyPolicy: boolean;
  agreedToCodeOfConduct: boolean;
  agreedToAntiCorruption: boolean;
  confirmedAccuracy:     boolean;

  // Signature
  signatureFileUrl?:     string;
  signatureFile?:        File;
}

export interface UploadedDocument {
  id:            string;
  type:          DocumentUploadType;
  label:         string;
  fileName:      string;
  fileSize:      string;
  fileUrl:       string;
  uploadedDate:  Date;
  expiryDate?:   Date;
  isRequired:    boolean;
  status:        DocumentStatus;
  file?:         File;
}

export type DocumentUploadType =
  | 'cac_certificate' | 'tax_clearance' | 'vat_certificate'
  | 'nafdac_cert' | 'son_cert' | 'public_liability_insurance'
  | 'professional_indemnity' | 'iso_certificate' | 'annual_accounts'
  | 'company_profile' | 'bank_reference_letter' | 'other';

// ─── Full Registration DTO ────────────────────────────────────────────────────
export interface VendorRegistration {
  id?:              string;
  applicationNumber?: string;
  status:           RegistrationStatus;
  submittedDate?:   Date;
  lastModified?:    Date;
  reviewedBy?:      string;
  rejectionReason?: string;

  step1: BusinessIdentity;
  step2: LegalCompliance;
  step3: ContactLocation;
  step4: BankingFinance;
  step5: CapabilitiesExperience;
  step6: DocumentsDeclaration;
}

// ─── Constants ────────────────────────────────────────────────────────────────
export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  sole_proprietorship: 'Sole Proprietorship',
  partnership:         'Partnership',
  limited_liability:   'Limited Liability Company (LLC)',
  public_limited:      'Public Limited Company (PLC)',
  cooperative:         'Cooperative Society',
  ngo:                 'Non-Governmental Organisation (NGO)',
  government_entity:   'Government Entity / Parastatal',
  other:               'Other',
};

export const BUSINESS_SIZE_LABELS: Record<BusinessSize, string> = {
  micro:      'Micro (1–9 employees)',
  small:      'Small (10–49 employees)',
  medium:     'Medium (50–249 employees)',
  large:      'Large (250–999 employees)',
  enterprise: 'Enterprise (1,000+ employees)',
};

export const OWNERSHIP_TYPE_LABELS: Record<OwnershipType, string> = {
  indigenous:    'Fully Indigenous / Nigerian-owned',
  foreign:       'Fully Foreign-owned',
  joint_venture: 'Joint Venture (Indigenous + Foreign)',
  government:    'Government-owned',
  mixed:         'Mixed Ownership',
};

export const SUPPLY_CATEGORY_LABELS: Record<SupplyCategory, string> = {
  building_materials:   'Building Materials',
  pharmaceutical:       'Pharmaceuticals',
  legal_services:       'Legal Services',
  vehicles:             'Vehicles',
  fuel_lubricants:      'Fuel & Lubricants',
  engineering_services: 'Engineering Services',
  consultancy:          'Consultancy',
  office_supplies:      'Office Supplies & Stationery',
  furniture:            'Furniture',
  food_beverages:       'Food & Beverages',
  electrical_materials: 'Electrical Materials',
  maintenance_repair:   'Maintenance & Repair',
  it_equipment:         'IT Equipment',
  medical_supplies:     'Medical Supplies',
  security_services:    'Security Services',
  catering_services:    'Catering Services',
  safety_equipment:     'Safety Equipment & PPE',
  training_education:   'Training & Education',
  cleaning_supplies:    'Cleaning Supplies',
  printing_publishing:  'Printing & Publishing',
  plumbing_materials:   'Plumbing Materials',
  ict_services:         'ICT Services',
  logistics_transport:  'Logistics & Transport',
  uniforms_workwear:    'Uniforms & Workwear',
  other:                'Other',
};

export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
  'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo',
  'Ekiti', 'Enugu', 'FCT (Abuja)', 'Gombe', 'Imo', 'Jigawa',
  'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
  'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

export const NIGERIAN_BANKS = [
  'Access Bank', 'Citibank Nigeria', 'Ecobank Nigeria', 'Fidelity Bank',
  'First Bank of Nigeria', 'First City Monument Bank (FCMB)', 'Globus Bank',
  'Guaranty Trust Bank (GTBank)', 'Heritage Bank', 'Keystone Bank',
  'Lotus Bank', 'Optimus Bank', 'Parallex Bank', 'Polaris Bank',
  'Premium Trust Bank', 'Providus Bank', 'Stanbic IBTC Bank',
  'Standard Chartered Bank', 'Sterling Bank', 'Suntrust Bank',
  'Titan Trust Bank', 'Union Bank', 'United Bank for Africa (UBA)',
  'Unity Bank', 'Wema Bank', 'Zenith Bank', 'Other',
];

export const PAYMENT_TERMS_OPTIONS = [
  'Advance Payment (100%)', '50% Advance / 50% on Delivery',
  '30% Advance / 70% on Delivery', 'Net 7', 'Net 14', 'Net 15',
  'Net 30', 'Net 45', 'Net 60', 'Net 90', 'Letter of Credit',
  'On Delivery', 'Milestone-based',
];

export const ISO_STANDARDS_OPTIONS = [
  'ISO 9001:2015 (Quality Management)',
  'ISO 14001:2015 (Environmental Management)',
  'ISO 45001:2018 (Occupational Health & Safety)',
  'ISO 27001:2022 (Information Security)',
  'ISO 22000:2018 (Food Safety Management)',
  'ISO 13485:2016 (Medical Devices)',
  'ISO 50001:2018 (Energy Management)',
  'ISO 31000:2018 (Risk Management)',
];

export const EMPLOYEE_RANGES = [
  '1–5', '6–10', '11–25', '26–50', '51–100',
  '101–250', '251–500', '501–1,000', '1,001–5,000', '5,000+',
];

export const TURNOVER_RANGES = [
  'Under ₦10 million',
  '₦10M – ₦50M',
  '₦50M – ₦200M',
  '₦200M – ₦500M',
  '₦500M – ₦1 billion',
  '₦1B – ₦5B',
  '₦5B – ₦20B',
  'Above ₦20 billion',
];