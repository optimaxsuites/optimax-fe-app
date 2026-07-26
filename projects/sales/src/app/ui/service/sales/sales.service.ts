import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { 
  SalesSummary, 
  RevenueChartData, 
  TopProduct, 
  Quote, 
  QuoteStatus,
  Invoice, 
  InvoiceStatus,
  Customer, 
  Product,
  Category,
  QuoteItem,
  InvoiceItem,
  MerchantInfo,
  PaymentReceipt,
  PaymentMethod,
  PaymentMode,
  PaymentTerms,
  AdditionalInvoiceOptions,
  AdditionalQuoteOptions,
  SalesandTransactions,
  MeasurementUnit,
  Supplier
} from '../../domain/sales/sales.dto';

export const defaultMerchantInfo: MerchantInfo = {
  id: 1,
  merchantId: 'MCH-001',
  name: 'OptiMax ERP',
  companyName: 'OptiMax Sales Hub Ltd',
  bankDetails: {
    bankName: 'Access Bank',
    accountName: 'OptiMax Sales Hub Ltd',
    accountNumber: '0011223344'
  },
  address: ['14 Commerce Boulevard, Suite 500, Victoria Island', 'Lagos, Nigeria'],
  phone: '+234 800 123 4567',
  email: 'info@optimax.com',
  taxId: 'TIN-9876543210',
  logoUrl: []
};

@Injectable({
  providedIn: 'root'
})
export class SalesService {

  private readonly QUOTES_KEY = 'sales_quotes';
  private readonly CUSTOMERS_KEY = 'sales_customers';
  private readonly PRODUCTS_KEY = 'sales_products';
  private readonly INVOICES_KEY = 'sales_invoices';
  private readonly TRANSACTIONS_KEY = 'sales_transactions';
  private readonly CATEGORIES_KEY = 'sales_categories';
  private readonly SUPPLIERS_KEY = 'sales_suppliers';

  constructor() {
    this.initData();
    this.sanitizeCustomers();
    this.sanitizeProducts();
  }

