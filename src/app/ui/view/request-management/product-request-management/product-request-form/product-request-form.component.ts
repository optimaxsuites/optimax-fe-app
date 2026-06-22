import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule, ReactiveFormsModule,
  FormBuilder, FormGroup, Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ProcurementRequestService } from '../../../../service/procurement-request-management/product-request-management/procurement-request.service';
import { VendorService } from '../../../../service/vendor-portal/vendor.service';
import { ApprovalService } from '../../../../service/approval-inbox/approval.service';
import { Attachment } from '../../../../domain/procurement-request/product-requests/product-requests.dto';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ItemCategory =
  | 'technology' | 'construction' | 'healthcare' | 'office_supplies'
  | 'industrial' | 'food_beverage' | 'logistics' | 'furniture'
  | 'safety' | 'cleaning' | 'marketing' | 'other';

export interface CategoryField {
  key:          string;
  label:        string;
  type:         'text' | 'number' | 'select' | 'textarea';
  placeholder?: string;
  options?:     string[];
  required?:    boolean;
  hint?:        string;
}

export interface CartItem {
  id:                  string;
  category:            ItemCategory;
  productName:         string;
  description:         string;
  quantity:            number;
  unit:                string;
  budget:              number;
  currency:            string;
  deliveryLocation:    string;
  specialInstructions: string;
  categoryFields:      Record<string, string>;
  images:              File[];
  imagePreviews:       string[];
  documents:           File[];
}