  private sanitizeCustomers(): void {
    try {
      const customersStr = localStorage.getItem(this.CUSTOMERS_KEY);
      if (customersStr) {
        let customers = JSON.parse(customersStr);
        let changed = false;
        customers = customers.map((c: any, index: number) => {
          if (!c.id || c.id.trim() === '') {
            c.id = `CUST-${String(index + 1).padStart(3, '0')}`;
            changed = true;
          }
          return c;
        });
        if (changed) {
          localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify(customers));
        }
      }
    } catch (e) {
      console.error('Error sanitizing customers:', e);
    }
  }

  private sanitizeProducts(): void {
    try {
      const productsStr = localStorage.getItem(this.PRODUCTS_KEY);
      if (productsStr) {
        const products = JSON.parse(productsStr);
        let changed = false;
        products.forEach((p: any) => {
          if (!p.supplier) {
            p.supplier = { id: 1, supplierId: 'SUP-001', name: 'Default Supplier' };
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products));
        }
      }
    } catch (e) {
      console.error('Error sanitizing products:', e);
    }
  }

  private initData(): void {
    // Initialize Customers
    if (!localStorage.getItem(this.CUSTOMERS_KEY)) {
      const mockCustomers: Customer[] = [
        { id: 1, customerId: 'CUST-001', name: 'Mama Nkechi Enterprises', email: 'contact@maman-nkechi.com', phone: '+234 803 123 4567', address: ['Lagos, Nigeria'], deliverAddress: ['Lagos, Nigeria'], createdBy: 'System', taxId: 'TAX-001', createdAt: new Date(), totalSpent: 500000, totalOrders: 1, status: 'ACTIVE' },
        { id: 2, customerId: 'CUST-002', name: 'Tech Solutions Ltd', email: 'info@techsolutions.ng', phone: '+234 812 345 6789', address: ['Abuja, Nigeria'], deliverAddress: ['Abuja, Nigeria'], createdBy: 'System', taxId: 'TAX-002', createdAt: new Date(), totalSpent: 1250000, totalOrders: 1, status: 'ACTIVE' },
        { id: 3, customerId: 'CUST-003', name: 'Global Services NG', email: 'hello@globalservices.ng', phone: '+234 705 678 9012', address: ['Port Harcourt, Nigeria'], deliverAddress: ['Port Harcourt, Nigeria'], createdBy: 'System', taxId: 'TAX-003', createdAt: new Date(), totalSpent: 0, totalOrders: 0, status: 'ACTIVE' },
        { id: 4, customerId: 'CUST-004', name: 'Aliko Dangote Wholesale', email: 'info@dangote-wholesale.com', phone: '+234 802 222 3333', address: ['Kano, Nigeria'], deliverAddress: ['Kano, Nigeria'], createdBy: 'System', taxId: 'TAX-004', createdAt: new Date(), totalSpent: 750000, totalOrders: 1, status: 'ACTIVE' },
        { id: 5, customerId: 'CUST-005', name: 'Obinna Electronics', email: 'contact@obinnaelectronics.com', phone: '+234 809 444 5555', address: ['Onitsha, Nigeria'], deliverAddress: ['Onitsha, Nigeria'], createdBy: 'System', taxId: 'TAX-005', createdAt: new Date(), totalSpent: 0, totalOrders: 0, status: 'ACTIVE' }
      ];
      localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify(mockCustomers));
    }

    // Initialize Products
    if (!localStorage.getItem(this.PRODUCTS_KEY)) {
      const mockProducts: Product[] = [
        { 
          id: 1, 
          productId: 'PROD-001', 
          name: 'Executive Office Chair', 
          sku: 'CHR-001', 
          description: 'Ergonomic executive office chair', 
          unitPrice: 50000, 
          costPrice: 30000, 
          sellingPrice: 50000,
          noOfTimesSoldPerMonth: 12,
          currency: 'NGN', 
          stockQuantity: 50, 
          category: { id: 2, categoryId: 'CAT-002', name: 'Furniture', description: 'Office chairs, tables, and desks' }, 
          taxRate: 7.5, 
          images: [], 
          status: 'ACTIVE',
          partNumber: 'PN-CHR-001',
          code: 'C-CHR-001',
          reorderThreshold: 5,
          weight: 8,
          expiryDate: new Date('2029-12-31'),
          discount: 0,
          supplier: { id: 1, supplierId: 'SUP-001', name: 'Default Supplier' },
          stockMovement: { id: 1, supplierId: { id: 1, supplierId: 'SUP-001', name: 'Default Supplier' }, movementDate: new Date(), movementQuantity: 50 }
        },
        { 
          id: 2, 
          productId: 'PROD-002', 
          name: 'Standing Desk', 
          sku: 'DSK-001', 
          description: 'Adjustable standing desk', 
          unitPrice: 120000, 
          costPrice: 80000, 
          sellingPrice: 120000,
          noOfTimesSoldPerMonth: 8,
          currency: 'NGN', 
          stockQuantity: 30, 
          category: { id: 2, categoryId: 'CAT-002', name: 'Furniture', description: 'Office chairs, tables, and desks' }, 
          taxRate: 7.5, 
          images: [], 
          status: 'ACTIVE',
          partNumber: 'PN-DSK-001',
          code: 'C-DSK-001',
          reorderThreshold: 3,
          weight: 25,
          expiryDate: new Date('2029-12-31'),
          discount: 0,
          supplier: { id: 1, supplierId: 'SUP-001', name: 'Default Supplier' },
          stockMovement: { id: 2, supplierId: { id: 1, supplierId: 'SUP-001', name: 'Default Supplier' }, movementDate: new Date(), movementQuantity: 30 }
        },
        { 
          id: 3, 
          productId: 'PROD-003', 
          name: 'Laptop - Dell XPS', 
          sku: 'LAP-001', 
          description: 'Dell XPS 13 laptop', 
          unitPrice: 850000, 
          costPrice: 700000, 
          sellingPrice: 850000,
          noOfTimesSoldPerMonth: 5,
          currency: 'NGN', 
          stockQuantity: 15, 
          category: { id: 1, categoryId: 'CAT-001', name: 'Electronics', description: 'Gadgets, computing, and electronic systems' }, 
          taxRate: 7.5, 
          images: [], 
          status: 'ACTIVE',
          partNumber: 'PN-LAP-001',
          code: 'C-LAP-001',
          reorderThreshold: 2,
          weight: 1.3,
          expiryDate: new Date('2029-12-31'),
          discount: 0,
          supplier: { id: 1, supplierId: 'SUP-001', name: 'Default Supplier' },
          stockMovement: { id: 3, supplierId: { id: 1, supplierId: 'SUP-001', name: 'Default Supplier' }, movementDate: new Date(), movementQuantity: 15 }
        },
        { 
          id: 4, 
          productId: 'PROD-004', 
          name: 'Conference Table', 
          sku: 'TBL-001', 
          description: 'Large conference table', 
          unitPrice: 250000, 
          costPrice: 180000, 
          sellingPrice: 250000,
          noOfTimesSoldPerMonth: 4,
          currency: 'NGN', 
          stockQuantity: 10, 
          category: { id: 2, categoryId: 'CAT-002', name: 'Furniture', description: 'Office chairs, tables, and desks' }, 
          taxRate: 7.5, 
          images: [], 
          status: 'ACTIVE',
          partNumber: 'PN-TBL-001',
          code: 'C-TBL-001',
          reorderThreshold: 1,
          weight: 45,
          expiryDate: new Date('2029-12-31'),
          discount: 0,
          supplier: { id: 1, supplierId: 'SUP-001', name: 'Default Supplier' },
          stockMovement: { id: 4, supplierId: { id: 1, supplierId: 'SUP-001', name: 'Default Supplier' }, movementDate: new Date(), movementQuantity: 10 }
        },
        { 
          id: 5, 
          productId: 'PROD-005', 
          name: 'Printer - HP LaserJet', 
          sku: 'PRN-001', 
          description: 'HP LaserJet printer', 
          unitPrice: 150000, 
          costPrice: 120000, 
          sellingPrice: 150000,
          noOfTimesSoldPerMonth: 6,
          currency: 'NGN', 
          stockQuantity: 25, 
          category: { id: 1, categoryId: 'CAT-001', name: 'Electronics', description: 'Gadgets, computing, and electronic systems' }, 
          taxRate: 7.5, 
          images: [], 
          status: 'ACTIVE',
          partNumber: 'PN-PRN-001',
          code: 'C-PRN-001',
          reorderThreshold: 4,
          weight: 7.5,
          expiryDate: new Date('2029-12-31'),
          discount: 0,
          supplier: { id: 1, supplierId: 'SUP-001', name: 'Default Supplier' },
          stockMovement: { id: 5, supplierId: { id: 1, supplierId: 'SUP-001', name: 'Default Supplier' }, movementDate: new Date(), movementQuantity: 25 }
        }
      ];
      localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(mockProducts));
    }

    // Initialize & Migrate Categories
    const storedCats = localStorage.getItem(this.CATEGORIES_KEY);
    let categories: Category[] = [];
    let needsSave = false;

    if (storedCats) {
      try {
        const parsed = JSON.parse(storedCats);
        if (Array.isArray(parsed)) {
          const needsMigration = parsed.some(c => typeof c === 'string' || (c && typeof c === 'object' && !c.categoryId));
          if (needsMigration) {
            categories = parsed.map((c: any, idx: number) => {
              if (typeof c === 'string') {
                return {
                  id: idx + 1,
                  categoryId: `CAT-${String(idx + 1).padStart(3, '0')}`,
                  name: c,
                  description: `Legacy ${c} category`
                };
              } else {
                return {
                  id: typeof c.id === 'number' ? c.id : (idx + 1),
                  categoryId: c.categoryId || c.id || `CAT-${String(idx + 1).padStart(3, '0')}`,
                  name: c.name || '',
                  description: c.description || ''
                };
              }
            });
            needsSave = true;
          } else {
            categories = parsed;
          }
        }
      } catch (e) {
        categories = [];
      }
    }

    if (categories.length === 0) {
      categories = [
        { id: 1, categoryId: 'CAT-001', name: 'Electronics', description: 'Gadgets, computing, and electronic systems' },
        { id: 2, categoryId: 'CAT-002', name: 'Furniture', description: 'Office chairs, tables, and desks' },
        { id: 3, categoryId: 'CAT-003', name: 'Accessories', description: 'Keyboard, mouse, cables, and minor peripherals' },
        { id: 4, categoryId: 'CAT-004', name: 'Services', description: 'Consultation, deployment, and logistics services' },
        { id: 5, categoryId: 'CAT-005', name: 'Office Supplies', description: 'Stationery, papers, and office tools' },
        { id: 6, categoryId: 'CAT-006', name: 'Other', description: 'Miscellaneous inventory items' }
      ];
      needsSave = true;
    }

    if (needsSave) {
      localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(categories));
    }

    // Initialize Measurement Units
    if (!localStorage.getItem('sales_measurement_units')) {
      const mockUnits: MeasurementUnit[] = [
        { id: 1, unitId: 'UNT-001', name: 'Each', code: 'pcs', description: 'Single item count' },
        { id: 2, unitId: 'UNT-002', name: 'Kilogram', code: 'kg', description: 'Mass weight unit' },
        { id: 3, unitId: 'UNT-003', name: 'Gram', code: 'g', description: 'Mass weight unit' },
        { id: 4, unitId: 'UNT-004', name: 'Liter', code: 'L', description: 'Liquid volume unit' },
        { id: 5, unitId: 'UNT-005', name: 'Milliliter', code: 'mL', description: 'Liquid volume unit' },
        { id: 6, unitId: 'UNT-006', name: 'Meter', code: 'm', description: 'Linear length unit' },
        { id: 7, unitId: 'UNT-007', name: 'Centimeter', code: 'cm', description: 'Linear length unit' },
        { id: 8, unitId: 'UNT-008', name: 'Box', code: 'box', description: 'Box package containing multiple items' },
        { id: 9, unitId: 'UNT-009', name: 'Pack', code: 'pack', description: 'Pack container unit' },
        { id: 10, unitId: 'UNT-010', name: 'Carton', code: 'ctn', description: 'Carton container unit' }
      ];
      localStorage.setItem('sales_measurement_units', JSON.stringify(mockUnits));
    }

    // Initialize Suppliers
    if (!localStorage.getItem(this.SUPPLIERS_KEY)) {
      const mockSuppliers: Supplier[] = [
        { id: 1, supplierId: 'SUP-001', name: 'Supplier A', email: 'supplierA@test.com', phone: '+234 801 111 2222', address: '12 Industrial Way, Lagos', contactPerson: 'John Doe' },
        { id: 2, supplierId: 'SUP-002', name: 'Supplier B', email: 'supplierB@test.com', phone: '+234 802 333 4444', address: '34 Commercial Ave, Abuja', contactPerson: 'Jane Smith' },
        { id: 3, supplierId: 'SUP-003', name: 'Supplier C', email: 'supplierC@test.com', phone: '+234 803 555 6666', address: '56 Trade Center, Port Harcourt', contactPerson: 'Robert Johnson' }
      ];
      localStorage.setItem(this.SUPPLIERS_KEY, JSON.stringify(mockSuppliers));
    }

    // Initialize Quotes
    const storedQuotes = localStorage.getItem(this.QUOTES_KEY);
    let quotesCount = 0;
    if (storedQuotes) {
      try {
        quotesCount = JSON.parse(storedQuotes).length;
      } catch (e) {
        quotesCount = 0;
      }
    }

    const getMockCustomer = (custId: string): Customer => {
      const customers: Customer[] = JSON.parse(localStorage.getItem(this.CUSTOMERS_KEY) || '[]');
      return customers.find(c => c.customerId === custId) || {
        id: 1,
        customerId: custId,
        name: custId === 'CUST-001' ? 'Mama Nkechi Enterprises' : 
              custId === 'CUST-002' ? 'Tech Solutions Ltd' :
              custId === 'CUST-003' ? 'Global Services NG' :
              custId === 'CUST-004' ? 'Aliko Dangote Wholesale' :
              custId === 'CUST-005' ? 'Obinna Electronics' : 'Default Customer',
        email: 'default@customer.com',
        phone: '1234567890',
        address: ['Default Address'],
        deliverAddress: ['Default Address'],
        createdBy: 'System',
        createdAt: new Date(),
        totalSpent: 0,
        totalOrders: 0,
        status: 'ACTIVE'
      };
    };

    const mapToQuoteItems = (items: any[]): QuoteItem[] => {
      return items.map((item, idx) => ({
        id: idx + 1,
        productId: item.productId || 'PROD-001',
        productName: item.productName || 'Default Product',
        description: item.description || '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        discount: item.discount || 0,
        taxRate: 7.5,
        amount: (item.quantity || 1) * (item.unitPrice || 0),
        total: item.total || ((item.quantity || 1) * (item.unitPrice || 0))
      }));
    };

    const mapToInvoiceItems = (items: any[]): InvoiceItem[] => {
      return items.map((item, idx) => ({
        id: idx + 1,
        productName: item.productName || 'Default Product',
        description: item.description || '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        discount: item.discount || 0,
        taxRate: 7.5,
        amount: (item.quantity || 1) * (item.unitPrice || 0),
        total: item.total || ((item.quantity || 1) * (item.unitPrice || 0))
      }));
    };

    const getMockPaymentTerms = (term: string, cust: Customer): PaymentTerms => {
      return {
        id: 1,
        customerId: cust,
        customerName: cust,
        paymentPeriod: 30,
        amount: 0,
        balanceDue: 0,
        installmentNumber: 1,
        completedInstallments: 1
      };
    };

    const getMockAdditionalInvoiceOptions = (): AdditionalInvoiceOptions => {
      return {
        signatureText: 'Approved',
        attachments: [{
          id: 1,
          fileName: 'invoice.pdf',
          fileUrl: '',
          uploadedAt: new Date(),
          size: 1024,
          type: 'application/pdf'
        }],
        email: 'billing@customer.com',
        address: 'Default Address',
        phone: '1234567890',
        notes: '',
        terms: ''
      };
    };

    if (!storedQuotes || quotesCount < 10) {
      const q1Cust = getMockCustomer('CUST-001');
      const q2Cust = getMockCustomer('CUST-002');
      const q3Cust = getMockCustomer('CUST-003');
      const q4Cust = getMockCustomer('CUST-004');
      const q5Cust = getMockCustomer('CUST-005');
      const mockQuotes: Quote[] = [
        {
          id: 1, quoteNumber: 'QT-001', customerId: q1Cust, customerName: q1Cust,
          selectedCustomerBank: { bankName: 'Access Bank', accountName: q1Cust.name, accountNumber: '0011223344' },
          merchantDetails: defaultMerchantInfo,
          logoUrl: [],
          items: mapToQuoteItems([
            { productId: 'PROD-001', productName: 'Executive Office Chair', description: 'Ergonomic office chair', quantity: 10, unitPrice: 50000, discount: 0, total: 500000 }
          ]), 
          subtotal: 500000, taxAmount: 0, discountAmount: 0, additionalCharges: [], additionalChargesLabel: [], totalAmount: 500000,
          currency: 'NGN', status: 'ACCEPTED' as QuoteStatus, validUntil: new Date('2026-07-15'),
          createdAt: new Date('2026-06-10'), expiresAt: new Date('2026-07-15'),
          additionalOptions: [{
            signatureText: '',
            attachments: [],
            email: q1Cust.email,
            address: q1Cust.address[0] || '',
            phone: q1Cust.phone,
            notes: 'Delivery within 3 days',
            terms: 'Payment on delivery'
          }],
          createdBy: 'System'
        },
        {
          id: 2, quoteNumber: 'QT-002', customerId: q2Cust, customerName: q2Cust,
          selectedCustomerBank: { bankName: 'Access Bank', accountName: q2Cust.name, accountNumber: '0011223344' },
          merchantDetails: defaultMerchantInfo,
          logoUrl: [],
          items: mapToQuoteItems([
            { productId: 'PROD-003', productName: 'Laptop - Dell XPS', description: 'Dell XPS laptop', quantity: 1, unitPrice: 850000, discount: 0, total: 850000 },
            { productId: 'PROD-002', productName: 'Standing Desk', description: 'Standing desk', quantity: 3, unitPrice: 120000, discount: 10, total: 324000 }
          ]), 
          subtotal: 1174000, taxAmount: 0, discountAmount: 0, additionalCharges: [], additionalChargesLabel: [], totalAmount: 1174000,
          currency: 'NGN', status: 'SENT' as QuoteStatus, validUntil: new Date('2026-07-05'),
          createdAt: new Date('2026-06-09'), expiresAt: new Date('2026-07-05'),
          additionalOptions: [{
            signatureText: '',
            attachments: [],
            email: q2Cust.email,
            address: q2Cust.address[0] || '',
            phone: q2Cust.phone,
            notes: '',
            terms: 'Net 30 days'
          }],
          createdBy: 'System'
        },
        {
          id: 3, quoteNumber: 'QT-003', customerId: q3Cust, customerName: q3Cust,
          selectedCustomerBank: { bankName: 'Access Bank', accountName: q3Cust.name, accountNumber: '0011223344' },
          merchantDetails: defaultMerchantInfo,
          logoUrl: [],
          items: mapToQuoteItems([
            { productId: 'PROD-005', productName: 'Printer - HP LaserJet', description: 'HP LaserJet printer', quantity: 2, unitPrice: 150000, discount: 0, total: 300000 }
          ]), 
          subtotal: 300000, taxAmount: 0, discountAmount: 0, additionalCharges: [], additionalChargesLabel: [], totalAmount: 300000,
          currency: 'NGN', status: 'DRAFT' as QuoteStatus, validUntil: new Date('2026-06-28'),
          createdAt: new Date('2026-06-08'), expiresAt: new Date('2026-06-28'),
          additionalOptions: [{
            signatureText: '',
            attachments: [],
            email: q3Cust.email,
            address: q3Cust.address[0] || '',
            phone: q3Cust.phone,
            notes: '',
            terms: ''
          }],
          createdBy: 'System'
        },
        {
          id: 4, quoteNumber: 'QT-004', customerId: q4Cust, customerName: q4Cust,
          selectedCustomerBank: { bankName: 'Access Bank', accountName: q4Cust.name, accountNumber: '0011223344' },
          merchantDetails: defaultMerchantInfo,
          logoUrl: [],
          items: mapToQuoteItems([
            { productId: 'PROD-001', productName: 'Executive Office Chair', description: 'Office chairs', quantity: 15, unitPrice: 50000, discount: 10, total: 675000 }
          ]), 
          subtotal: 675000, taxAmount: 0, discountAmount: 0, additionalCharges: [], additionalChargesLabel: [], totalAmount: 675000,
          currency: 'NGN', status: 'DECLINED' as QuoteStatus, validUntil: new Date('2026-06-25'),
          createdAt: new Date('2026-06-07'), expiresAt: new Date('2026-06-25'),
          additionalOptions: [{
            signatureText: '',
            attachments: [],
            email: q4Cust.email,
            address: q4Cust.address[0] || '',
            phone: q4Cust.phone,
            notes: '',
            terms: ''
          }],
          createdBy: 'System'
        },
        {
          id: 5, quoteNumber: 'QT-005', customerId: q5Cust, customerName: q5Cust,
          selectedCustomerBank: { bankName: 'Access Bank', accountName: q5Cust.name, accountNumber: '0011223344' },
          merchantDetails: defaultMerchantInfo,
          logoUrl: [],
          items: mapToQuoteItems([
            { productId: 'PROD-005', productName: 'Printer - HP LaserJet', description: 'HP printers', quantity: 1, unitPrice: 150000, discount: 0, total: 150000 }
          ]), 
          subtotal: 150000, taxAmount: 0, discountAmount: 0, additionalCharges: [], additionalChargesLabel: [], totalAmount: 150000,
          currency: 'NGN', status: 'EXPIRED' as QuoteStatus, validUntil: new Date('2026-05-20'),
          createdAt: new Date('2026-05-20'), expiresAt: new Date('2026-06-01'),
          additionalOptions: [{
            signatureText: '',
            attachments: [],
            email: q5Cust.email,
            address: q5Cust.address[0] || '',
            phone: q5Cust.phone,
            notes: '',
            terms: ''
          }],
          createdBy: 'System'
        },
        {
          id: 6, quoteNumber: 'QT-006', customerId: q1Cust, customerName: q1Cust,
          selectedCustomerBank: { bankName: 'Access Bank', accountName: q1Cust.name, accountNumber: '0011223344' },
          merchantDetails: defaultMerchantInfo,
          logoUrl: [],
          items: mapToQuoteItems([
            { productId: 'PROD-003', productName: 'Laptop - Dell XPS', description: 'Dell XPS 13 laptop', quantity: 2, unitPrice: 850000, discount: 5, total: 1615000 }
          ]), 
          subtotal: 1615000, taxAmount: 0, discountAmount: 0, additionalCharges: [], additionalChargesLabel: [], totalAmount: 1615000,
          currency: 'NGN', status: 'CONVERTED' as QuoteStatus, validUntil: new Date('2026-06-20'),
          createdAt: new Date('2026-05-25'), expiresAt: new Date('2026-06-20'),
          additionalOptions: [{
            signatureText: '',
            attachments: [],
            email: q1Cust.email,
            address: q1Cust.address[0] || '',
            phone: q1Cust.phone,
            notes: '',
            terms: ''
          }],
          createdBy: 'System'
        },
        {
          id: 7, quoteNumber: 'QT-007', customerId: q2Cust, customerName: q2Cust,
          selectedCustomerBank: { bankName: 'Access Bank', accountName: q2Cust.name, accountNumber: '0011223344' },
          merchantDetails: defaultMerchantInfo,
          logoUrl: [],
          items: mapToQuoteItems([
            { productId: 'PROD-002', productName: 'Standing Desk', description: 'Adjustable standing desk', quantity: 7, unitPrice: 120000, discount: 0, total: 840000 }
          ]), 
          subtotal: 840000, taxAmount: 0, discountAmount: 0, additionalCharges: [], additionalChargesLabel: [], totalAmount: 840000,
          currency: 'NGN', status: 'SENT' as QuoteStatus, validUntil: new Date('2026-07-10'),
          createdAt: new Date('2026-06-11'), expiresAt: new Date('2026-07-10'),
          additionalOptions: [{
            signatureText: '',
            attachments: [],
            email: q2Cust.email,
            address: q2Cust.address[0] || '',
            phone: q2Cust.phone,
            notes: '',
            terms: 'Net 30 days'
          }],
          createdBy: 'System'
        },
        {
          id: 8, quoteNumber: 'QT-008', customerId: q3Cust, customerName: q3Cust,
          selectedCustomerBank: { bankName: 'Access Bank', accountName: q3Cust.name, accountNumber: '0011223344' },
          merchantDetails: defaultMerchantInfo,
          logoUrl: [],
          items: mapToQuoteItems([
            { productId: 'PROD-001', productName: 'Executive Office Chair', description: 'Office chairs', quantity: 8, unitPrice: 50000, discount: 0, total: 400000 }
          ]), 
          subtotal: 400000, taxAmount: 0, discountAmount: 0, additionalCharges: [], additionalChargesLabel: [], totalAmount: 400000,
          currency: 'NGN', status: 'ACCEPTED' as QuoteStatus, validUntil: new Date('2026-07-12'),
          createdAt: new Date('2026-06-12'), expiresAt: new Date('2026-07-12'),
          additionalOptions: [{
            signatureText: '',
            attachments: [],
            email: q3Cust.email,
            address: q3Cust.address[0] || '',
            phone: q3Cust.phone,
            notes: '',
            terms: ''
          }],
          createdBy: 'System'
        },
        {
          id: 9, quoteNumber: 'QT-009', customerId: q4Cust, customerName: q4Cust,
          selectedCustomerBank: { bankName: 'Access Bank', accountName: q4Cust.name, accountNumber: '0011223344' },
          merchantDetails: defaultMerchantInfo,
          logoUrl: [],
          items: mapToQuoteItems([
            { productId: 'PROD-004', productName: 'Conference Table', description: 'Large conference table', quantity: 2, unitPrice: 250000, discount: 0, total: 500000 }
          ]), 
          subtotal: 500000, taxAmount: 0, discountAmount: 0, additionalCharges: [], additionalChargesLabel: [], totalAmount: 500000,
          currency: 'NGN', status: 'DRAFT' as QuoteStatus, validUntil: new Date('2026-07-20'),
          createdAt: new Date('2026-06-13'), expiresAt: new Date('2026-07-20'),
          additionalOptions: [{
            signatureText: '',
            attachments: [],
            email: q4Cust.email,
            address: q4Cust.address[0] || '',
            phone: q4Cust.phone,
            notes: '',
            terms: ''
          }],
          createdBy: 'System'
        },
        {
          id: 10, quoteNumber: 'QT-010', customerId: q5Cust, customerName: q5Cust,
          selectedCustomerBank: { bankName: 'Access Bank', accountName: q5Cust.name, accountNumber: '0011223344' },
          merchantDetails: defaultMerchantInfo,
          logoUrl: [],
          items: mapToQuoteItems([
            { productId: 'PROD-003', productName: 'Laptop - Dell XPS', description: 'Laptop', quantity: 1, unitPrice: 850000, discount: 0, total: 850000 }
          ]), 
          subtotal: 850000, taxAmount: 0, discountAmount: 0, additionalCharges: [], additionalChargesLabel: [], totalAmount: 850000,
          currency: 'NGN', status: 'CONVERTED' as QuoteStatus, validUntil: new Date('2026-06-30'),
          createdAt: new Date('2026-06-05'), expiresAt: new Date('2026-06-30'),
          additionalOptions: [{
            signatureText: '',
            attachments: [],
            email: q5Cust.email,
            address: q5Cust.address[0] || '',
            phone: q5Cust.phone,
            notes: '',
            terms: ''
          }],
          createdBy: 'System'
        }
      ];
      localStorage.setItem(this.QUOTES_KEY, JSON.stringify(mockQuotes));
    }

    // Initialize Invoices
    if (!localStorage.getItem(this.INVOICES_KEY)) {
      const q1Cust = getMockCustomer('CUST-001');
      const q2Cust = getMockCustomer('CUST-002');
      const q3Cust = getMockCustomer('CUST-003');
      const mockInvoices: any[] = [
        {
          id: '1', invoiceNumber: 'INV-001', orderId: 'ORD-001', customerId: q1Cust, customerName: q1Cust,
          items: mapToInvoiceItems([
            { productName: 'Executive Office Chair', description: 'Office chairs', quantity: 10, unitPrice: 50000, total: 500000 }
          ]),
          subtotal: 500000, taxAmount: 0, discountAmount: 0, totalAmount: 500000, amountPaid: 500000, balanceDue: 0,
          currency: 'NGN', status: 'SENT' as InvoiceStatus, issueDate: new Date('2026-06-10'), dueDate: new Date('2026-06-20'), paidAt: new Date('2026-06-15'), notes: '', 
          paymentTerms: getMockPaymentTerms('Net 30', q1Cust),
          additionalOptions: getMockAdditionalInvoiceOptions()
        },
        {
          id: '2', invoiceNumber: 'INV-002', orderId: 'ORD-002', customerId: q2Cust, customerName: q2Cust,
          items: mapToInvoiceItems([
            { productName: 'Laptop - Dell XPS', description: 'Laptops', quantity: 1, unitPrice: 850000, total: 850000 }
          ]),
          subtotal: 850000, taxAmount: 0, discountAmount: 0, totalAmount: 850000, amountPaid: 0, balanceDue: 850000,
          currency: 'NGN', status: 'SENT' as InvoiceStatus, issueDate: new Date('2026-06-09'), dueDate: new Date('2026-06-25'), notes: '', 
          paymentTerms: getMockPaymentTerms('Net 30', q2Cust),
          additionalOptions: getMockAdditionalInvoiceOptions()
        },
        {
          id: '3', invoiceNumber: 'INV-003', orderId: 'ORD-003', customerId: q3Cust, customerName: q3Cust,
          items: mapToInvoiceItems([
            { productName: 'Printer - HP LaserJet', description: 'HP LaserJet printer', quantity: 2, unitPrice: 150000, total: 300000 }
          ]),
          subtotal: 300000, taxAmount: 0, discountAmount: 0, totalAmount: 300000, amountPaid: 100000, balanceDue: 200000,
          currency: 'NGN', status: 'SENT' as InvoiceStatus, issueDate: new Date('2026-06-08'), dueDate: new Date('2026-07-28'), notes: '', 
          paymentTerms: getMockPaymentTerms('Net 30', q3Cust),
          additionalOptions: getMockAdditionalInvoiceOptions()
        }
      ];
      localStorage.setItem(this.INVOICES_KEY, JSON.stringify(mockInvoices));
    }

    // Initialize Transactions (SalesandTransactions)
    if (!localStorage.getItem(this.TRANSACTIONS_KEY)) {
      const q1Cust = getMockCustomer('CUST-001');
      const q2Cust = getMockCustomer('CUST-002');
      const q3Cust = getMockCustomer('CUST-003');
      const q4Cust = getMockCustomer('CUST-004');
      const q5Cust = getMockCustomer('CUST-005');

      const quotes: Quote[] = JSON.parse(localStorage.getItem(this.QUOTES_KEY) || '[]');
      const invoices: Invoice[] = JSON.parse(localStorage.getItem(this.INVOICES_KEY) || '[]');

      const mockTransactions: SalesandTransactions[] = [
        {
          id: 1,
          orderId: 'SO-001',
          quoteId: quotes.find(q => q.quoteNumber === 'QT-008') || quotes[0],
          paymentNumber: 'PAY-001',
          invoiceId: invoices.find(i => i.invoiceNumber === 'INV-001') || invoices[0],
          customerId: q1Cust,
          customerName: q1Cust,
          items: quotes.find(q => q.quoteNumber === 'QT-008') || quotes[0],
          subtotal: 500000,
          taxAmount: 37500,
          discountAmount: 0,
          additionalCharges: [],
          additionalChargesLabel: [],
          totalAmount: 537500,
          currency: 'NGN',
          status: 'DELIVERED',
          orderDate: new Date('2026-06-10'),
          expectedDeliveryDate: new Date('2026-06-20'),
          actualDeliveryDate: new Date('2026-06-18'),
          quoteSentDate: new Date('2026-06-01'),
          quoteAcceptedOrRejectedDate: new Date('2026-06-05'),
          quoteConvertedDate: new Date('2026-06-08'),
          invoiceSentDate: new Date('2026-06-10'),
          customerNotes: 'Deliver to warehouse A',
          billingAddress: Array.isArray(q1Cust.address) ? q1Cust.address.join(', ') : q1Cust.address,
          paidAmount: 500000,
          paymentMethod: 'BANK_TRANSFER',
          PaymentMode: 'ONE-OFF',
          PaymentTerms: getMockPaymentTerms('Net 30', q1Cust),
          balanceDue: 0,
          installmentNumber: 1,
          completedInstallments: 1,
          reference: 'TXN-BANK-1002381',
          transactionNotes: 'Invoice INV-001 fully paid',
          deliveryNumber: 'DEL-001',
          shippingAddress: 'Lagos, Nigeria',
          carrier: 'DHL',
          trackingNumber: 'DHL-10012',
          dispatchedAt: new Date('2026-06-12'),
          deliveredAt: new Date('2026-06-18'),
          returnedAt: new Date(0),
          signature: 'M. Nkechi'
        },
        {
          id: 2,
          orderId: 'SO-002',
          quoteId: quotes.find(q => q.quoteNumber === 'QT-002') || quotes[0],
          paymentNumber: 'PAY-002',
          invoiceId: invoices.find(i => i.invoiceNumber === 'INV-002') || invoices[0],
          customerId: q2Cust,
          customerName: q2Cust,
          items: quotes.find(q => q.quoteNumber === 'QT-002') || quotes[0],
          subtotal: 850000,
          taxAmount: 63750,
          discountAmount: 0,
          additionalCharges: [],
          additionalChargesLabel: [],
          totalAmount: 913750,
          currency: 'NGN',
          status: 'DISPATCHED',
          orderDate: new Date('2026-06-09'),
          expectedDeliveryDate: new Date('2026-06-25'),
          actualDeliveryDate: new Date(0),
          quoteSentDate: new Date('2026-06-02'),
          quoteAcceptedOrRejectedDate: new Date('2026-06-06'),
          quoteConvertedDate: new Date('2026-06-09'),
          invoiceSentDate: new Date('2026-06-09'),
          customerNotes: '',
          billingAddress: Array.isArray(q2Cust.address) ? q2Cust.address.join(', ') : q2Cust.address,
          paidAmount: 0,
          paymentMethod: 'CARD',
          PaymentMode: 'ONE-OFF',
          PaymentTerms: getMockPaymentTerms('Net 30', q2Cust),
          balanceDue: 913750,
          installmentNumber: 1,
          completedInstallments: 0,
          reference: 'TXN-CARD-4482010',
          transactionNotes: 'Transaction declined by bank gateway',
          deliveryNumber: 'DEL-002',
          shippingAddress: 'Abuja, Nigeria',
          carrier: 'FedEx',
          trackingNumber: 'FDX-88201',
          dispatchedAt: new Date('2026-06-15'),
          deliveredAt: new Date(0),
          returnedAt: new Date(0),
          signature: ''
        },
        {
          id: 3,
          orderId: 'SO-003',
          quoteId: quotes.find(q => q.quoteNumber === 'QT-003') || quotes[0],
          paymentNumber: 'PAY-003',
          invoiceId: invoices.find(i => i.invoiceNumber === 'INV-003') || invoices[0],
          customerId: q3Cust,
          customerName: q3Cust,
          items: quotes.find(q => q.quoteNumber === 'QT-003') || quotes[0],
          subtotal: 300000,
          taxAmount: 22500,
          discountAmount: 0,
          additionalCharges: [],
          additionalChargesLabel: [],
          totalAmount: 322500,
          currency: 'NGN',
          status: 'DELIVERY_PENDING',
          orderDate: new Date('2026-06-08'),
          expectedDeliveryDate: new Date('2026-06-28'),
          actualDeliveryDate: new Date(0),
          quoteSentDate: new Date('2026-06-03'),
          quoteAcceptedOrRejectedDate: new Date('2026-06-07'),
          quoteConvertedDate: new Date('2026-06-08'),
          invoiceSentDate: new Date('2026-06-08'),
          customerNotes: '',
          billingAddress: Array.isArray(q3Cust.address) ? q3Cust.address.join(', ') : q3Cust.address,
          paidAmount: 100000,
          paymentMethod: 'CASH',
          PaymentMode: 'ONE-OFF',
          PaymentTerms: getMockPaymentTerms('Net 30', q3Cust),
          balanceDue: 222500,
          installmentNumber: 1,
          completedInstallments: 0,
          reference: 'TXN-CASH-8837190',
          transactionNotes: 'Partial payment on receipt',
          deliveryNumber: 'DEL-003',
          shippingAddress: 'Port Harcourt, Nigeria',
          carrier: 'UPS',
          trackingNumber: 'UPS-33921',
          dispatchedAt: new Date(0),
          deliveredAt: new Date(0),
          returnedAt: new Date(0),
          signature: ''
        }
      ];
      localStorage.setItem(this.TRANSACTIONS_KEY, JSON.stringify(mockTransactions));
    }
  }

  // ============================================
  // DASHBOARD
  // ============================================

  getDashboardStats(range: string): Observable<SalesSummary> {
    const quotes: Quote[] = JSON.parse(localStorage.getItem(this.QUOTES_KEY) || '[]');
    const invoices: Invoice[] = JSON.parse(localStorage.getItem(this.INVOICES_KEY) || '[]');
    const customers = JSON.parse(localStorage.getItem(this.CUSTOMERS_KEY) || '[]');

    const totalRevenue = invoices.filter(i => i.status === 'SENT').reduce((sum, i) => sum + i.totalAmount, 0);

    return of({
      totalRevenue: totalRevenue || 2845000,
      totalQuotes: quotes.length,
      pendingQuotes: quotes.filter(q => q.status === 'SENT' || q.status === 'DRAFT').length,
      acceptedQuotes: quotes.filter(q => q.status === 'ACCEPTED' || q.status === 'CONVERTED').length,
      totalInvoices: invoices.length,
      paidInvoices: 0,
      overdueInvoices: 0,
      totalCustomers: customers.length
    }).pipe(delay(300));
  }

  getRecentQuotes(limit: number): Observable<Quote[]> {
    let quotes: Quote[] = JSON.parse(localStorage.getItem(this.QUOTES_KEY) || '[]');
    quotes = quotes.map(q => ({
      ...q,
      createdAt: new Date(q.createdAt),
      validUntil: new Date(q.validUntil)
    }));
    return of(quotes.slice(0, limit)).pipe(delay(300));
  }

  getRecentInvoices(limit: number): Observable<Invoice[]> {
    let invoices: Invoice[] = JSON.parse(localStorage.getItem(this.INVOICES_KEY) || '[]');
    invoices = invoices.map(i => ({
      ...i,
      issueDate: new Date(i.issueDate),
      dueDate: new Date(i.dueDate)
    }));
    return of(invoices.slice(0, limit)).pipe(delay(300));
  }

  getTopProducts(limit: number): Observable<TopProduct[]> {
    const products: Product[] = JSON.parse(localStorage.getItem(this.PRODUCTS_KEY) || '[]');
    const getProductMock = (idNum: number, fallbackName: string): Product => {
      return products.find(p => p.id === idNum) || {
        id: idNum,
        productId: `PROD-00${idNum}`,
        name: fallbackName,
        sku: '',
        description: '',
        partNumber: '',
        code: '',
        reorderThreshold: 0,
        weight: 0,
        unitPrice: 0,
        costPrice: 0,
        sellingPrice: 0,
        noOfTimesSoldPerMonth: 0,
        currency: 'NGN',
        stockQuantity: 0,
        expiryDate: new Date(),
        discount: 0,
        supplier: { id: 1, supplierId: 'SUP-001', name: 'Default Supplier' },
        category: { id: 1, categoryId: 'CAT-001', name: 'Electronics' },
        stockMovement: { id: 1, movementDate: new Date(), movementQuantity: 0 },
        taxRate: 7.5,
        images: [],
        status: 'ACTIVE'
      };
    };
    return of([
      { productId: getProductMock(1, 'Executive Office Chair'), productName: getProductMock(1, 'Executive Office Chair'), quantitySold: 45, month: 'June', revenue: 2250000 },
      { productId: getProductMock(2, 'Standing Desk'), productName: getProductMock(2, 'Standing Desk'), quantitySold: 28, month: 'June', revenue: 1400000 },
      { productId: getProductMock(3, 'Laptop - Dell XPS'), productName: getProductMock(3, 'Laptop - Dell XPS'), quantitySold: 12, month: 'June', revenue: 1800000 },
      { productId: getProductMock(4, 'Conference Table'), productName: getProductMock(4, 'Conference Table'), quantitySold: 8, month: 'June', revenue: 1200000 },
      { productId: getProductMock(5, 'Printer - HP LaserJet'), productName: getProductMock(5, 'Printer - HP LaserJet'), quantitySold: 15, month: 'June', revenue: 750000 }
    ].slice(0, limit)).pipe(delay(300));
  }

  getRevenueChart(range: string): Observable<RevenueChartData[]> {
    return of([
      { month: 'Jan', amount: 450000 },
      { month: 'Feb', amount: 520000 },
      { month: 'Mar', amount: 480000 },
      { month: 'Apr', amount: 610000 },
      { month: 'May', amount: 580000 },
      { month: 'Jun', amount: 2845000 }
    ]).pipe(delay(300));
  }

  // ============================================
  // QUOTES
  // ============================================

  getQuotes(filters: any): Observable<{ data: Quote[]; total: number }> {
    let quotes: Quote[] = JSON.parse(localStorage.getItem(this.QUOTES_KEY) || '[]');
    
    quotes = quotes.map(q => ({
      ...q,
      createdAt: new Date(q.createdAt),
      validUntil: new Date(q.validUntil),
      expiresAt: q.expiresAt ? new Date(q.expiresAt) : new Date(q.validUntil)
    }));

    if (filters && filters.status && filters.status !== 'ALL') {
      quotes = quotes.filter(q => q.status === filters.status);
    }

    if (filters && filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      quotes = quotes.filter(q => 
        q.quoteNumber.toLowerCase().includes(term) || 
        (q.customerName.name || '').toLowerCase().includes(term)
      );
    }

    const total = quotes.length;
    const page = filters?.page || 0;
    const size = filters?.size || 10;
    const paginatedData = quotes.slice(page * size, (page + 1) * size);

    return of({ data: paginatedData, total }).pipe(delay(300));
  }

  getQuoteById(id: string | number): Observable<Quote | null> {
    const quotes: Quote[] = JSON.parse(localStorage.getItem(this.QUOTES_KEY) || '[]');
    const quote = quotes.find(q => String(q.id) === String(id));
    if (quote) {
      return of({
        ...quote,
        createdAt: new Date(quote.createdAt),
        validUntil: new Date(quote.validUntil),
        expiresAt: quote.expiresAt ? new Date(quote.expiresAt) : new Date(quote.validUntil)
      }).pipe(delay(300));
    }
    return of(null).pipe(delay(300));
  }

  createQuote(data: Partial<Quote>): Observable<Quote> {
    const quotes: Quote[] = JSON.parse(localStorage.getItem(this.QUOTES_KEY) || '[]');
    const maxId = quotes.reduce((max: number, q: any) => Math.max(max, Number(q.id) || 0), 0);
    
    const getMockCustomer = (custId: string): Customer => {
      const customers: Customer[] = JSON.parse(localStorage.getItem(this.CUSTOMERS_KEY) || '[]');
      return customers.find(c => c.customerId === custId) || {
        id: 1,
        customerId: custId,
        name: 'Default Customer',
        email: 'default@customer.com',
        phone: '1234567890',
        address: ['Default Address'],
        deliverAddress: ['Default Address'],
        createdBy: 'System',
        createdAt: new Date(),
        totalSpent: 0,
        totalOrders: 0,
        status: 'ACTIVE'
      };
    };

    const newQuote: Quote = {
      id: maxId + 1,
      quoteNumber: `QT-${String(maxId + 1).padStart(3, '0')}`,
      customerId: data.customerId || getMockCustomer(''),
      customerName: data.customerName || getMockCustomer(''),
      selectedCustomerBank: data.selectedCustomerBank || { bankName: 'Default Bank', accountName: 'Default Account', accountNumber: '0000000000' },
      merchantDetails: data.merchantDetails || defaultMerchantInfo,
      logoUrl: data.logoUrl || [],
      items: data.items || [],
      subtotal: data.subtotal || 0,
      taxAmount: data.taxAmount || 0,
      discountAmount: data.discountAmount || 0,
      additionalCharges: Array.isArray(data.additionalCharges) ? data.additionalCharges : [],
      additionalChargesLabel: Array.isArray(data.additionalChargesLabel) ? data.additionalChargesLabel : [],
      totalAmount: data.totalAmount || 0,
      currency: data.currency || 'NGN',
      status: data.status || 'DRAFT',
      validUntil: data.validUntil || new Date(),
      createdAt: data.createdAt || new Date(),
      expiresAt: data.expiresAt || new Date(),
      additionalOptions: Array.isArray(data.additionalOptions) ? data.additionalOptions : (data.additionalOptions ? [data.additionalOptions as any] : []),
      createdBy: 'System'
    };

    quotes.unshift(newQuote);
    localStorage.setItem(this.QUOTES_KEY, JSON.stringify(quotes));

    // Auto-create initial sales invoice record so the new quote appears immediately in Sales & Transactions tab
    try {
      const invoices: Invoice[] = JSON.parse(localStorage.getItem(this.INVOICES_KEY) || '[]');
      const autoInvoice: any = {
        id: invoices.length + 1,
        invoiceNumber: `INV-${String(invoices.length + 1).padStart(3, '0')}`,
        orderId: `ORD-${newQuote.id}`,
        quoteId: String(newQuote.id),
        customerId: newQuote.customerId,
        customerName: newQuote.customerName,
        items: newQuote.items.map((item, idx) => ({
          id: idx + 1,
          productName: item.productName,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          taxRate: item.taxRate,
          amount: item.amount,
          total: item.total
        })),
        subtotal: newQuote.subtotal,
        taxAmount: newQuote.taxAmount,
        discountAmount: newQuote.discountAmount,
        totalAmount: newQuote.totalAmount,
        amountPaid: 0,
        balanceDue: newQuote.totalAmount,
        currency: newQuote.currency,
        status: 'DRAFT',
        issueDate: newQuote.createdAt,
        dueDate: newQuote.validUntil,
        paymentTerms: [{
          id: 1,
          customerId: newQuote.customerId,
          customerName: newQuote.customerName,
          paymentPeriod: 30,
          amount: 0,
          balanceDue: 0,
          installmentNumber: 1,
          completedInstallments: 1
        }],
        additionalOptions: [{
          signatureText: '',
          attachments: [],
          email: '',
          address: '',
          phone: '',
          notes: '',
          terms: ''
        }]
      };
      invoices.unshift(autoInvoice);
      localStorage.setItem(this.INVOICES_KEY, JSON.stringify(invoices));
    } catch (e) {
      console.error('Error auto-creating invoice for quote:', e);
    }

    return of(newQuote).pipe(delay(300));
  }

  updateQuote(id: string | number, data: Partial<Quote>): Observable<Quote> {
    let quotes: Quote[] = JSON.parse(localStorage.getItem(this.QUOTES_KEY) || '[]');
    const index = quotes.findIndex(q => String(q.id) === String(id));
    
    if (index !== -1) {
      const updatedQuote = {
        ...quotes[index],
        ...data,
        id: quotes[index].id,
        quoteNumber: quotes[index].quoteNumber
      } as Quote;
      
      quotes[index] = updatedQuote;
      localStorage.setItem(this.QUOTES_KEY, JSON.stringify(quotes));
      return of(updatedQuote).pipe(delay(300));
    }
    
    throw new Error('Quote not found');
  }

  deleteQuote(id: string | number): Observable<boolean> {
    let quotes: Quote[] = JSON.parse(localStorage.getItem(this.QUOTES_KEY) || '[]');
    quotes = quotes.filter(q => String(q.id) !== String(id));
    localStorage.setItem(this.QUOTES_KEY, JSON.stringify(quotes));
    return of(true).pipe(delay(300));
  }

  // ============================================
  // INVOICES
  // ============================================

  getInvoices(filters: any): Observable<{ data: Invoice[]; total: number }> {
    let invoices: Invoice[] = JSON.parse(localStorage.getItem(this.INVOICES_KEY) || '[]');
    invoices = invoices.map(i => {
      let status = i.status;
      if (status !== 'DRAFT' && status !== 'SENT' && status !== 'CANCELLED') {
        status = 'SENT';
      }
      return {
        ...i,
        status,
        issueDate: new Date(i.issueDate),
        dueDate: new Date(i.dueDate),
        paidAt: i.paidAt ? new Date(i.paidAt) : undefined
      };
    });

    if (filters && filters.status && filters.status !== 'ALL') {
      invoices = invoices.filter(i => i.status === filters.status);
    }

    if (filters && filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      invoices = invoices.filter(i => 
        i.invoiceNumber.toLowerCase().includes(term) || 
        (i.customerName.name || '').toLowerCase().includes(term)
      );
    }

    const total = invoices.length;
    const page = filters?.page || 0;
    const size = filters?.size || 10;
    const paginatedData = invoices.slice(page * size, (page + 1) * size);

    return of({ data: paginatedData, total }).pipe(delay(300));
  }

  getInvoiceById(id: string | number): Observable<Invoice | null> {
    const invoices: Invoice[] = JSON.parse(localStorage.getItem(this.INVOICES_KEY) || '[]');
    const invoice = invoices.find(i => String(i.id) === String(id));
    if (invoice) {
      let status = invoice.status;
      if (status !== 'DRAFT' && status !== 'SENT' && status !== 'CANCELLED') {
        status = 'SENT';
      }
      return of({
        ...invoice,
        status,
        issueDate: new Date(invoice.issueDate),
        dueDate: new Date(invoice.dueDate),
        paidAt: invoice.paidAt ? new Date(invoice.paidAt) : undefined
      }).pipe(delay(300));
    }
    return of(null).pipe(delay(300));
  }

  createInvoice(data: Partial<Invoice>): Observable<Invoice> {
    const invoices: Invoice[] = JSON.parse(localStorage.getItem(this.INVOICES_KEY) || '[]');
    const maxId = invoices.reduce((max: number, inv: any) => Math.max(max, Number(inv.id) || 0), 0);

    const getMockCustomer = (custId: string): Customer => {
      const customers: Customer[] = JSON.parse(localStorage.getItem(this.CUSTOMERS_KEY) || '[]');
      return customers.find(c => c.customerId === custId) || {
        id: 1,
        customerId: custId,
        name: 'Default Customer',
        email: 'default@customer.com',
        phone: '1234567890',
        address: ['Default Address'],
        deliverAddress: ['Default Address'],
        createdBy: 'System',
        createdAt: new Date(),
        totalSpent: 0,
        totalOrders: 0,
        status: 'ACTIVE'
      };
    };

    const newInvoice: any = {
      id: maxId + 1,
      invoiceNumber: `INV-${String(maxId + 1).padStart(3, '0')}`,
      orderId: data.orderId || '',
      quoteId: data.quoteId,
      customerId: data.customerId || getMockCustomer(''),
      customerName: data.customerName || getMockCustomer(''),
      logoUrl: data.logoUrl,
      selectedCustomerBank: data.selectedCustomerBank,
      merchantDetails: data.merchantDetails || defaultMerchantInfo,
      items: data.items || [],
      subtotal: data.subtotal || 0,
      taxAmount: data.taxAmount || 0,
      discountAmount: data.discountAmount || 0,
      additionalCharges: Array.isArray(data.additionalCharges) ? data.additionalCharges : [],
      additionalChargesLabel: Array.isArray(data.additionalChargesLabel) ? data.additionalChargesLabel : [],
      totalAmount: data.totalAmount || 0,
      amountPaid: (data as any).amountPaid || 0,
      balanceDue: (data as any).balanceDue || (data.totalAmount || 0),
      currency: data.currency || 'NGN',
      status: data.status || 'DRAFT',
      issueDate: data.issueDate || new Date(),
      dueDate: data.dueDate || new Date(),
      paidAt: data.paidAt,
      notes: data.notes || '',
      shippingAddress: data.shippingAddress,
      paymentTerms: Array.isArray(data.paymentTerms) ? data.paymentTerms : [(data.paymentTerms || {
        id: 1,
        customerId: data.customerId || getMockCustomer(''),
        customerName: data.customerName || getMockCustomer(''),
        paymentPeriod: 30,
        amount: data.totalAmount || 0,
        balanceDue: data.totalAmount || 0,
        installmentNumber: 1,
        completedInstallments: 1
      })],
      additionalOptions: Array.isArray(data.additionalOptions) ? data.additionalOptions : [(data.additionalOptions || {
        signatureText: '',
        attachments: [],
        email: '',
        address: '',
        phone: '',
        notes: '',
        terms: ''
      })]
    };
    if (!newInvoice.orderId) {
      this.decreaseProductStock(newInvoice.items);
    }
    invoices.push(newInvoice);
    localStorage.setItem(this.INVOICES_KEY, JSON.stringify(invoices));
    return of(newInvoice as Invoice).pipe(delay(300));
  }

  updateInvoice(id: string | number, data: Partial<Invoice>): Observable<Invoice> {
    let invoices: Invoice[] = JSON.parse(localStorage.getItem(this.INVOICES_KEY) || '[]');
    const index = invoices.findIndex(i => String(i.id) === String(id));
    
    if (index !== -1) {
      const updatedInvoice = {
        ...invoices[index],
        ...data,
        id: invoices[index].id,
        invoiceNumber: invoices[index].invoiceNumber
      } as Invoice;
      
      invoices[index] = updatedInvoice;
      localStorage.setItem(this.INVOICES_KEY, JSON.stringify(invoices));
      return of(updatedInvoice).pipe(delay(300));
    }
    
    throw new Error('Invoice not found');
  }

  deleteInvoice(id: string | number): Observable<boolean> {
    let invoices: Invoice[] = JSON.parse(localStorage.getItem(this.INVOICES_KEY) || '[]');
    invoices = invoices.filter(i => String(i.id) !== String(id));
    localStorage.setItem(this.INVOICES_KEY, JSON.stringify(invoices));
    return of(true).pipe(delay(300));
  }

  // ============================================
  // CUSTOMERS
  // ============================================

  getCustomers(filters: any): Observable<{ data: Customer[]; total: number }> {
    const customers = JSON.parse(localStorage.getItem(this.CUSTOMERS_KEY) || '[]');
    let filtered = customers;

    if (filters && filters.status && filters.status !== 'ALL') {
      filtered = filtered.filter((c: any) => c.status === filters.status);
    }

    if (filters && filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter((c: any) => 
        c.name.toLowerCase().includes(term) || 
        c.email.toLowerCase().includes(term) ||
        c.phone.toLowerCase().includes(term)
      );
    }

    return of({ data: filtered, total: filtered.length }).pipe(delay(300));
  }

  getCustomerById(id: string): Observable<Customer | null> {
    const customers = JSON.parse(localStorage.getItem(this.CUSTOMERS_KEY) || '[]');
    const customer = customers.find((c: any) => c.customerId === id || String(c.id) === id);
    return of(customer || null).pipe(delay(300));
  }

  createCustomer(data: Partial<Customer>): Observable<Customer> {
    const customers = JSON.parse(localStorage.getItem(this.CUSTOMERS_KEY) || '[]');
    const maxId = customers.reduce((max: number, c: any) => Math.max(max, Number(c.id) || 0), 0);
    const newCustomer = {
      id: maxId + 1,
      customerId: `CUST-${String(maxId + 1).padStart(3, '0')}`,
      ...data,
      createdAt: new Date(),
      totalSpent: 0,
      totalOrders: 0
    } as Customer;
    customers.push(newCustomer);
    localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify(customers));
    return of(newCustomer).pipe(delay(300));
  }

  updateCustomer(id: string, data: Partial<Customer>): Observable<Customer> {
    let customers: Customer[] = JSON.parse(localStorage.getItem(this.CUSTOMERS_KEY) || '[]');
    const index = customers.findIndex((c: any) => c.customerId === id || String(c.id) === id);
    
    if (index !== -1) {
      const updatedCustomer = {
        ...customers[index],
        ...data,
        id: customers[index].id
      } as Customer;
      
      customers[index] = updatedCustomer;
      localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify(customers));
      return of(updatedCustomer).pipe(delay(300));
    }
    
    throw new Error('Customer not found');
  }

  deleteCustomer(id: string | number): Observable<boolean> {
    let customers: Customer[] = JSON.parse(localStorage.getItem(this.CUSTOMERS_KEY) || '[]');
    const idStr = String(id);
    customers = customers.filter((c: any) => c.customerId !== idStr && String(c.id) !== idStr);
    localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify(customers));
    return of(true).pipe(delay(300));
  }

  // ============================================
  // PRODUCTS
  // ============================================

  getProducts(filters: any): Observable<{ data: Product[]; total: number }> {
    const products = JSON.parse(localStorage.getItem(this.PRODUCTS_KEY) || '[]');
    let filtered = products;
    
    if (filters?.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter((p: any) => 
        p.name.toLowerCase().includes(term) || 
        p.sku.toLowerCase().includes(term)
      );
    }

    if (filters?.status && filters.status !== 'ALL') {
      filtered = filtered.filter((p: any) => p.status === filters.status);
    }

    if (filters?.category && filters.category !== 'ALL') {
      filtered = filtered.filter((p: any) => p.category === filters.category);
    }

    if (filters?.minPrice !== undefined && filters?.minPrice !== null && filters?.minPrice !== '') {
      filtered = filtered.filter((p: any) => p.unitPrice >= Number(filters.minPrice));
    }

    if (filters?.maxPrice !== undefined && filters?.maxPrice !== null && filters?.maxPrice !== '') {
      filtered = filtered.filter((p: any) => p.unitPrice <= Number(filters.maxPrice));
    }
    
    return of({ data: filtered, total: filtered.length }).pipe(delay(300));
  }

  getCategories(): Observable<Category[]> {
    const categories = JSON.parse(localStorage.getItem(this.CATEGORIES_KEY) || '[]');
    return of(categories).pipe(delay(200));
  }

  createCategory(catData: Partial<Category>): Observable<Category[]> {
    const categories = JSON.parse(localStorage.getItem(this.CATEGORIES_KEY) || '[]');
    const name = (catData.name || '').trim();
    if (name) {
      const ids = categories.map((c: any) => {
        return Number(c.id) || 0;
      });
      const maxId = ids.length > 0 ? Math.max(...ids) : 0;

      const newCat: Category = {
        id: maxId + 1,
        categoryId: `CAT-${String(maxId + 1).padStart(3, '0')}`,
        name: name,
        description: catData.description || ''
      };
      categories.push(newCat);
      localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(categories));
    }
    return of(categories).pipe(delay(200));
  }

  updateCategory(id: string | number, catData: Partial<Category>): Observable<Category[]> {
    const categories: Category[] = JSON.parse(localStorage.getItem(this.CATEGORIES_KEY) || '[]');
    const idStr = String(id);
    const index = categories.findIndex((c: any) => c.categoryId === idStr || String(c.id) === idStr);
    if (index >= 0) {
      categories[index] = {
        ...categories[index],
        name: (catData.name || categories[index].name).trim(),
        description: catData.description !== undefined ? catData.description : categories[index].description
      };
      localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(categories));
    }
    return of(categories).pipe(delay(200));
  }

  deleteCategory(id: string | number): Observable<Category[]> {
    let categories: Category[] = JSON.parse(localStorage.getItem(this.CATEGORIES_KEY) || '[]');
    const idStr = String(id);
    categories = categories.filter((c: any) => c.categoryId !== idStr && String(c.id) !== idStr);
    localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(categories));
    return of(categories).pipe(delay(200));
  }

  getMeasurementUnits(): Observable<MeasurementUnit[]> {
    const units = JSON.parse(localStorage.getItem('sales_measurement_units') || '[]');
    return of(units).pipe(delay(200));
  }

  createMeasurementUnit(unitData: Partial<MeasurementUnit>): Observable<MeasurementUnit[]> {
    const units = JSON.parse(localStorage.getItem('sales_measurement_units') || '[]');
    const name = (unitData.name || '').trim();
    if (name) {
      const ids = units.map((u: any) => Number(u.id) || 0);
      const maxId = ids.length > 0 ? Math.max(...ids) : 0;
      const newUnit: MeasurementUnit = {
        id: maxId + 1,
        unitId: `UNT-${String(maxId + 1).padStart(3, '0')}`,
        name: name,
        code: unitData.code || '',
        description: unitData.description || ''
      };
      units.push(newUnit);
      localStorage.setItem('sales_measurement_units', JSON.stringify(units));
    }
    return of(units).pipe(delay(200));
  }

  updateMeasurementUnit(id: string | number, unitData: Partial<MeasurementUnit>): Observable<MeasurementUnit[]> {
    const units: MeasurementUnit[] = JSON.parse(localStorage.getItem('sales_measurement_units') || '[]');
    const idStr = String(id);
    const index = units.findIndex((u: any) => u.unitId === idStr || String(u.id) === idStr);
    if (index >= 0) {
      units[index] = {
        ...units[index],
        name: (unitData.name || units[index].name).trim(),
        code: unitData.code !== undefined ? unitData.code : units[index].code,
        description: unitData.description !== undefined ? unitData.description : units[index].description
      };
      localStorage.setItem('sales_measurement_units', JSON.stringify(units));
    }
    return of(units).pipe(delay(200));
  }

  deleteMeasurementUnit(id: string | number): Observable<MeasurementUnit[]> {
    let units: MeasurementUnit[] = JSON.parse(localStorage.getItem('sales_measurement_units') || '[]');
    const idStr = String(id);
    units = units.filter((u: any) => u.unitId !== idStr && String(u.id) !== idStr);
    localStorage.setItem('sales_measurement_units', JSON.stringify(units));
    return of(units).pipe(delay(200));
  }

  getSuppliers(): Observable<Supplier[]> {
    const suppliers = JSON.parse(localStorage.getItem(this.SUPPLIERS_KEY) || '[]');
    return of(suppliers).pipe(delay(200));
  }

  createSupplier(supplierData: Partial<Supplier>): Observable<Supplier[]> {
    const suppliers = JSON.parse(localStorage.getItem(this.SUPPLIERS_KEY) || '[]');
    const name = (supplierData.name || '').trim();
    if (name) {
      const ids = suppliers.map((s: any) => Number(s.id) || 0);
      const maxId = ids.length > 0 ? Math.max(...ids) : 0;
      const newSupplier: Supplier = {
        id: maxId + 1,
        supplierId: `SUP-${String(maxId + 1).padStart(3, '0')}`,
        name: name,
        email: supplierData.email || '',
        phone: supplierData.phone || '',
        address: supplierData.address || '',
        contactPerson: supplierData.contactPerson || ''
      };
      suppliers.push(newSupplier);
      localStorage.setItem(this.SUPPLIERS_KEY, JSON.stringify(suppliers));
    }
    return of(suppliers).pipe(delay(200));
  }

  updateSupplier(id: string | number, supplierData: Partial<Supplier>): Observable<Supplier[]> {
    const suppliers: Supplier[] = JSON.parse(localStorage.getItem(this.SUPPLIERS_KEY) || '[]');
    const idStr = String(id);
    const index = suppliers.findIndex((s: any) => s.supplierId === idStr || String(s.id) === idStr);
    if (index >= 0) {
      suppliers[index] = {
        ...suppliers[index],
        name: (supplierData.name || suppliers[index].name).trim(),
        email: supplierData.email !== undefined ? supplierData.email : suppliers[index].email,
        phone: supplierData.phone !== undefined ? supplierData.phone : suppliers[index].phone,
        address: supplierData.address !== undefined ? supplierData.address : suppliers[index].address,
        contactPerson: supplierData.contactPerson !== undefined ? supplierData.contactPerson : suppliers[index].contactPerson
      };
      localStorage.setItem(this.SUPPLIERS_KEY, JSON.stringify(suppliers));
    }
    return of(suppliers).pipe(delay(200));
  }

  deleteSupplier(id: string | number): Observable<Supplier[]> {
    let suppliers: Supplier[] = JSON.parse(localStorage.getItem(this.SUPPLIERS_KEY) || '[]');
    const idStr = String(id);
    suppliers = suppliers.filter((s: any) => s.supplierId !== idStr && String(s.id) !== idStr);
    localStorage.setItem(this.SUPPLIERS_KEY, JSON.stringify(suppliers));
    return of(suppliers).pipe(delay(200));
  }

  getProductById(id: string): Observable<Product | null> {
    const products = JSON.parse(localStorage.getItem(this.PRODUCTS_KEY) || '[]');
    const product = products.find((p: any) => p.productId === id || String(p.id) === id);
    return of(product || null).pipe(delay(300));
  }

  createProduct(data: Partial<Product>): Observable<Product> {
    const products = JSON.parse(localStorage.getItem(this.PRODUCTS_KEY) || '[]');
    const maxId = products.reduce((max: number, p: any) => Math.max(max, Number(p.id) || 0), 0);
    const newProduct = {
      id: maxId + 1,
      productId: `PROD-${String(maxId + 1).padStart(3, '0')}`,
      ...data
    } as Product;
    products.push(newProduct);
    localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products));
    return of(newProduct).pipe(delay(300));
  }

  updateProduct(id: string, data: Partial<Product>): Observable<Product> {
    let products: Product[] = JSON.parse(localStorage.getItem(this.PRODUCTS_KEY) || '[]');
    const index = products.findIndex((p: any) => p.productId === id || String(p.id) === id);
    
    if (index !== -1) {
      const updatedProduct = {
        ...products[index],
        ...data,
        id: products[index].id
      } as Product;
      
      products[index] = updatedProduct;
      localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products));
      return of(updatedProduct).pipe(delay(300));
    }
    
    throw new Error('Product not found');
  }

  deleteProduct(id: string | number): Observable<boolean> {
    let products: Product[] = JSON.parse(localStorage.getItem(this.PRODUCTS_KEY) || '[]');
    const idStr = String(id);
    products = products.filter((p: any) => p.productId !== idStr && String(p.id) !== idStr);
    localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products));
    return of(true).pipe(delay(300));
  }

  // ============================================
  // SALES AND TRANSACTIONS (Unified Sales Lifecycle & Transaction Store)
  // ============================================

  getSalesandTransactions(filters: any): Observable<{ data: SalesandTransactions[]; total: number }> {
    let txs: SalesandTransactions[] = JSON.parse(localStorage.getItem(this.TRANSACTIONS_KEY) || '[]');
    
    // Map dates back to Date objects
    txs = txs.map(t => ({
      ...t,
      orderDate: new Date(t.orderDate || new Date()),
      expectedDeliveryDate: t.expectedDeliveryDate ? new Date(t.expectedDeliveryDate) : new Date(),
      actualDeliveryDate: t.actualDeliveryDate ? new Date(t.actualDeliveryDate) : new Date(),
      quoteSentDate: t.quoteSentDate ? new Date(t.quoteSentDate) : new Date(),
      quoteAcceptedOrRejectedDate: t.quoteAcceptedOrRejectedDate ? new Date(t.quoteAcceptedOrRejectedDate) : new Date(),
      quoteConvertedDate: t.quoteConvertedDate ? new Date(t.quoteConvertedDate) : new Date(),
      invoiceSentDate: t.invoiceSentDate ? new Date(t.invoiceSentDate) : new Date(),
      invoiceCancelledDate: t.invoiceCancelledDate ? new Date(t.invoiceCancelledDate) : undefined,
      dispatchedAt: t.dispatchedAt ? new Date(t.dispatchedAt) : new Date(),
      deliveredAt: t.deliveredAt ? new Date(t.deliveredAt) : new Date(),
      returnedAt: t.returnedAt ? new Date(t.returnedAt) : new Date()
    }));

    // Apply status filter
    if (filters && filters.status && filters.status !== 'ALL') {
      txs = txs.filter(t => t.status === filters.status);
    }

    // Apply search filter
    if (filters && filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      txs = txs.filter(t => 
        (t.orderId || '').toLowerCase().includes(term) || 
        (t.paymentNumber || '').toLowerCase().includes(term) || 
        (t.customerName?.name || '').toLowerCase().includes(term) ||
        (t.customerId?.customerId || '').toLowerCase().includes(term) ||
        (t.reference || '').toLowerCase().includes(term)
      );
    }

    // Apply date filters
    if (filters && filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      txs = txs.filter(t => t.orderDate && t.orderDate >= from);
    }
    if (filters && filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      txs = txs.filter(t => t.orderDate && t.orderDate <= to);
    }

    // Apply invoice ID filter
    if (filters && filters.invoiceId) {
      txs = txs.filter(t => {
        const invIdStr = typeof t.invoiceId === 'object' ? (t.invoiceId as any)?.id : String(t.invoiceId);
        return invIdStr === String(filters.invoiceId);
      });
    }

    // Apply customer ID filter
    if (filters && filters.customerId) {
      txs = txs.filter(t => t.customerId && (t.customerId.customerId === filters.customerId || String(t.customerId.id) === filters.customerId));
    }

    const total = txs.length;
    const page = filters?.page || 0;
    const size = filters?.size || 10;
    const paginatedData = txs.slice(page * size, (page + 1) * size);

    return of({ data: paginatedData, total }).pipe(delay(300));
  }

  getSalesandTransactionsById(id: string | number): Observable<SalesandTransactions | null> {
    const txs: SalesandTransactions[] = JSON.parse(localStorage.getItem(this.TRANSACTIONS_KEY) || '[]');
    const t = txs.find(o => String(o.id) === String(id) || o.orderId === id || o.paymentNumber === id);
    if (t) {
      return of({
        ...t,
        orderDate: new Date(t.orderDate || new Date()),
        expectedDeliveryDate: t.expectedDeliveryDate ? new Date(t.expectedDeliveryDate) : new Date(),
        actualDeliveryDate: t.actualDeliveryDate ? new Date(t.actualDeliveryDate) : new Date(),
        quoteSentDate: t.quoteSentDate ? new Date(t.quoteSentDate) : new Date(),
        quoteAcceptedOrRejectedDate: t.quoteAcceptedOrRejectedDate ? new Date(t.quoteAcceptedOrRejectedDate) : new Date(),
        quoteConvertedDate: t.quoteConvertedDate ? new Date(t.quoteConvertedDate) : new Date(),
        invoiceSentDate: t.invoiceSentDate ? new Date(t.invoiceSentDate) : new Date(),
        invoiceCancelledDate: t.invoiceCancelledDate ? new Date(t.invoiceCancelledDate) : undefined,
        dispatchedAt: t.dispatchedAt ? new Date(t.dispatchedAt) : new Date(),
        deliveredAt: t.deliveredAt ? new Date(t.deliveredAt) : new Date(),
        returnedAt: t.returnedAt ? new Date(t.returnedAt) : new Date()
      }).pipe(delay(300));
    }
    return of(null).pipe(delay(300));
  }

  private decreaseProductStock(items: any[]): void {
    if (!items || !Array.isArray(items)) return;
    const products = JSON.parse(localStorage.getItem(this.PRODUCTS_KEY) || '[]');
    let changed = false;

    items.forEach((item: any) => {
      const prodId = item.productId;
      const qty = Number(item.quantity) || 0;
      if (prodId && qty > 0) {
        const prodIndex = products.findIndex((p: any) => p.productId === prodId || String(p.id) === String(prodId));
        if (prodIndex !== -1) {
          products[prodIndex].stockQuantity = Math.max(0, (products[prodIndex].stockQuantity || 0) - qty);
          if (products[prodIndex].stockQuantity === 0) {
            products[prodIndex].status = 'OUT_OF_STOCK';
          }
          changed = true;
        }
      }
    });

    if (changed) {
      localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products));
    }
  }

  createSalesandTransactions(data: Partial<SalesandTransactions>): Observable<SalesandTransactions> {
    const txs: SalesandTransactions[] = JSON.parse(localStorage.getItem(this.TRANSACTIONS_KEY) || '[]');
    const nextId = txs.length ? Math.max(...txs.map(t => t.id || 0)) + 1 : 1;
    const newTx: SalesandTransactions = {
      id: nextId,
      orderId: data.orderId || `SO-${String(nextId).padStart(3, '0')}`,
      quoteId: data.quoteId as any,
      paymentNumber: data.paymentNumber || `PAY-${String(nextId).padStart(3, '0')}`,
      invoiceId: data.invoiceId as any,
      customerId: data.customerId as any,
      customerName: data.customerName as any,
      items: data.items as any,
      subtotal: data.subtotal || 0,
      taxAmount: data.taxAmount || 0,
      discountAmount: data.discountAmount || 0,
      additionalCharges: data.additionalCharges || [],
      additionalChargesLabel: data.additionalChargesLabel || [],
      totalAmount: data.totalAmount || 0,
      currency: data.currency || 'NGN',
      status: data.status || 'QUOTE_SENT',
      orderDate: data.orderDate || new Date(),
      expectedDeliveryDate: data.expectedDeliveryDate || new Date(),
      actualDeliveryDate: data.actualDeliveryDate || new Date(0),
      quoteSentDate: data.quoteSentDate || new Date(),
      quoteAcceptedOrRejectedDate: data.quoteAcceptedOrRejectedDate || new Date(0),
      quoteConvertedDate: data.quoteConvertedDate || new Date(0),
      invoiceSentDate: data.invoiceSentDate || new Date(0),
      customerNotes: data.customerNotes || '',
      billingAddress: data.billingAddress || '',
      paidAmount: data.paidAmount || 0,
      paymentMethod: data.paymentMethod || 'BANK_TRANSFER',
      PaymentMode: data.PaymentMode || 'ONE-OFF',
      PaymentTerms: data.PaymentTerms || { id: 1, customerId: data.customerId as any, customerName: data.customerName as any, paymentPeriod: 30, amount: 0, balanceDue: 0, installmentNumber: 1, completedInstallments: 1 },
      balanceDue: data.balanceDue || 0,
      installmentNumber: data.installmentNumber || 1,
      completedInstallments: data.completedInstallments || 0,
      reference: data.reference || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      transactionNotes: data.transactionNotes || '',
      deliveryNumber: data.deliveryNumber || `DEL-${String(nextId).padStart(3, '0')}`,
      shippingAddress: data.shippingAddress || '',
      carrier: data.carrier || '',
      trackingNumber: data.trackingNumber || '',
      dispatchedAt: data.dispatchedAt || new Date(0),
      deliveredAt: data.deliveredAt || new Date(0),
      returnedAt: data.returnedAt || new Date(0),
      signature: data.signature || ''
    };

    const isSale = newTx.status && !['QUOTE_SENT', 'QUOTE_REJECTED', 'INVOICE_CANCELLED', 'PAYMENT_FAILED'].includes(newTx.status);
    if (isSale) {
      const itemsList = newTx.items?.items || [];
      this.decreaseProductStock(itemsList);
    }

    txs.unshift(newTx);
    localStorage.setItem(this.TRANSACTIONS_KEY, JSON.stringify(txs));
    return of(newTx).pipe(delay(300));
  }

  updateSalesandTransactions(id: string | number, data: Partial<SalesandTransactions>): Observable<SalesandTransactions> {
    let txs: SalesandTransactions[] = JSON.parse(localStorage.getItem(this.TRANSACTIONS_KEY) || '[]');
    const index = txs.findIndex(t => String(t.id) === String(id) || t.orderId === id || t.paymentNumber === id);
    
    if (index !== -1) {
      const prevTx = txs[index];
      const updatedTx = {
        ...prevTx,
        ...data,
        id: prevTx.id
      } as SalesandTransactions;
      
      const prevIsSale = prevTx.status && !['QUOTE_SENT', 'QUOTE_REJECTED', 'INVOICE_CANCELLED', 'PAYMENT_FAILED'].includes(prevTx.status);
      const newIsSale = updatedTx.status && !['QUOTE_SENT', 'QUOTE_REJECTED', 'INVOICE_CANCELLED', 'PAYMENT_FAILED'].includes(updatedTx.status);
      if (newIsSale && !prevIsSale) {
        const itemsList = updatedTx.items?.items || [];
        this.decreaseProductStock(itemsList);
      }

      txs[index] = updatedTx;
      localStorage.setItem(this.TRANSACTIONS_KEY, JSON.stringify(txs));

      // Also update corresponding invoice totals if payment status was completed
      if (updatedTx.status === 'PAYMENT_COMPLETED' && updatedTx.invoiceId) {
        const invoices: Invoice[] = JSON.parse(localStorage.getItem(this.INVOICES_KEY) || '[]');
        const invIdStr = typeof updatedTx.invoiceId === 'object' ? (updatedTx.invoiceId as any)?.id : String(updatedTx.invoiceId);
        const invIndex = invoices.findIndex(i => String(i.id) === invIdStr || i.invoiceNumber === invIdStr);
        if (invIndex !== -1) {
          const invoice: any = invoices[invIndex];
          const newAmountPaid = (invoice.amountPaid || 0) + (updatedTx.paidAmount || updatedTx.totalAmount || 0);
          const newBalanceDue = Math.max(0, invoice.totalAmount - newAmountPaid);
          
          invoices[invIndex] = {
            ...invoice,
            amountPaid: newAmountPaid,
            balanceDue: newBalanceDue,
            paidAt: newBalanceDue === 0 ? updatedTx.orderDate : invoice.paidAt
          };
          localStorage.setItem(this.INVOICES_KEY, JSON.stringify(invoices));
        }
      }

      return of(updatedTx).pipe(delay(300));
    }
    
    throw new Error('Transaction not found');
  }

  deleteSalesandTransactions(id: string | number): Observable<boolean> {
    let txs: SalesandTransactions[] = JSON.parse(localStorage.getItem(this.TRANSACTIONS_KEY) || '[]');
    txs = txs.filter(t => String(t.id) !== String(id) && t.orderId !== id);
    localStorage.setItem(this.TRANSACTIONS_KEY, JSON.stringify(txs));
    return of(true).pipe(delay(300));
  }

  getMerchantInfo(): MerchantInfo {
    return {
      id: 1,
      merchantId: 'MCH-001',
      name: 'Queen Sheba Enterprise Systems',
      companyName: 'Queen Sheba Enterprise Systems',
      bankDetails: {
        bankName: 'Access Bank',
        accountName: 'Queen Sheba Enterprise Systems',
        accountNumber: '0011223344'
      },
      address: ['14 Commerce Boulevard, Suite 500, Victoria Island', 'Lagos, Nigeria'],
      phone: '+234 800 123 4567',
      email: 'finance@queensheba.erp',
      taxId: 'TIN-98472910-001',
      logoUrl: []
    };
  }

  getPaymentReceipt(paymentId: string): Observable<PaymentReceipt | null> {
    const txs: SalesandTransactions[] = JSON.parse(localStorage.getItem(this.TRANSACTIONS_KEY) || '[]');
    const tx = txs.find(t => String(t.id) === String(paymentId) || t.paymentNumber === paymentId || t.orderId === paymentId);
    
    if (!tx) {
      return of(null).pipe(delay(200));
    }

    const invoices: Invoice[] = JSON.parse(localStorage.getItem(this.INVOICES_KEY) || '[]');
    const invIdStr = typeof tx.invoiceId === 'object' ? (tx.invoiceId as any)?.id : String(tx.invoiceId);
    const invoice = invoices.find(i => String(i.id) === invIdStr || i.invoiceNumber === invIdStr) || {
      id: invIdStr,
      invoiceNumber: String(invIdStr).startsWith('INV-') ? invIdStr : `INV-${invIdStr}`,
      orderId: tx.orderId,
      customerId: tx.customerId,
      customerName: tx.customerName,
      items: [],
      subtotal: tx.subtotal,
      taxAmount: tx.taxAmount,
      discountAmount: tx.discountAmount,
      totalAmount: tx.totalAmount,
      currency: tx.currency || 'NGN',
      status: 'SENT',
      issueDate: tx.orderDate,
      dueDate: tx.orderDate,
      paymentTerms: tx.PaymentTerms,
      additionalOptions: {
        signatureText: '',
        attachments: { id: 1, fileName: '', fileUrl: '', uploadedAt: new Date(), size: 0, type: '' },
        email: '',
        address: '',
        phone: '',
        notes: '',
        terms: ''
      }
    } as any;

    const receipt: PaymentReceipt = {
      receiptNumber: `RCT-${(tx.paymentNumber || '').replace('PAY-', '')}`,
      payment: tx,
      invoice,
      customer: tx.customerId,
      merchantInfo: this.getMerchantInfo(),
      issuedAt: tx.orderDate
    };

    return of(receipt).pipe(delay(300));
  }
}