// ─── Category field definitions ───────────────────────────────────────────────
const CATEGORY_FIELDS: Record<ItemCategory, CategoryField[]> = {
  technology: [
    { key: 'brand',        label: 'Brand / Manufacturer', type: 'text',   placeholder: 'e.g. Dell, HP, Apple', required: true },
    { key: 'model',        label: 'Model / Part Number',  type: 'text',   placeholder: 'e.g. Latitude 5540' },
    { key: 'specs',        label: 'Technical Specs',      type: 'textarea', placeholder: 'Processor, RAM, storage, OS, connectivity…', required: true },
    { key: 'warranty',     label: 'Warranty Required',    type: 'select', options: ['1 Year', '2 Years', '3 Years', 'None'], required: true },
    { key: 'certRequired', label: 'Certifications',       type: 'text',   placeholder: 'e.g. CE, FCC, UL, NAFDAC' },
    { key: 'powerSpec',    label: 'Power Specification',  type: 'text',   placeholder: 'e.g. 220V, 50Hz, 65W' },
    { key: 'compatibility',label: 'Compatibility Notes',  type: 'textarea', placeholder: 'Must be compatible with existing systems…' },
  ],
  construction: [
    { key: 'material',     label: 'Material / Grade',     type: 'text',   placeholder: 'e.g. Grade 60 Steel Rebar', required: true },
    { key: 'standard',     label: 'Standard / Code',      type: 'text',   placeholder: 'e.g. ASTM A615, BS 4449', required: true },
    { key: 'dimensions',   label: 'Dimensions / Size',    type: 'text',   placeholder: 'e.g. 12mm × 6m length' },
    { key: 'finish',       label: 'Finish / Treatment',   type: 'text',   placeholder: 'e.g. Hot-dip galvanised, powder-coated' },
    { key: 'loadCapacity', label: 'Load / Capacity',      type: 'text',   placeholder: 'e.g. 500kg, PN16, C35 concrete' },
    { key: 'testCert',     label: 'Test Certificates',    type: 'select', options: ['Required', 'Not Required', 'Preferred'], required: true },
    { key: 'siteDelivery', label: 'Site Delivery Notes',  type: 'textarea', placeholder: 'Access restrictions, equipment needed for offloading…' },
  ],
  healthcare: [
    { key: 'nafdacNo',     label: 'NAFDAC Registration No.', type: 'text', placeholder: 'e.g. A7-0001L', required: true },
    { key: 'isoStandard',  label: 'ISO / CE Standard',   type: 'text',   placeholder: 'e.g. ISO 13485, CE Class IIa' },
    { key: 'sterility',    label: 'Sterility Requirement', type: 'select', options: ['Sterile', 'Non-sterile', 'Not Applicable'], required: true },
    { key: 'singleUse',    label: 'Single Use or Reusable', type: 'select', options: ['Single Use', 'Reusable', 'Not Applicable'] },
    { key: 'shelfLife',    label: 'Min. Shelf Life Required', type: 'text', placeholder: 'e.g. 24 months from delivery', required: true },
    { key: 'storageTemp',  label: 'Storage Temperature', type: 'text',   placeholder: 'e.g. 2–8°C refrigerated' },
    { key: 'msds',         label: 'MSDS / SDS Required', type: 'select', options: ['Yes — must accompany delivery', 'Not Required'] },
    { key: 'originCountry',label: 'Country of Origin',   type: 'text',   placeholder: 'e.g. Germany, USA, India' },
  ],
  office_supplies: [
    { key: 'brand',        label: 'Preferred Brand',      type: 'text',   placeholder: 'e.g. HP, Canon, Bic, Epson' },
    { key: 'colour',       label: 'Colour / Variant',     type: 'text',   placeholder: 'e.g. Black & White, Royal Blue' },
    { key: 'packSize',     label: 'Pack / Box Size',      type: 'text',   placeholder: 'e.g. Box of 12, Ream of 500' },
    { key: 'compatibility',label: 'Compatibility',        type: 'text',   placeholder: 'e.g. HP LaserJet Pro M552/553' },
    { key: 'gsm',          label: 'GSM / Weight (paper)', type: 'text',   placeholder: 'e.g. 80gsm, 100gsm' },
    { key: 'genericOk',    label: 'Generic / Non-branded Acceptable', type: 'select', options: ['Yes', 'No — branded only'] },
  ],
  industrial: [
    { key: 'material',     label: 'Material / Alloy',     type: 'text',   placeholder: 'e.g. 316 Stainless Steel, Carbon Steel', required: true },
    { key: 'standard',     label: 'Industry Standard',    type: 'text',   placeholder: 'e.g. ASME B16.5, API 6D, ISO 9001', required: true },
    { key: 'pressureRating',label: 'Pressure Rating',     type: 'text',   placeholder: 'e.g. PN16, Class 300, 150 PSI' },
    { key: 'tempRange',    label: 'Operating Temperature', type: 'text',  placeholder: 'e.g. -20°C to 200°C' },
    { key: 'connection',   label: 'Connection / End Type', type: 'text', placeholder: 'e.g. Flanged, Threaded BSP, Socket Weld' },
    { key: 'testCert',     label: 'Test / Mill Certificate', type: 'select', options: ['Required', 'Not Required', 'Preferred'], required: true },
    { key: 'finish',       label: 'Coating / Treatment',  type: 'text',   placeholder: 'e.g. Epoxy lined, Galvanised, Bare' },
  ],
  food_beverage: [
    { key: 'nafdacNo',     label: 'NAFDAC Registration', type: 'text',   placeholder: 'e.g. A7-0001', required: true },
    { key: 'foodGrade',    label: 'Food Grade Certified', type: 'select', options: ['Yes', 'No', 'N/A'], required: true },
    { key: 'allergens',    label: 'Allergen Declaration', type: 'textarea', placeholder: 'List any known allergens or state "None"', required: true },
    { key: 'halalCert',    label: 'Halal / Kosher Cert', type: 'select', options: ['Halal Certified', 'Kosher Certified', 'Both', 'Not Required'] },
    { key: 'shelfLife',    label: 'Min. Shelf Life',      type: 'text',   placeholder: 'e.g. 12 months from production', required: true },
    { key: 'packaging',    label: 'Packaging Type',       type: 'text',   placeholder: 'e.g. 25kg sack, 1L PET bottle' },
    { key: 'storageTemp',  label: 'Storage Conditions',   type: 'text',   placeholder: 'e.g. Ambient, Refrigerated 2–8°C' },
    { key: 'originCountry',label: 'Country of Origin',    type: 'text',   placeholder: 'e.g. Netherlands, Brazil' },
  ],
  logistics: [
    { key: 'serviceType',  label: 'Service Type',         type: 'select', options: ['Road Freight', 'Air Freight', 'Sea Freight', 'Last-Mile Delivery', 'Warehousing', 'Customs Clearance'], required: true },
    { key: 'origin',       label: 'Origin',               type: 'text',   placeholder: 'City / Port of origin', required: true },
    { key: 'destination',  label: 'Destination',          type: 'text',   placeholder: 'City / Port of destination', required: true },
    { key: 'cargoType',    label: 'Cargo Type',           type: 'text',   placeholder: 'e.g. General cargo, Hazmat, Perishable' },
    { key: 'weight',       label: 'Estimated Weight',     type: 'text',   placeholder: 'e.g. 5 tonnes, 200kg' },
    { key: 'dimensions',   label: 'Cargo Dimensions',     type: 'text',   placeholder: 'e.g. 40ft container, 2m × 1.5m × 1m' },
    { key: 'insurance',    label: 'Cargo Insurance',      type: 'select', options: ['Required — vendor to arrange', 'Required — we arrange', 'Not Required'] },
    { key: 'incoterms',    label: 'Incoterms',            type: 'select', options: ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DDP', 'FOB', 'CIF'] },
  ],
  furniture: [
    { key: 'material',     label: 'Material',             type: 'text',   placeholder: 'e.g. Solid oak, MDF with veneer, Chrome steel', required: true },
    { key: 'colour',       label: 'Colour / Finish',      type: 'text',   placeholder: 'e.g. Walnut brown, Matte black' },
    { key: 'dimensions',   label: 'Dimensions (L×W×H)',   type: 'text',   placeholder: 'e.g. 160cm × 80cm × 75cm' },
    { key: 'weightCapacity',label: 'Weight Capacity',     type: 'text',   placeholder: 'e.g. 120kg per chair' },
    { key: 'assembly',     label: 'Assembly Required',    type: 'select', options: ['Vendor to assemble on-site', 'Flat-pack — we assemble', 'Pre-assembled delivery'] },
    { key: 'customisation',label: 'Customisation / Branding', type: 'textarea', placeholder: 'Logo, fabric colour, custom dimensions…' },
    { key: 'fireRating',   label: 'Fire Retardant Rating', type: 'text', placeholder: 'e.g. BS 5852, CAL 117' },
  ],
  safety: [
    { key: 'standard',     label: 'Safety Standard',      type: 'text',   placeholder: 'e.g. EN ISO 20345, ANSI Z87.1, NFPA 70E', required: true },
    { key: 'protectionLevel', label: 'Protection Level / Class', type: 'text', placeholder: 'e.g. Class A, IP67, Arc Rating 8 cal/cm²', required: true },
    { key: 'size',         label: 'Size / Sizing Range',  type: 'text',   placeholder: 'e.g. S–XL, EU 38–48, one size' },
    { key: 'material',     label: 'Material',             type: 'text',   placeholder: 'e.g. High-vis polyester, Kevlar, NBR rubber' },
    { key: 'colour',       label: 'Colour (if specified)', type: 'text', placeholder: 'e.g. Hi-vis yellow, Safety orange' },
    { key: 'certRequired', label: 'Third-Party Certification', type: 'select', options: ['Must accompany delivery', 'Not Required', 'Preferred'] },
    { key: 'customLogo',   label: 'Company Branding',     type: 'select', options: ['Yes — logo required', 'No branding needed'] },
  ],
  cleaning: [
    { key: 'formulation',  label: 'Formulation Type',     type: 'select', options: ['Concentrate', 'Ready-to-use', 'Powder', 'Foam', 'Gel', 'Spray'], required: true },
    { key: 'ph',           label: 'pH Level',             type: 'text',   placeholder: 'e.g. pH 7 neutral, pH 2 acidic' },
    { key: 'dilution',     label: 'Dilution Ratio',       type: 'text',   placeholder: 'e.g. 1:50, 1:100, ready-to-use' },
    { key: 'surface',      label: 'Suitable Surfaces',    type: 'text',   placeholder: 'e.g. Marble, Terrazzo, Carpet, Glass', required: true },
    { key: 'scent',        label: 'Fragrance',            type: 'select', options: ['Fragrance-free', 'Light fragrance', 'Any'] },
    { key: 'ecoFriendly',  label: 'Eco / Biodegradable',  type: 'select', options: ['Must be eco-certified', 'Preferred', 'Not Required'] },
    { key: 'sds',          label: 'Safety Data Sheet (SDS)', type: 'select', options: ['Required', 'Not Required'] },
  ],
  marketing: [
    { key: 'materialType', label: 'Material / Medium',    type: 'text',   placeholder: 'e.g. 400gsm Matt Laminate, Vinyl banner', required: true },
    { key: 'dimensions',   label: 'Dimensions / Format',  type: 'text',   placeholder: 'e.g. A1 poster, 3m × 1m banner, A5 flyer' },
    { key: 'printType',    label: 'Print Type',           type: 'select', options: ['Full colour CMYK', 'Pantone matched', 'Digital print', 'Screen print', 'Embroidery'] },
    { key: 'finishing',    label: 'Finishing',            type: 'text',   placeholder: 'e.g. Matt laminate, Gloss UV, Foil stamp' },
    { key: 'artworkReady', label: 'Artwork Status',       type: 'select', options: ['Print-ready artwork supplied', 'Design required from vendor', 'Template needed'], required: true },
    { key: 'brandGuidelines', label: 'Brand Colours (Pantone / HEX)', type: 'text', placeholder: 'e.g. Pantone 286C, #224957' },
    { key: 'proofRequired',label: 'Proof Before Print',   type: 'select', options: ['Digital proof required', 'Physical proof required', 'No proof needed'] },
  ],
  other: [
    { key: 'standard',     label: 'Applicable Standard / Spec', type: 'text', placeholder: 'Any relevant standard or certification' },
    { key: 'material',     label: 'Material / Composition', type: 'text', placeholder: 'Material or composition details' },
    { key: 'dimensions',   label: 'Dimensions / Size',    type: 'text',   placeholder: 'Physical dimensions if applicable' },
    { key: 'customDetails',label: 'Additional Technical Details', type: 'textarea', placeholder: 'Any other specification the vendor must know…', required: true },
  ],
};

export const CATEGORY_OPTIONS: { value: ItemCategory; label: string; icon: string; description: string }[] = [
  { value: 'technology',     label: 'Technology & IT',       icon: '💻', description: 'Computers, servers, software, networking' },
  { value: 'construction',   label: 'Construction',          icon: '🏗️', description: 'Structural materials, tools, civil works' },
  { value: 'healthcare',     label: 'Healthcare & Medical',  icon: '🏥', description: 'Medical devices, consumables, pharmaceuticals' },
  { value: 'office_supplies',label: 'Office Supplies',       icon: '📋', description: 'Stationery, consumables, paper, toner' },
  { value: 'industrial',     label: 'Industrial Equipment',  icon: '⚙️', description: 'Valves, gauges, pipes, mechanical parts' },
  { value: 'food_beverage',  label: 'Food & Beverage',       icon: '🍽️', description: 'Food products, ingredients, beverages' },
  { value: 'logistics',      label: 'Logistics & Transport', icon: '🚚', description: 'Freight, warehousing, customs clearance' },
  { value: 'furniture',      label: 'Furniture & Fixtures',  icon: '🪑', description: 'Office furniture, shelving, interior fittings' },
  { value: 'safety',         label: 'Safety & PPE',          icon: '🦺', description: 'Protective equipment, safety gear, workwear' },
  { value: 'cleaning',       label: 'Cleaning & Facilities', icon: '🧹', description: 'Cleaning products, janitorial supplies' },
  { value: 'marketing',      label: 'Marketing & Print',     icon: '📢', description: 'Branded materials, print, promotional items' },
  { value: 'other',          label: 'Other',                 icon: '📦', description: 'Items that don\'t fit the above categories' },
];

@Component({
  selector: 'app-product-request-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './product-request-form.component.html',
  styleUrls: ['./product-request-form.component.scss'],
})
export class ProductRequestFormComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // ── Step state ────────────────────────────────────────────────────────────
  currentStep = 1;
  totalSteps  = 4;

  // ── Forms ─────────────────────────────────────────────────────────────────
  mainForm!: FormGroup;
  itemForm!: FormGroup;

  // ── Cart ──────────────────────────────────────────────────────────────────
  cartItems:        CartItem[] = [];
  editingItemIndex: number | null = null;
  showItemModal     = false;

  // ── Item modal state ──────────────────────────────────────────────────────
  selectedCategory:    ItemCategory | null = null;
  categoryFields:      CategoryField[]     = [];
  categoryFieldValues: Record<string, string> = {};
  modalImages:         File[]   = [];
  modalImagePreviews:  string[] = [];
  modalDocuments:      File[]   = [];
  showCategoryPicker   = true;

  // ── Vendor state ──────────────────────────────────────────────────────────
  availableVendors:  any[]     = [];
  selectedVendorIds: string[]  = [];
  searchVendorTerm   = '';

  // ── Options ───────────────────────────────────────────────────────────────
  readonly CATEGORY_OPTIONS = CATEGORY_OPTIONS;
  readonly currencies = ['NGN', 'USD', 'GBP', 'EUR', 'KES', 'ZAR'];
  readonly units      = ['pcs', 'sets', 'boxes', 'cartons', 'kg', 'tonnes', 'litres', 'metres', 'rolls', 'reams', 'units', 'lots'];
  readonly urgencyOptions   = ['Low', 'Medium', 'High', 'Urgent'];
  readonly paymentTermOptions = ['Advance Payment', 'Net 15', 'Net 30', 'Net 45', 'Net 60', '50% advance / 50% on delivery', 'Letter of Credit'];
  readonly deliveryModeOptions = ['Deliver to site', 'Vendor to install', 'Collect from vendor', 'Drop-ship to end user'];
  readonly approvalLevelOptions = ['Line Manager', 'Department Head', 'Finance Director', 'CEO', 'Board'];

  savedLocations = [
    { id: 'LOC1', name: 'Head Office',      address: 'Lekki Phase 1, Lagos' },
    { id: 'LOC2', name: 'Branch Office',    address: 'Ikeja, Lagos' },
    { id: 'LOC3', name: 'Abuja Office',     address: 'Maitama, Abuja' },
    { id: 'LOC4', name: 'Port Harcourt',    address: 'GRA Phase 2, Port Harcourt' },
  ];

  customDeliveryLocation = '';
  isSubmitting = false;
  minExpiryDate = '';

  constructor(
    private fb:                  FormBuilder,
    private router:              Router,
    private procurementService:  ProcurementRequestService,
    private vendorService:       VendorService,
    private approvalService:     ApprovalService,
  ) {
    this.mainForm = this.fb.group({
      // ── Order identity
      orderName:        ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
      orderReference:   [''],
      projectName:      [''],
      projectCode:      [''],
      departmentName:   ['', Validators.required],
      costCentre:       [''],
      budgetCode:       [''],
      urgency:          ['Medium', Validators.required],

      // ── Delivery
      masterDeliveryLocation:  ['', Validators.required],
      masterDeliveryDeadline:  ['', Validators.required],
      deliveryMode:            ['Deliver to site', Validators.required],
      deliveryContactName:     [''],
      deliveryContactPhone:    [''],
      requiresInstallation:    [false],
      requiresInspection:      [false],

      // ── Commercial
      preferredPaymentTerms:   ['Net 30', Validators.required],
      budgetApprovalRef:       [''],
      taxExempt:               [false],
      requiresBond:            [false],
      bondPercentage:          [''],

      // ── RFQ settings
      rfqExpiryDate:           ['', Validators.required],
      rfqTitle:                ['', Validators.required],
      vendorTargetingType:     ['ALL_VENDORS', Validators.required],
      allowPartialQuotes:      [true],
      requireSampleSubmission: [false],
      requireSiteVisit:        [false],
      evaluationCriteria:      ['Price and Quality'],

      // ── Special instructions
      masterSpecialInstructions: ['', Validators.maxLength(2000)],
      internalNotes:             [''],
    });

    this.itemForm = this.fb.group({
      productName:          ['', [Validators.required, Validators.minLength(3)]],
      description:          ['', [Validators.required, Validators.minLength(10)]],
      quantity:             [1,  [Validators.required, Validators.min(1)]],
      unit:                 ['pcs'],
      budget:               ['', [Validators.required, Validators.min(0.01)]],
      currency:             ['NGN'],
      deliveryLocation:     [''],
      specialInstructions:  [''],
    });
  }

  ngOnInit(): void {
    this.loadVendors();
    this.setMinExpiryDate();
    this.mainForm.get('masterDeliveryLocation')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => { if (v === 'CUSTOM') this.customDeliveryLocation = ''; });
    this.mainForm.get('requiresBond')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => {
        const ctrl = this.mainForm.get('bondPercentage');
        v ? ctrl?.setValidators([Validators.required]) : ctrl?.clearValidators();
        ctrl?.updateValueAndValidity();
      });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ── Vendor loading ────────────────────────────────────────────────────────
  private loadVendors(): void {
    this.vendorService.getApprovedVendors().pipe(takeUntil(this.destroy$)).subscribe({
      next: (v: any[]) => this.availableVendors = v,
      error: () => {
        this.availableVendors = [
          { id: 'V001', name: 'TechSupply Nigeria Ltd', category: 'Technology',    rating: 4.8, location: 'Lagos', verified: true },
          { id: 'V002', name: 'BuildRight Construction', category: 'Construction', rating: 4.5, location: 'Abuja', verified: true },
          { id: 'V003', name: 'MedPlus Supplies',        category: 'Healthcare',   rating: 4.7, location: 'Lagos', verified: true },
          { id: 'V004', name: 'Office World NG',         category: 'Office',       rating: 4.3, location: 'Lagos', verified: false },
          { id: 'V005', name: 'SafeGuard Equipment',     category: 'Safety & PPE', rating: 4.6, location: 'Port Harcourt', verified: true },
          { id: 'V006', name: 'CleanPro Services',       category: 'Cleaning',     rating: 4.4, location: 'Lagos', verified: true },
        ];
      },
    });
  }

  private setMinExpiryDate(): void {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    this.minExpiryDate = d.toISOString().split('T')[0];
  }

  get today(): string { return new Date().toISOString().split('T')[0]; }

  // ── Category selection ────────────────────────────────────────────────────
  selectCategory(cat: ItemCategory): void {
    this.selectedCategory    = cat;
    this.categoryFields      = CATEGORY_FIELDS[cat] ?? [];
    this.categoryFieldValues = {};
    this.categoryFields.forEach(f => { this.categoryFieldValues[f.key] = ''; });
    this.showCategoryPicker  = false;
  }

  backToCategoryPicker(): void {
    this.showCategoryPicker  = true;
    this.selectedCategory    = null;
    this.categoryFields      = [];
    this.categoryFieldValues = {};
  }

  getCategoryLabel(cat: ItemCategory): string {
    return CATEGORY_OPTIONS.find(c => c.value === cat)?.label ?? cat;
  }

  getCategoryIcon(cat: ItemCategory): string {
    return CATEGORY_OPTIONS.find(c => c.value === cat)?.icon ?? '📦';
  }

  // ── Cart ──────────────────────────────────────────────────────────────────
  openAddItemModal(): void {
    this.editingItemIndex    = null;
    this.selectedCategory    = null;
    this.categoryFields      = [];
    this.categoryFieldValues = {};
    this.showCategoryPicker  = true;
    this.modalImages         = [];
    this.modalImagePreviews  = [];
    this.modalDocuments      = [];
    this.itemForm.reset({ productName: '', description: '', quantity: 1, unit: 'pcs', budget: '', currency: 'NGN', deliveryLocation: '', specialInstructions: '' });
    this.showItemModal = true;
  }

  editItem(index: number): void {
    const item = this.cartItems[index];
    this.editingItemIndex    = index;
    this.selectedCategory    = item.category;
    this.categoryFields      = CATEGORY_FIELDS[item.category] ?? [];
    this.categoryFieldValues = { ...item.categoryFields };
    this.showCategoryPicker  = false;
    this.modalImages         = [...item.images];
    this.modalImagePreviews  = [...item.imagePreviews];
    this.modalDocuments      = [...item.documents];
    this.itemForm.patchValue({
      productName: item.productName, description: item.description,
      quantity: item.quantity, unit: item.unit, budget: item.budget,
      currency: item.currency, deliveryLocation: item.deliveryLocation,
      specialInstructions: item.specialInstructions,
    });
    this.showItemModal = true;
  }

  saveItemToCart(): void {
    this.itemForm.markAllAsTouched();
    if (this.itemForm.invalid || !this.selectedCategory) return;

    // Validate required category fields
    const missingRequired = this.categoryFields
      .filter(f => f.required && !this.categoryFieldValues[f.key]?.trim());
    if (missingRequired.length > 0) {
      alert(`Please fill required field: "${missingRequired[0].label}"`);
      return;
    }

    const v    = this.itemForm.value;
    const item: CartItem = {
      id:                  this.editingItemIndex !== null ? this.cartItems[this.editingItemIndex].id : crypto.randomUUID(),
      category:            this.selectedCategory,
      productName:         v.productName,
      description:         v.description,
      quantity:            v.quantity,
      unit:                v.unit,
      budget:              v.budget,
      currency:            v.currency,
      deliveryLocation:    v.deliveryLocation || '',
      specialInstructions: v.specialInstructions || '',
      categoryFields:      { ...this.categoryFieldValues },
      images:              [...this.modalImages],
      imagePreviews:       [...this.modalImagePreviews],
      documents:           [...this.modalDocuments],
    };

    if (this.editingItemIndex !== null) {
      this.cartItems[this.editingItemIndex] = item;
    } else {
      this.cartItems.push(item);
    }

    this.showItemModal    = false;
    this.editingItemIndex = null;
  }

  removeItem(index: number): void {
    this.cartItems.splice(index, 1);
  }

  getTotalBudget():   number { return this.cartItems.reduce((s, i) => s + i.budget,   0); }
  getTotalQuantity(): number { return this.cartItems.reduce((s, i) => s + i.quantity, 0); }

  // ── Vendor targeting ──────────────────────────────────────────────────────
  toggleVendor(id: string): void {
    const idx = this.selectedVendorIds.indexOf(id);
    idx > -1 ? this.selectedVendorIds.splice(idx, 1) : this.selectedVendorIds.push(id);
  }

  isVendorSelected(id: string): boolean { return this.selectedVendorIds.includes(id); }
  selectAllVendors():   void { this.selectedVendorIds = this.availableVendors.map(v => v.id); }
  deselectAllVendors(): void { this.selectedVendorIds = []; }

  getFilteredVendors(): any[] {
    if (!this.searchVendorTerm.trim()) return this.availableVendors;
    const t = this.searchVendorTerm.toLowerCase();
    return this.availableVendors.filter(v =>
      v.name.toLowerCase().includes(t) || v.category.toLowerCase().includes(t) || v.location?.toLowerCase().includes(t)
    );
  }

  getVendorInitials(name: string): string {
    return name.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase();
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  nextStep(): void {
    if (!this.validateStep()) return;
    if (this.currentStep < this.totalSteps) this.currentStep++;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private validateStep(): boolean {
    if (this.currentStep === 1 && this.cartItems.length === 0) {
      alert('Add at least one item before continuing.');
      return false;
    }
    if (this.currentStep === 2) {
      const required: [string, string][] = [
        ['orderName',               'Order name is required (min 3 characters).'],
        ['departmentName',          'Department / business unit is required.'],
        ['masterDeliveryLocation',  'Select a delivery location.'],
        ['masterDeliveryDeadline',  'Set a delivery deadline.'],
        ['rfqExpiryDate',           'Set an RFQ expiry date.'],
        ['rfqTitle',                'RFQ title is required.'],
      ];
      for (const [field, msg] of required) {
        if (this.mainForm.get(field)?.invalid) {
          this.mainForm.get(field)?.markAsTouched();
          alert(msg);
          return false;
        }
      }
    }
    if (this.currentStep === 3 &&
        this.mainForm.get('vendorTargetingType')?.value === 'SELECTED_VENDORS' &&
        this.selectedVendorIds.length === 0) {
      alert('Select at least one vendor, or switch to "All registered vendors".');
      return false;
    }
    return true;
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.mainForm.invalid || this.cartItems.length === 0) {
      this.mainForm.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    const fv = this.mainForm.value;

    const orderItems = this.cartItems.map(item => ({
      ...item,
      attachments: [
        ...item.imagePreviews.map((p, i) => ({ id: `IMG-${i}`, fileName: item.images[i]?.name ?? `img-${i}.jpg`, fileUrl: p, uploadedAt: new Date() } as Attachment)),
        ...item.documents.map((d, i) => ({ id: `DOC-${i}`, fileName: d.name, fileUrl: URL.createObjectURL(d), uploadedAt: new Date() } as Attachment)),
      ],
    }));

    const payload = {
      ...fv,
      items: orderItems,
      totalBudget: this.getTotalBudget(),
      masterDeliveryLocation: fv.masterDeliveryLocation === 'CUSTOM' ? this.customDeliveryLocation : fv.masterDeliveryLocation,
      masterDeliveryDeadline: new Date(fv.masterDeliveryDeadline),
      rfqExpiryDate:          new Date(fv.rfqExpiryDate),
      selectedVendors:        fv.vendorTargetingType === 'SELECTED_VENDORS' ? this.selectedVendorIds : [],
      status: 'PENDING_APPROVAL',
    };

    this.procurementService.createMasterOrder(payload).subscribe({
      next: (res: { id: string }) => {
        this.approvalService.createApprovalRequest({
          requestId:    res.id, requestType: 'ORDER',
          requestTitle: fv.orderName, requesterId: 'CUST-001',
          requesterName: 'John Doe Enterprises',
          requesterDepartment: fv.departmentName,
          budget: payload.totalBudget, currency: 'NGN',
          items: orderItems.map((i, idx) => ({ id: String(idx + 1), productName: i.productName, quantity: i.quantity, budget: i.budget, attachments: i.attachments })),
          urgency: this.calcUrgency(payload.masterDeliveryDeadline),
          approvals: [{ level: 1, approverRole: 'Manager', required: true }],
          vendorTargetingType: fv.vendorTargetingType,
          selectedVendors: payload.selectedVendors,
        }).subscribe({
          next: () => { this.isSubmitting = false; this.router.navigate(['/commerce/requests']); },
          error: () => { this.isSubmitting = false; this.router.navigate(['/commerce/requests']); },
        });
      },
      error: () => { this.isSubmitting = false; alert('Failed to submit. Please try again.'); },
    });
  }

  private calcUrgency(deadline: Date): string {
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
    if (days <= 3)  return 'URGENT';
    if (days <= 7)  return 'HIGH';
    if (days <= 14) return 'MEDIUM';
    return 'LOW';
  }

  // ── File uploads ──────────────────────────────────────────────────────────
  onImageSelected(e: Event): void {
    const files = (e.target as HTMLInputElement).files;
    if (files) this.addImages(Array.from(files));
  }

  onImageDropped(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer?.files) this.addImages(Array.from(e.dataTransfer.files));
  }

  private addImages(files: File[]): void {
    for (const f of files) {
      if (!f.type.startsWith('image/')) { alert(`${f.name} is not an image.`); continue; }
      if (f.size > 10 * 1024 * 1024)   { alert(`${f.name} exceeds 10 MB.`);   continue; }
      const r = new FileReader();
      r.onload = ev => { this.modalImages.push(f); this.modalImagePreviews.push(ev.target?.result as string); };
      r.readAsDataURL(f);
    }
  }

  removeModalImage(i: number): void { this.modalImages.splice(i, 1); this.modalImagePreviews.splice(i, 1); }

  onDocSelected(e: Event): void {
    const files = (e.target as HTMLInputElement).files;
    if (files) this.addDocs(Array.from(files));
  }

  onDocDropped(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer?.files) this.addDocs(Array.from(e.dataTransfer.files));
  }

  private addDocs(files: File[]): void {
    for (const f of files) {
      if (f.size > 10 * 1024 * 1024) { alert(`${f.name} exceeds 10 MB.`); continue; }
      this.modalDocuments.push(f);
    }
  }

  removeModalDoc(i: number): void { this.modalDocuments.splice(i, 1); }

  // ── Helpers ───────────────────────────────────────────────────────────────
  formatCurrency(n: number, cur: string): string {
    try { return new Intl.NumberFormat('en-NG', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n); }
    catch { return `${cur} ${n}`; }
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024, s = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / k ** i).toFixed(1)} ${s[i]}`;
  }

  isFieldInvalid(field: string): boolean {
    const c = this.mainForm.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  isItemFieldInvalid(field: string): boolean {
    const c = this.itemForm.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  getUrgencyColor(u: string): string {
    return { Low: '#16a34a', Medium: '#d97706', High: '#ea580c', Urgent: '#dc2626' }[u] ?? '#6b7280';
  }
}