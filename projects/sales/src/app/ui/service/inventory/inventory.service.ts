// inventory.service.ts
// ============================================================
// IMPORTS
// ============================================================

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import {
  Product,
  Branch,
  BranchInventory,
  StockMovement,
  RestockRequest,
  StockAlert,
  ProductPerformance,
  BranchStockSummary,
  InventoryDashboardData,
  InventoryDashboardStats,
  QuickAction,
  ProductFilters,
  MovementFilters,
  RestockFilters,
  ApiResponse,
  PaginatedResponse,
  ProductStatus,
  MovementType,
  MovementStatus,
  RestockStatus,
  RestockUrgency,
  StockAlertType,
  StockAlertSeverity,
  Supplier,
  Category,
  MeasurementUnit
} from '../../domain/inventory/inventory.dto';

// ============================================================
// LOCAL STORAGE KEYS & MOCK DATA
// ============================================================

const LOCAL_KEYS = {
  DASHBOARD: 'inventory_dashboard',
  PRODUCTS: 'inventory_products',
  BRANCHES: 'inventory_branches',
  BRANCH_INVENTORY: 'inventory_branch_inventory',
  MOVEMENTS: 'inventory_movements',
  CATEGORIES: 'inventory_categories',
  MEASUREMENT_UNITS: 'inventory_measurement_units',
  SUPPLIERS: 'inventory_suppliers'
};

// ---------------------------------------------------
// MOCK DATA (kept unchanged from original file)
// ---------------------------------------------------

const MOCK_BRANCHES: any[] = [
  {
    id: 'br-1',
    name: 'Lagos Main Warehouse',
    code: 'LGS-MW',
    type: 'FLAGSHIP',
    location: { address: '14 Apapa Wharf Road', city: 'Lagos', state: 'Lagos', country: 'Nigeria', postalCode: '100001', lat: 6.4281, lng: 3.4219 },
    contact: { phone: '+234-1-555-0101', email: 'lagos.main@erpsales.ng', manager: 'John Doe' },
    status: 'ACTIVE',
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2026-08-01')
  },
  {
    id: 'br-2',
    name: 'Abuja Distribution Hub',
    code: 'ABJ-DH',
    type: 'FLAGSHIP',
    location: { address: '7 Industrial Layout, Gwagwalada', city: 'Abuja', state: 'FCT', country: 'Nigeria', postalCode: '900108', lat: 8.9403, lng: 7.3775 },
    contact: { phone: '+234-9-555-0202', email: 'abuja.hub@erpsales.ng', manager: 'Emeka Obi' },
    status: 'ACTIVE',
    createdAt: new Date('2023-03-10'),
    updatedAt: new Date('2026-08-01')
  },
  {
    id: 'br-3',
    name: 'Port Harcourt Store',
    code: 'PHC-ST',
    type: 'STANDARD',
    location: { address: '22 Trans-Amadi Industrial Road', city: 'Port Harcourt', state: 'Rivers', country: 'Nigeria', postalCode: '500211', lat: 4.8396, lng: 7.0335 },
    contact: { phone: '+234-84-555-0303', email: 'ph.store@erpsales.ng', manager: 'Mary Okoye' },
    status: 'ACTIVE',
    createdAt: new Date('2023-06-20'),
    updatedAt: new Date('2026-07-15')
  },
  {
    id: 'br-4',
    name: 'Kano Outlet',
    code: 'KAN-OT',
    type: 'STANDARD',
    location: { address: '5 Bompai Industrial Estate', city: 'Kano', state: 'Kano', country: 'Nigeria', postalCode: '700233', lat: 12.0022, lng: 8.5920 },
    contact: { phone: '+234-64-555-0404', email: 'kano.outlet@erpsales.ng', manager: 'Aisha Bello' },
    status: 'ACTIVE',
    createdAt: new Date('2023-09-05'),
    updatedAt: new Date('2026-07-20')
  },
  {
    id: 'br-5',
    name: 'Ibadan Regional Store',
    code: 'IBD-RS',
    type: 'STANDARD',
    location: { address: '18 Oluyole Industrial Estate', city: 'Ibadan', state: 'Oyo', country: 'Nigeria', postalCode: '200252', lat: 7.3775, lng: 3.9470 },
    contact: { phone: '+234-22-555-0505', email: 'ibadan.store@erpsales.ng', manager: 'Tunde Adeyemi' },
    status: 'ACTIVE',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2026-06-30')
  },
  {
    id: 'br-6',
    name: 'Enugu Express Depot',
    code: 'ENU-XD',
    type: 'MINI',
    location: { address: '3 Independence Layout', city: 'Enugu', state: 'Enugu', country: 'Nigeria', postalCode: '400221', lat: 6.4584, lng: 7.5464 },
    contact: { phone: '+234-42-555-0606', email: 'enugu.depot@erpsales.ng', manager: 'Chioma Nwosu' },
    status: 'ACTIVE',
    createdAt: new Date('2024-04-15'),
    updatedAt: new Date('2026-05-20')
  }
];

const MOCK_STATS: InventoryDashboardStats = {
  totalSkus: 1420,
  totalStockValue: 245000000,
  totalStockUnits: 85200,
  lowStockItems: 14,
  outOfStockItems: 3,
  totalBranches: 6,
  monthlyMovementCount: 324,
  monthlyMovementValue: 48500000,
  averageStockTurnover: 4.2,
  totalProfit: 12400000,
  lastUpdated: new Date()
};

const MOCK_ALERTS: StockAlert[] = [
  {
    id: 'alt-1',
    type: StockAlertType.OUT_OF_STOCK,
    severity: StockAlertSeverity.CRITICAL,
    productId: 'prod-1',
    productName: 'Cement Dangote Grade 42.5R',
    sku: 'CEM-DG-425',
    branchId: 'br-1',
    branchName: 'Lagos Main Warehouse',
    currentStock: 0,
    threshold: 100,
    message: 'Dangote Cement is completely out of stock at Lagos Warehouse!',
    isResolved: false,
    createdAt: new Date(),
    resolvedAt: new Date()
  },
  {
    id: 'alt-2',
    type: StockAlertType.LOW_STOCK,
    severity: StockAlertSeverity.WARNING,
    productId: 'prod-2',
    productName: 'Iron Rod 16mm (Per Ton)',
    sku: 'IRN-16MM-TON',
    branchId: 'br-2',
    branchName: 'Abuja Distribution Hub',
    currentStock: 12,
    threshold: 50,
    message: 'Iron Rod 16mm is below the reorder point of 50 tons.',
    isResolved: false,
    createdAt: new Date(Date.now() - 3600000),
    resolvedAt: new Date()
  },
  {
    id: 'alt-3',
    type: StockAlertType.EXPIRING,
    severity: StockAlertSeverity.INFO,
    productId: 'prod-3',
    productName: 'Wall Paint White Satin 20L',
    sku: 'PNT-WS-20L',
    branchId: 'br-3',
    branchName: 'Port Harcourt Store',
    currentStock: 85,
    threshold: 10,
    message: 'Premium Satin Paint batch #2024-09 expires in 30 days.',
    isResolved: false,
    createdAt: new Date(Date.now() - 7200000),
    resolvedAt: new Date()
  }
];

const MOCK_MOVEMENTS: StockMovement[] = [
  {
    id: 'mov-1',
    productId: 'prod-1',
    productName: 'Cement Dangote Grade 42.5R',
    sku: 'CEM-DG-425',
    fromLocation: { type: 'SUPPLIER', id: 'sup-1', name: 'Dangote Cement Factory' },
    toLocation: { type: 'WAREHOUSE', id: 'br-1', name: 'Lagos Main Warehouse' },
    quantity: 600,
    movementType: MovementType.PURCHASE,
    status: MovementStatus.COMPLETED,
    cost: 3600000,
    sellingPrice: 4200000,
    trackingNumber: 'TRK-DG-99238',
    batchNumber: 'BAT-2026-08',
    expiryDate: new Date(Date.now() + 180 * 24 * 3600000),
    notes: 'Restock purchase order PO-8892',
    createdBy: 'usr-1',
    createdByName: 'John Doe',
    approvedBy: 'usr-2',
    approvedByName: 'Jane Smith',
    createdAt: new Date(Date.now() - 1800000),
    approvedAt: new Date(Date.now() - 1700000),
    completedAt: new Date(Date.now() - 1200000)
  },
  {
    id: 'mov-2',
    productId: 'prod-2',
    productName: 'Iron Rod 16mm (Per Ton)',
    sku: 'IRN-16MM-TON',
    fromLocation: { type: 'WAREHOUSE', id: 'br-1', name: 'Lagos Main Warehouse' },
    toLocation: { type: 'BRANCH', id: 'br-2', name: 'Abuja Distribution Hub' },
    quantity: 45,
    movementType: MovementType.TRANSFER,
    status: MovementStatus.IN_TRANSIT,
    cost: 13500000,
    sellingPrice: 15750000,
    trackingNumber: 'TRK-TX-44021',
    batchNumber: 'BAT-2026-02',
    expiryDate: new Date(),
    notes: 'Inter-branch stock transfer to meet sudden demand',
    createdBy: 'usr-1',
    createdByName: 'John Doe',
    approvedBy: 'usr-2',
    approvedByName: 'Jane Smith',
    createdAt: new Date(Date.now() - 5400000),
    approvedAt: new Date(Date.now() - 5200000),
    completedAt: new Date()
  },
  {
    id: 'mov-3',
    productId: 'prod-3',
    productName: 'Wall Paint White Satin 20L',
    sku: 'PNT-WS-20L',
    fromLocation: { type: 'BRANCH', id: 'br-3', name: 'Port Harcourt Store' },
    toLocation: { type: 'CUSTOMER', id: 'cust-1', name: 'Julius Berger Site C' },
    quantity: 120,
    movementType: MovementType.SALE,
    status: MovementStatus.COMPLETED,
    cost: 2160000,
    sellingPrice: 2880000,
    trackingNumber: 'TRK-SL-77890',
    batchNumber: 'BAT-2025-11',
    expiryDate: new Date(Date.now() + 365 * 24 * 3600000),
    notes: 'Invoice INV-10023 sales delivery',
    createdBy: 'usr-4',
    createdByName: 'Mary Okoye',
    approvedBy: 'usr-4',
    approvedByName: 'Mary Okoye',
    createdAt: new Date(Date.now() - 10800000),
    approvedAt: new Date(Date.now() - 10800000),
    completedAt: new Date(Date.now() - 9000000)
  },
  {
    id: 'mov-4',
    productId: 'prod-4',
    productName: 'PVC Pipes 4-inch (Length 6m)',
    sku: 'PVC-4IN-6M',
    fromLocation: { type: 'SUPPLIER', id: 'sup-2', name: 'Niger Delta Plastics Ltd' },
    toLocation: { type: 'BRANCH', id: 'br-3', name: 'Port Harcourt Store' },
    quantity: 800,
    movementType: MovementType.PURCHASE,
    status: MovementStatus.COMPLETED,
    cost: 4800000,
    sellingPrice: 6400000,
    trackingNumber: 'TRK-PH-11223',
    batchNumber: 'BAT-2026-07',
    expiryDate: new Date(Date.now() + 730 * 24 * 3600000),
    notes: 'Bulk purchase for PH construction season',
    createdBy: 'usr-4',
    createdByName: 'Mary Okoye',
    approvedBy: 'usr-2',
    approvedByName: 'Jane Smith',
    createdAt: new Date(Date.now() - 2 * 86400000),
    approvedAt: new Date(Date.now() - 2 * 86400000 + 3600000),
    completedAt: new Date(Date.now() - 2 * 86400000 + 7200000)
  },
  {
    id: 'mov-5',
    productId: 'prod-5',
    productName: 'Floor Tiles 60x60cm (Box)',
    sku: 'TIL-FLR-6060',
    fromLocation: { type: 'BRANCH', id: 'br-2', name: 'Abuja Distribution Hub' },
    toLocation: { type: 'CUSTOMER', id: 'cust-2', name: 'Maitama Estate Project' },
    quantity: 250,
    movementType: MovementType.SALE,
    status: MovementStatus.COMPLETED,
    cost: 5000000,
    sellingPrice: 6250000,
    trackingNumber: 'TRK-SL-55671',
    batchNumber: 'BAT-2026-05',
    expiryDate: new Date(Date.now() + 1460 * 24 * 3600000),
    notes: 'Maitama residential estate Phase 2 finishing',
    createdBy: 'usr-3',
    createdByName: 'Emeka Obi',
    approvedBy: 'usr-3',
    approvedByName: 'Emeka Obi',
    createdAt: new Date(Date.now() - 3 * 86400000),
    approvedAt: new Date(Date.now() - 3 * 86400000 + 1800000),
    completedAt: new Date(Date.now() - 3 * 86400000 + 4 * 3600000)
  },
  {
    id: 'mov-6',
    productId: 'prod-1',
    productName: 'Cement Dangote Grade 42.5R',
    sku: 'CEM-DG-425',
    fromLocation: { type: 'WAREHOUSE', id: 'br-1', name: 'Lagos Main Warehouse' },
    toLocation: { type: 'BRANCH', id: 'br-4', name: 'Kano Outlet' },
    quantity: 200,
    movementType: MovementType.TRANSFER,
    status: MovementStatus.PENDING,
    cost: 1200000,
    sellingPrice: 1500000,
    trackingNumber: 'TRK-TX-67890',
    batchNumber: 'BAT-2026-08',
    expiryDate: new Date(Date.now() + 180 * 24 * 3600000),
    notes: 'Scheduled Kano resupply — awaiting driver allocation',
    createdBy: 'usr-1',
    createdByName: 'John Doe',
    approvedBy: '',
    approvedByName: '',
    createdAt: new Date(Date.now() - 4 * 3600000),
    approvedAt: new Date(),
    completedAt: new Date()
  },
  {
    id: 'mov-7',
    productId: 'prod-6',
    productName: 'Electrical Cable 1.5mm (100m Roll)',
    sku: 'ELC-CBL-15-100',
    fromLocation: { type: 'SUPPLIER', id: 'sup-3', name: 'Coleman Cables Nigeria' },
    toLocation: { type: 'WAREHOUSE', id: 'br-1', name: 'Lagos Main Warehouse' },
    quantity: 500,
    movementType: MovementType.PURCHASE,
    status: MovementStatus.IN_TRANSIT,
    cost: 7500000,
    sellingPrice: 9500000,
    trackingNumber: 'TRK-CL-33481',
    batchNumber: 'BAT-2026-08',
    expiryDate: new Date(Date.now() + 365 * 24 * 3600000),
    notes: 'Large restock PO-9120 from Coleman',
    createdBy: 'usr-2',
    createdByName: 'Jane Smith',
    approvedBy: 'usr-2',
    approvedByName: 'Jane Smith',
    createdAt: new Date(Date.now() - 86400000),
    approvedAt: new Date(Date.now() - 86400000 + 1800000),
    completedAt: new Date()
  },
  {
    id: 'mov-8',
    productId: 'prod-7',
    productName: 'Roofing Sheet Long Span (Per Meter)',
    sku: 'ROF-LS-MTR',
    fromLocation: { type: 'WAREHOUSE', id: 'br-1', name: 'Lagos Main Warehouse' },
    toLocation: { type: 'CUSTOMER', id: 'cust-3', name: 'Lekki Phase 2 Developers' },
    quantity: 1500,
    movementType: MovementType.SALE,
    status: MovementStatus.COMPLETED,
    cost: 9000000,
    sellingPrice: 12750000,
    trackingNumber: 'TRK-SL-88901',
    batchNumber: 'BAT-2026-06',
    expiryDate: new Date(Date.now() + 3650 * 24 * 3600000),
    notes: 'INV-10045 — Lekki roofing project delivery',
    createdBy: 'usr-1',
    createdByName: 'John Doe',
    approvedBy: 'usr-1',
    approvedByName: 'John Doe',
    createdAt: new Date(Date.now() - 5 * 86400000),
    approvedAt: new Date(Date.now() - 5 * 86400000 + 3600000),
    completedAt: new Date(Date.now() - 5 * 86400000 + 6 * 3600000)
  },
  {
    id: 'mov-9',
    productId: 'prod-3',
    productName: 'Wall Paint White Satin 20L',
    sku: 'PNT-WS-20L',
    fromLocation: { type: 'BRANCH', id: 'br-2', name: 'Abuja Distribution Hub' },
    toLocation: { type: 'BRANCH', id: 'br-2', name: 'Abuja Distribution Hub' },
    quantity: 30,
    movementType: MovementType.RETURN,
    status: MovementStatus.COMPLETED,
    cost: 540000,
    sellingPrice: 720000,
    trackingNumber: 'TRK-RT-20910',
    batchNumber: 'BAT-2025-11',
    expiryDate: new Date(Date.now() + 335 * 24 * 3600000),
    notes: 'Customer return — incorrect colour delivered',
    createdBy: 'usr-3',
    createdByName: 'Emeka Obi',
    approvedBy: 'usr-2',
    approvedByName: 'Jane Smith',
    createdAt: new Date(Date.now() - 6 * 86400000),
    approvedAt: new Date(Date.now() - 6 * 86400000 + 7200000),
    completedAt: new Date(Date.now() - 6 * 86400000 + 9 * 3600000)
  },
  {
    id: 'mov-10',
    productId: 'prod-2',
    productName: 'Iron Rod 16mm (Per Ton)',
    sku: 'IRN-16MM-TON',
    fromLocation: { type: 'WAREHOUSE', id: 'br-1', name: 'Lagos Main Warehouse' },
    toLocation: { type: 'BRANCH', id: 'br-1', name: 'Lagos Main Warehouse' },
    quantity: 5,
    movementType: MovementType.DAMAGED,
    status: MovementStatus.COMPLETED,
    cost: 1750000,
    sellingPrice: 0,
    trackingNumber: 'TRK-DMG-00321',
    batchNumber: 'BAT-2026-01',
    expiryDate: new Date(),
    notes: 'Damaged during forklift incident — wrote off 5 tons',
    createdBy: 'usr-5',
    createdByName: 'Tunde Adeyemi',
    approvedBy: 'usr-2',
    approvedByName: 'Jane Smith',
    createdAt: new Date(Date.now() - 7 * 86400000),
    approvedAt: new Date(Date.now() - 7 * 86400000 + 3600000),
    completedAt: new Date(Date.now() - 7 * 86400000 + 5 * 3600000)
  },
  {
    id: 'mov-11',
    productId: 'prod-8',
    productName: 'Plywood Sheet 18mm (4x8ft)',
    sku: 'PLY-18MM-4X8',
    fromLocation: { type: 'SUPPLIER', id: 'sup-4', name: 'Tropical Timber Mills' },
    toLocation: { type: 'BRANCH', id: 'br-2', name: 'Abuja Distribution Hub' },
    quantity: 300,
    movementType: MovementType.PURCHASE,
    status: MovementStatus.COMPLETED,
    cost: 9000000,
    sellingPrice: 11250000,
    trackingNumber: 'TRK-PL-47812',
    batchNumber: 'BAT-2026-07',
    expiryDate: new Date(Date.now() + 365 * 24 * 3600000),
    notes: 'Abuja quarterly timber restock PO-8750',
    createdBy: 'usr-3',
    createdByName: 'Emeka Obi',
    approvedBy: 'usr-2',
    approvedByName: 'Jane Smith',
    createdAt: new Date(Date.now() - 8 * 86400000),
    approvedAt: new Date(Date.now() - 8 * 86400000 + 2 * 3600000),
    completedAt: new Date(Date.now() - 8 * 86400000 + 10 * 3600000)
  },
  {
    id: 'mov-12',
    productId: 'prod-4',
    productName: 'PVC Pipes 4-inch (Length 6m)',
    sku: 'PVC-4IN-6M',
    fromLocation: { type: 'BRANCH', id: 'br-3', name: 'Port Harcourt Store' },
    toLocation: { type: 'BRANCH', id: 'br-3', name: 'Port Harcourt Store' },
    quantity: 50,
    movementType: MovementType.ADJUSTMENT,
    status: MovementStatus.COMPLETED,
    cost: 300000,
    sellingPrice: 0,
    trackingNumber: 'TRK-ADJ-10041',
    batchNumber: 'BAT-2026-07',
    expiryDate: new Date(Date.now() + 730 * 24 * 3600000),
    notes: 'Cycle count correction — 50 units extra found during audit',
    createdBy: 'usr-4',
    createdByName: 'Mary Okoye',
    approvedBy: 'usr-2',
    approvedByName: 'Jane Smith',
    createdAt: new Date(Date.now() - 9 * 86400000),
    approvedAt: new Date(Date.now() - 9 * 86400000 + 3600000),
    completedAt: new Date(Date.now() - 9 * 86400000 + 4 * 3600000)
  },
  {
    id: 'mov-13',
    productId: 'prod-5',
    productName: 'Floor Tiles 60x60cm (Box)',
    sku: 'TIL-FLR-6060',
    fromLocation: { type: 'SUPPLIER', id: 'sup-5', name: 'Porcelain Palace Lagos' },
    toLocation: { type: 'WAREHOUSE', id: 'br-1', name: 'Lagos Main Warehouse' },
    quantity: 1000,
    movementType: MovementType.PURCHASE,
    status: MovementStatus.IN_TRANSIT,
    cost: 20000000,
    sellingPrice: 25000000,
    trackingNumber: 'TRK-TL-66320',
    batchNumber: 'BAT-2026-08',
    expiryDate: new Date(Date.now() + 1460 * 24 * 3600000),
    notes: 'Major restock ahead of festive season — PO-9201',
    createdBy: 'usr-1',
    createdByName: 'John Doe',
    approvedBy: 'usr-2',
    approvedByName: 'Jane Smith',
    createdAt: new Date(Date.now() - 12 * 3600000),
    approvedAt: new Date(Date.now() - 11 * 3600000),
    completedAt: new Date()
  },
  {
    id: 'mov-14',
    productId: 'prod-6',
    productName: 'Electrical Cable 1.5mm (100m Roll)',
    sku: 'ELC-CBL-15-100',
    fromLocation: { type: 'WAREHOUSE', id: 'br-1', name: 'Lagos Main Warehouse' },
    toLocation: { type: 'CUSTOMER', id: 'cust-5', name: 'Eko Atlantic Contractors' },
    quantity: 200,
    movementType: MovementType.SALE,
    status: MovementStatus.IN_TRANSIT,
    cost: 3000000,
    sellingPrice: 3800000,
    trackingNumber: 'TRK-SL-90012',
    batchNumber: 'BAT-2026-08',
    expiryDate: new Date(Date.now() + 365 * 24 * 3600000),
    notes: 'INV-10067 — Eko Atlantic electrical fitout delivery',
    createdBy: 'usr-1',
    createdByName: 'John Doe',
    approvedBy: 'usr-1',
    approvedByName: 'John Doe',
    createdAt: new Date(Date.now() - 8 * 3600000),
    approvedAt: new Date(Date.now() - 7 * 3600000),
    completedAt: new Date()
  },
  {
    id: 'mov-15',
    productId: 'prod-7',
    productName: 'Roofing Sheet Long Span (Per Meter)',
    sku: 'ROF-LS-MTR',
    fromLocation: { type: 'BRANCH', id: 'br-4', name: 'Kano Outlet' },
    toLocation: { type: 'CUSTOMER', id: 'cust-6', name: 'Sabon Gari Housing Corp' },
    quantity: 600,
    movementType: MovementType.SALE,
    status: MovementStatus.PENDING,
    cost: 3600000,
    sellingPrice: 5100000,
    trackingNumber: 'TRK-SL-11445',
    batchNumber: 'BAT-2026-06',
    expiryDate: new Date(Date.now() + 3650 * 24 * 3600000),
    notes: 'INV-10072 — Kano housing project roofing supply',
    createdBy: 'usr-6',
    createdByName: 'Aisha Bello',
    approvedBy: '',
    approvedByName: '',
    createdAt: new Date(Date.now() - 2 * 3600000),
    approvedAt: new Date(),
    completedAt: new Date()
  },
  {
    id: 'mov-16',
    productId: 'prod-8',
    productName: 'Plywood Sheet 18mm (4x8ft)',
    sku: 'PLY-18MM-4X8',
    fromLocation: { type: 'BRANCH', id: 'br-2', name: 'Abuja Distribution Hub' },
    toLocation: { type: 'CUSTOMER', id: 'cust-7', name: 'Asokoro Mall Fit-Out' },
    quantity: 80,
    movementType: MovementType.SALE,
    status: MovementStatus.COMPLETED,
    cost: 2400000,
    sellingPrice: 3200000,
    trackingNumber: 'TRK-SL-22567',
    batchNumber: 'BAT-2026-07',
    expiryDate: new Date(Date.now() + 365 * 24 * 3600000),
    notes: 'INV-10058 — Asokoro mall interior fit-out',
    createdBy: 'usr-3',
    createdByName: 'Emeka Obi',
    approvedBy: 'usr-3',
    approvedByName: 'Emeka Obi',
    createdAt: new Date(Date.now() - 11 * 86400000),
    approvedAt: new Date(Date.now() - 11 * 86400000 + 3600000),
    completedAt: new Date(Date.now() - 11 * 86400000 + 8 * 3600000)
  },
  {
    id: 'mov-17',
    productId: 'prod-9',
    productName: 'Sanitary Ware — WC Suite Set',
    sku: 'SAN-WC-SUITE',
    fromLocation: { type: 'SUPPLIER', id: 'sup-6', name: 'Roca Sanitaryware Nigeria' },
    toLocation: { type: 'BRANCH', id: 'br-3', name: 'Port Harcourt Store' },
    quantity: 40,
    movementType: MovementType.PURCHASE,
    status: MovementStatus.COMPLETED,
    cost: 8000000,
    sellingPrice: 10400000,
    trackingNumber: 'TRK-SW-33891',
    batchNumber: 'BAT-2026-06',
    expiryDate: new Date(Date.now() + 1825 * 24 * 3600000),
    notes: 'PH store replenishment for high-end sanitary ware',
    createdBy: 'usr-4',
    createdByName: 'Mary Okoye',
    approvedBy: 'usr-2',
    approvedByName: 'Jane Smith',
    createdAt: new Date(Date.now() - 13 * 86400000),
    approvedAt: new Date(Date.now() - 13 * 86400000 + 4 * 3600000),
    completedAt: new Date(Date.now() - 13 * 86400000 + 12 * 3600000)
  },
  {
    id: 'mov-18',
    productId: 'prod-2',
    productName: 'Iron Rod 16mm (Per Ton)',
    sku: 'IRN-16MM-TON',
    fromLocation: { type: 'SUPPLIER', id: 'sup-7', name: 'Delta Steel Company' },
    toLocation: { type: 'WAREHOUSE', id: 'br-1', name: 'Lagos Main Warehouse' },
    quantity: 120,
    movementType: MovementType.PURCHASE,
    status: MovementStatus.COMPLETED,
    cost: 42000000,
    sellingPrice: 50400000,
    trackingNumber: 'TRK-DL-55001',
    batchNumber: 'BAT-2026-08',
    expiryDate: new Date(Date.now() + 1825 * 24 * 3600000),
    notes: 'PO-9100 — Emergency restock post-depletion',
    createdBy: 'usr-1',
    createdByName: 'John Doe',
    approvedBy: 'usr-2',
    approvedByName: 'Jane Smith',
    createdAt: new Date(Date.now() - 14 * 86400000),
    approvedAt: new Date(Date.now() - 14 * 86400000 + 5 * 3600000),
    completedAt: new Date(Date.now() - 14 * 86400000 + 14 * 3600000)
  },
  {
    id: 'mov-19',
    productId: 'prod-3',
    productName: 'Wall Paint White Satin 20L',
    sku: 'PNT-WS-20L',
    fromLocation: { type: 'BRANCH', id: 'br-1', name: 'Lagos Main Warehouse' },
    toLocation: { type: 'BRANCH', id: 'br-4', name: 'Kano Outlet' },
    quantity: 60,
    movementType: MovementType.TRANSFER,
    status: MovementStatus.CANCELLED,
    cost: 1080000,
    sellingPrice: 1440000,
    trackingNumber: 'TRK-TX-78322',
    batchNumber: 'BAT-2025-11',
    expiryDate: new Date(Date.now() + 335 * 24 * 3600000),
    notes: 'Cancelled — recipient branch found alternative local supplier',
    createdBy: 'usr-6',
    createdByName: 'Aisha Bello',
    approvedBy: '',
    approvedByName: '',
    createdAt: new Date(Date.now() - 16 * 86400000),
    approvedAt: new Date(),
    completedAt: new Date()
  },
  {
    id: 'mov-20',
    productId: 'prod-9',
    productName: 'Sanitary Ware — WC Suite Set',
    sku: 'SAN-WC-SUITE',
    fromLocation: { type: 'BRANCH', id: 'br-3', name: 'Port Harcourt Store' },
    toLocation: { type: 'CUSTOMER', id: 'cust-8', name: 'Garden City Luxury Homes' },
    quantity: 12,
    movementType: MovementType.SALE,
    status: MovementStatus.COMPLETED,
    cost: 2400000,
    sellingPrice: 3120000,
    trackingNumber: 'TRK-SL-44567',
    batchNumber: 'BAT-2026-06',
    expiryDate: new Date(Date.now() + 1813 * 24 * 3600000),
    notes: 'INV-10081 — Garden City Luxury Homes show units',
    createdBy: 'usr-4',
    createdByName: 'Mary Okoye',
    approvedBy: 'usr-4',
    approvedByName: 'Mary Okoye',
    createdAt: new Date(Date.now() - 18 * 86400000),
    approvedAt: new Date(Date.now() - 18 * 86400000 + 2 * 3600000),
    completedAt: new Date(Date.now() - 18 * 86400000 + 6 * 3600000)
  }
];

const MOCK_TOP_PRODUCTS: ProductPerformance[] = [
  {
    productId: 'prod-1',
    productName: 'Cement Dangote Grade 42.5R',
    sku: 'CEM-DG-425',
    category: 'Building Materials',
    totalSold: 12500,
    totalRevenue: 87500000,
    totalProfit: 12500000,
    averagePrice: 7000,
    sellThroughRate: 88,
    stockTurnover: 6.5,
    daysOfInventory: 15,
    performanceScore: 94,
    trend: 'UP',
    period: { start: new Date(), end: new Date() }
  },
  {
    productId: 'prod-2',
    productName: 'Iron Rod 16mm (Per Ton)',
    sku: 'IRN-16MM-TON',
    category: 'Metal & Steel',
    totalSold: 180,
    totalRevenue: 63000000,
    totalProfit: 9000000,
    averagePrice: 350000,
    sellThroughRate: 74,
    stockTurnover: 3.8,
    daysOfInventory: 24,
    performanceScore: 86,
    trend: 'UP',
    period: { start: new Date(), end: new Date() }
  },
  {
    productId: 'prod-4',
    productName: 'PVC Pipes 4-inch (Length 6m)',
    sku: 'PVC-4IN-6M',
    category: 'Plumbing & Pipes',
    totalSold: 4200,
    totalRevenue: 29400000,
    totalProfit: 5880000,
    averagePrice: 7000,
    sellThroughRate: 91,
    stockTurnover: 8.2,
    daysOfInventory: 11,
    performanceScore: 89,
    trend: 'STABLE',
    period: { start: new Date(), end: new Date() }
  },
  {
    productId: 'prod-3',
    productName: 'Wall Paint White Satin 20L',
    sku: 'PNT-WS-20L',
    category: 'Paints & Finishes',
    totalSold: 950,
    totalRevenue: 22800000,
    totalProfit: 5700000,
    averagePrice: 24000,
    sellThroughRate: 68,
    stockTurnover: 2.9,
    daysOfInventory: 35,
    performanceScore: 78,
    trend: 'DOWN',
    period: { start: new Date(), end: new Date() }
  }
];

const MOCK_BRANCH_SUMMARIES: BranchStockSummary[] = [
  {
    branchId: 'br-1',
    branchName: 'Lagos Main Warehouse',
    totalProducts: 850,
    totalStockValue: 120500000,
    totalStockUnits: 42000,
    lowStockCount: 4,
    outOfStockCount: 1,
    topSellingProducts: [
      { productId: 'prod-1', productName: 'Cement Dangote Grade 42.5R', quantity: 4800, revenue: 33600000 },
      { productId: 'prod-7', productName: 'Roofing Sheet Long Span (Per Meter)', quantity: 3200, revenue: 27200000 },
      { productId: 'prod-6', productName: 'Electrical Cable 1.5mm (100m Roll)', quantity: 2100, revenue: 15750000 },
      { productId: 'prod-2', productName: 'Iron Rod 16mm (Per Ton)', quantity: 85, revenue: 29750000 },
      { productId: 'prod-5', productName: 'Floor Tiles 60x60cm (Box)', quantity: 1200, revenue: 9000000 }
    ]
  },
  {
    branchId: 'br-2',
    branchName: 'Abuja Distribution Hub',
    totalProducts: 620,
    totalStockValue: 72100000,
    totalStockUnits: 24500,
    lowStockCount: 6,
    outOfStockCount: 2,
    topSellingProducts: [
      { productId: 'prod-5', productName: 'Floor Tiles 60x60cm (Box)', quantity: 1800, revenue: 13500000 },
      { productId: 'prod-8', productName: 'Plywood Sheet 18mm (4x8ft)', quantity: 420, revenue: 12600000 },
      { productId: 'prod-1', productName: 'Cement Dangote Grade 42.5R', quantity: 2100, revenue: 14700000 },
      { productId: 'prod-3', productName: 'Wall Paint White Satin 20L', quantity: 650, revenue: 15600000 },
      { productId: 'prod-2', productName: 'Iron Rod 16mm (Per Ton)', quantity: 40, revenue: 14000000 }
    ]
  },
  {
    branchId: 'br-3',
    branchName: 'Port Harcourt Store',
    totalProducts: 480,
    totalStockValue: 36200000,
    totalStockUnits: 12800,
    lowStockCount: 2,
    outOfStockCount: 0,
    topSellingProducts: [
      { productId: 'prod-4', productName: 'PVC Pipes 4-inch (Length 6m)', quantity: 2400, revenue: 16800000 },
      { productId: 'prod-9', productName: 'Sanitary Ware — WC Suite Set', quantity: 32, revenue: 8320000 },
      { productId: 'prod-3', productName: 'Wall Paint White Satin 20L', quantity: 520, revenue: 12480000 },
      { productId: 'prod-7', productName: 'Roofing Sheet Long Span (Per Meter)', quantity: 900, revenue: 7650000 },
      { productId: 'prod-6', productName: 'Electrical Cable 1.5mm (100m Roll)', quantity: 380, revenue: 2850000 }
    ]
  },
  {
    branchId: 'br-4',
    branchName: 'Kano Outlet',
    totalProducts: 310,
    totalStockValue: 16200000,
    totalStockUnits: 5900,
    lowStockCount: 2,
    outOfStockCount: 0,
    topSellingProducts: [
      { productId: 'prod-1', productName: 'Cement Dangote Grade 42.5R', quantity: 1600, revenue: 11200000 },
      { productId: 'prod-7', productName: 'Roofing Sheet Long Span (Per Meter)', quantity: 700, revenue: 5950000 },
      { productId: 'prod-2', productName: 'Iron Rod 16mm (Per Ton)', quantity: 18, revenue: 6300000 },
      { productId: 'prod-4', productName: 'PVC Pipes 4-inch (Length 6m)', quantity: 800, revenue: 5600000 },
      { productId: 'prod-3', productName: 'Wall Paint White Satin 20L', quantity: 210, revenue: 5040000 }
    ]
  },
  {
    branchId: 'br-5',
    branchName: 'Ibadan Regional Store',
    totalProducts: 390,
    totalStockValue: 28400000,
    totalStockUnits: 9800,
    lowStockCount: 3,
    outOfStockCount: 1,
    topSellingProducts: [
      { productId: 'prod-1', productName: 'Cement Dangote Grade 42.5R', quantity: 2200, revenue: 15400000 },
      { productId: 'prod-5', productName: 'Floor Tiles 60x60cm (Box)', quantity: 700, revenue: 5250000 },
      { productId: 'prod-6', productName: 'Electrical Cable 1.5mm (100m Roll)', quantity: 410, revenue: 3075000 },
      { productId: 'prod-8', productName: 'Plywood Sheet 18mm (4x8ft)', quantity: 180, revenue: 5400000 },
      { productId: 'prod-4', productName: 'PVC Pipes 4-inch (Length 6m)', quantity: 620, revenue: 4340000 }
    ]
  },
  {
    branchId: 'br-6',
    branchName: 'Enugu Express Depot',
    totalProducts: 265,
    totalStockValue: 19100000,
    totalStockUnits: 7200,
    lowStockCount: 1,
    outOfStockCount: 0,
    topSellingProducts: [
      { productId: 'prod-1', productName: 'Cement Dangote Grade 42.5R', quantity: 1900, revenue: 13300000 },
      { productId: 'prod-3', productName: 'Wall Paint White Satin 20L', quantity: 310, revenue: 7440000 },
      { productId: 'prod-4', productName: 'PVC Pipes 4-inch (Length 6m)', quantity: 480, revenue: 3360000 },
      { productId: 'prod-7', productName: 'Roofing Sheet Long Span (Per Meter)', quantity: 550, revenue: 4675000 },
      { productId: 'prod-2', productName: 'Iron Rod 16mm (Per Ton)', quantity: 12, revenue: 4200000 }
    ]
  }
];

const MOCK_BRANCH_INVENTORY: BranchInventory[] = [
  // ── Lagos Main Warehouse (br-1) ─────────────────────────────
  { id: 'bi-1',  branchId: 'br-1', branchName: 'Lagos Main Warehouse',     productId: 'prod-1', productName: 'Cement Dangote Grade 42.5R',       sku: 'CEM-DG-425',      quantity: 1200, reorderPoint: 300, reorderQuantity: 600, safetyStock: 150, sellingPrice: 7000,   costPrice: 6000,   lastUpdated: new Date(Date.now() - 1 * 86400000) },
  { id: 'bi-2',  branchId: 'br-1', branchName: 'Lagos Main Warehouse',     productId: 'prod-2', productName: 'Iron Rod 16mm (Per Ton)',          sku: 'IRN-16MM-TON',    quantity: 85,   reorderPoint: 50,  reorderQuantity: 100, safetyStock: 20,  sellingPrice: 350000, costPrice: 300000, lastUpdated: new Date(Date.now() - 2 * 86400000) },
  { id: 'bi-3',  branchId: 'br-1', branchName: 'Lagos Main Warehouse',     productId: 'prod-3', productName: 'Wall Paint White Satin 20L',      sku: 'PNT-WS-20L',      quantity: 420,  reorderPoint: 100, reorderQuantity: 200, safetyStock: 50,  sellingPrice: 24000,  costPrice: 18000,  lastUpdated: new Date(Date.now() - 3 * 86400000) },
  { id: 'bi-4',  branchId: 'br-1', branchName: 'Lagos Main Warehouse',     productId: 'prod-5', productName: 'Floor Tiles 60x60cm (Box)',       sku: 'TIL-FLR-6060',    quantity: 1800, reorderPoint: 400, reorderQuantity: 800, safetyStock: 200, sellingPrice: 7500,   costPrice: 5000,   lastUpdated: new Date(Date.now() - 1 * 86400000) },
  { id: 'bi-5',  branchId: 'br-1', branchName: 'Lagos Main Warehouse',     productId: 'prod-6', productName: 'Electrical Cable 1.5mm (100m Roll)', sku: 'ELC-CBL-15-100', quantity: 640,  reorderPoint: 150, reorderQuantity: 300, safetyStock: 60,  sellingPrice: 15000,  costPrice: 11000,  lastUpdated: new Date(Date.now() - 1 * 86400000) },
  { id: 'bi-6',  branchId: 'br-1', branchName: 'Lagos Main Warehouse',     productId: 'prod-7', productName: 'Roofing Sheet Long Span (Per Meter)', sku: 'ROF-LS-MTR',   quantity: 4200, reorderPoint: 800, reorderQuantity: 1500, safetyStock: 400, sellingPrice: 8500,  costPrice: 6000,   lastUpdated: new Date(Date.now() - 2 * 86400000) },
  { id: 'bi-7',  branchId: 'br-1', branchName: 'Lagos Main Warehouse',     productId: 'prod-4', productName: 'PVC Pipes 4-inch (Length 6m)',    sku: 'PVC-4IN-6M',      quantity: 2100, reorderPoint: 500, reorderQuantity: 1000, safetyStock: 200, sellingPrice: 7000,  costPrice: 5000,   lastUpdated: new Date(Date.now() - 3 * 86400000) },
  // ── Abuja Distribution Hub (br-2) ───────────────────────────
  { id: 'bi-8',  branchId: 'br-2', branchName: 'Abuja Distribution Hub',   productId: 'prod-1', productName: 'Cement Dangote Grade 42.5R',       sku: 'CEM-DG-425',      quantity: 800,  reorderPoint: 200, reorderQuantity: 400, safetyStock: 100, sellingPrice: 7200,   costPrice: 6000,   lastUpdated: new Date(Date.now() - 2 * 86400000) },
  { id: 'bi-9',  branchId: 'br-2', branchName: 'Abuja Distribution Hub',   productId: 'prod-2', productName: 'Iron Rod 16mm (Per Ton)',          sku: 'IRN-16MM-TON',    quantity: 12,   reorderPoint: 50,  reorderQuantity: 80,  safetyStock: 20,  sellingPrice: 360000, costPrice: 300000, lastUpdated: new Date(Date.now() - 1 * 86400000) },
  { id: 'bi-10', branchId: 'br-2', branchName: 'Abuja Distribution Hub',   productId: 'prod-5', productName: 'Floor Tiles 60x60cm (Box)',       sku: 'TIL-FLR-6060',    quantity: 950,  reorderPoint: 200, reorderQuantity: 500, safetyStock: 100, sellingPrice: 7800,   costPrice: 5000,   lastUpdated: new Date(Date.now() - 3 * 86400000) },
  { id: 'bi-11', branchId: 'br-2', branchName: 'Abuja Distribution Hub',   productId: 'prod-8', productName: 'Plywood Sheet 18mm (4x8ft)',      sku: 'PLY-18MM-4X8',    quantity: 380,  reorderPoint: 80,  reorderQuantity: 200, safetyStock: 40,  sellingPrice: 30000,  costPrice: 22000,  lastUpdated: new Date(Date.now() - 2 * 86400000) },
  { id: 'bi-12', branchId: 'br-2', branchName: 'Abuja Distribution Hub',   productId: 'prod-3', productName: 'Wall Paint White Satin 20L',      sku: 'PNT-WS-20L',      quantity: 0,    reorderPoint: 80,  reorderQuantity: 200, safetyStock: 40,  sellingPrice: 25000,  costPrice: 18000,  lastUpdated: new Date(Date.now() - 4 * 86400000) },
  { id: 'bi-13', branchId: 'br-2', branchName: 'Abuja Distribution Hub',   productId: 'prod-7', productName: 'Roofing Sheet Long Span (Per Meter)', sku: 'ROF-LS-MTR',   quantity: 1100, reorderPoint: 300, reorderQuantity: 600, safetyStock: 150, sellingPrice: 8800,  costPrice: 6000,   lastUpdated: new Date(Date.now() - 2 * 86400000) },
  // ── Port Harcourt Store (br-3) ───────────────────────────────
  { id: 'bi-14', branchId: 'br-3', branchName: 'Port Harcourt Store',      productId: 'prod-4', productName: 'PVC Pipes 4-inch (Length 6m)',    sku: 'PVC-4IN-6M',      quantity: 1600, reorderPoint: 400, reorderQuantity: 800, safetyStock: 200, sellingPrice: 7200,  costPrice: 5000,   lastUpdated: new Date(Date.now() - 1 * 86400000) },
  { id: 'bi-15', branchId: 'br-3', branchName: 'Port Harcourt Store',      productId: 'prod-9', productName: 'Sanitary Ware — WC Suite Set',    sku: 'SAN-WC-SUITE',    quantity: 28,   reorderPoint: 10,  reorderQuantity: 20,  safetyStock: 5,   sellingPrice: 260000, costPrice: 200000, lastUpdated: new Date(Date.now() - 2 * 86400000) },
  { id: 'bi-16', branchId: 'br-3', branchName: 'Port Harcourt Store',      productId: 'prod-3', productName: 'Wall Paint White Satin 20L',      sku: 'PNT-WS-20L',      quantity: 85,   reorderPoint: 100, reorderQuantity: 200, safetyStock: 50,  sellingPrice: 24500,  costPrice: 18000,  lastUpdated: new Date(Date.now() - 3 * 86400000) },
  { id: 'bi-17', branchId: 'br-3', branchName: 'Port Harcourt Store',      productId: 'prod-7', productName: 'Roofing Sheet Long Span (Per Meter)', sku: 'ROF-LS-MTR',   quantity: 700,  reorderPoint: 200, reorderQuantity: 400, safetyStock: 100, sellingPrice: 8700,  costPrice: 6000,   lastUpdated: new Date(Date.now() - 1 * 86400000) },
  { id: 'bi-18', branchId: 'br-3', branchName: 'Port Harcourt Store',      productId: 'prod-1', productName: 'Cement Dangote Grade 42.5R',       sku: 'CEM-DG-425',      quantity: 550,  reorderPoint: 150, reorderQuantity: 300, safetyStock: 80,  sellingPrice: 7100,   costPrice: 6000,   lastUpdated: new Date(Date.now() - 2 * 86400000) },
  // ── Kano Outlet (br-4) ──────────────────────────────────────
  { id: 'bi-19', branchId: 'br-4', branchName: 'Kano Outlet',              productId: 'prod-1', productName: 'Cement Dangote Grade 42.5R',       sku: 'CEM-DG-425',      quantity: 600,  reorderPoint: 150, reorderQuantity: 300, safetyStock: 80,  sellingPrice: 7100,   costPrice: 6000,   lastUpdated: new Date(Date.now() - 2 * 86400000) },
  { id: 'bi-20', branchId: 'br-4', branchName: 'Kano Outlet',              productId: 'prod-7', productName: 'Roofing Sheet Long Span (Per Meter)', sku: 'ROF-LS-MTR',   quantity: 1200, reorderPoint: 300, reorderQuantity: 600, safetyStock: 150, sellingPrice: 8600,  costPrice: 6000,   lastUpdated: new Date(Date.now() - 1 * 86400000) },
  { id: 'bi-21', branchId: 'br-4', branchName: 'Kano Outlet',              productId: 'prod-2', productName: 'Iron Rod 16mm (Per Ton)',          sku: 'IRN-16MM-TON',    quantity: 22,   reorderPoint: 20,  reorderQuantity: 40,  safetyStock: 10,  sellingPrice: 355000, costPrice: 300000, lastUpdated: new Date(Date.now() - 3 * 86400000) },
  { id: 'bi-22', branchId: 'br-4', branchName: 'Kano Outlet',              productId: 'prod-4', productName: 'PVC Pipes 4-inch (Length 6m)',    sku: 'PVC-4IN-6M',      quantity: 480,  reorderPoint: 120, reorderQuantity: 250, safetyStock: 60,  sellingPrice: 7300,  costPrice: 5000,   lastUpdated: new Date(Date.now() - 2 * 86400000) },
  { id: 'bi-23', branchId: 'br-4', branchName: 'Kano Outlet',              productId: 'prod-3', productName: 'Wall Paint White Satin 20L',      sku: 'PNT-WS-20L',      quantity: 140,  reorderPoint: 60,  reorderQuantity: 120, safetyStock: 30,  sellingPrice: 24000,  costPrice: 18000,  lastUpdated: new Date(Date.now() - 4 * 86400000) },
  // ── Ibadan Regional Store (br-5) ────────────────────────────
  { id: 'bi-24', branchId: 'br-5', branchName: 'Ibadan Regional Store',    productId: 'prod-1', productName: 'Cement Dangote Grade 42.5R',       sku: 'CEM-DG-425',      quantity: 900,  reorderPoint: 200, reorderQuantity: 400, safetyStock: 100, sellingPrice: 7050,   costPrice: 6000,   lastUpdated: new Date(Date.now() - 1 * 86400000) },
  { id: 'bi-25', branchId: 'br-5', branchName: 'Ibadan Regional Store',    productId: 'prod-5', productName: 'Floor Tiles 60x60cm (Box)',       sku: 'TIL-FLR-6060',    quantity: 620,  reorderPoint: 150, reorderQuantity: 300, safetyStock: 70,  sellingPrice: 7600,   costPrice: 5000,   lastUpdated: new Date(Date.now() - 2 * 86400000) },
  { id: 'bi-26', branchId: 'br-5', branchName: 'Ibadan Regional Store',    productId: 'prod-6', productName: 'Electrical Cable 1.5mm (100m Roll)', sku: 'ELC-CBL-15-100', quantity: 25,   reorderPoint: 80,  reorderQuantity: 150, safetyStock: 40,  sellingPrice: 15500,  costPrice: 11000,  lastUpdated: new Date(Date.now() - 1 * 86400000) },
  { id: 'bi-27', branchId: 'br-5', branchName: 'Ibadan Regional Store',    productId: 'prod-8', productName: 'Plywood Sheet 18mm (4x8ft)',      sku: 'PLY-18MM-4X8',    quantity: 190,  reorderPoint: 50,  reorderQuantity: 120, safetyStock: 25,  sellingPrice: 31000,  costPrice: 22000,  lastUpdated: new Date(Date.now() - 3 * 86400000) },
  { id: 'bi-28', branchId: 'br-5', branchName: 'Ibadan Regional Store',    productId: 'prod-4', productName: 'PVC Pipes 4-inch (Length 6m)',    sku: 'PVC-4IN-6M',      quantity: 0,    reorderPoint: 100, reorderQuantity: 250, safetyStock: 50,  sellingPrice: 7100,  costPrice: 5000,   lastUpdated: new Date(Date.now() - 5 * 86400000) },
  // ── Enugu Express Depot (br-6) ──────────────────────────────
  { id: 'bi-29', branchId: 'br-6', branchName: 'Enugu Express Depot',      productId: 'prod-1', productName: 'Cement Dangote Grade 42.5R',       sku: 'CEM-DG-425',      quantity: 750,  reorderPoint: 180, reorderQuantity: 350, safetyStock: 90,  sellingPrice: 7080,   costPrice: 6000,   lastUpdated: new Date(Date.now() - 2 * 86400000) },
  { id: 'bi-30', branchId: 'br-6', branchName: 'Enugu Express Depot',      productId: 'prod-3', productName: 'Wall Paint White Satin 20L',      sku: 'PNT-WS-20L',      quantity: 280,  reorderPoint: 70,  reorderQuantity: 140, safetyStock: 35,  sellingPrice: 24200,  costPrice: 18000,  lastUpdated: new Date(Date.now() - 3 * 86400000) },
  { id: 'bi-31', branchId: 'br-6', branchName: 'Enugu Express Depot',      productId: 'prod-4', productName: 'PVC Pipes 4-inch (Length 6m)',    sku: 'PVC-4IN-6M',      quantity: 360,  reorderPoint: 100, reorderQuantity: 200, safetyStock: 50,  sellingPrice: 7050,  costPrice: 5000,   lastUpdated: new Date(Date.now() - 1 * 86400000) },
  { id: 'bi-32', branchId: 'br-6', branchName: 'Enugu Express Depot',      productId: 'prod-7', productName: 'Roofing Sheet Long Span (Per Meter)', sku: 'ROF-LS-MTR',   quantity: 820,  reorderPoint: 200, reorderQuantity: 400, safetyStock: 100, sellingPrice: 8550,  costPrice: 6000,   lastUpdated: new Date(Date.now() - 2 * 86400000) },
  { id: 'bi-33', branchId: 'br-6', branchName: 'Enugu Express Depot',      productId: 'prod-2', productName: 'Iron Rod 16mm (Per Ton)',          sku: 'IRN-16MM-TON',    quantity: 8,    reorderPoint: 15,  reorderQuantity: 30,  safetyStock: 8,   sellingPrice: 352000, costPrice: 300000, lastUpdated: new Date(Date.now() - 4 * 86400000) }
];

const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-1',  name: 'Building Materials',    description: 'Cement, blocks, aggregates and general construction materials', createdAt: new Date('2023-01-15'), updatedAt: new Date('2023-01-15') },
  { id: 'cat-2',  name: 'Metal & Steel',         description: 'Iron rods, steel beams and metal fabrication stock',           createdAt: new Date('2023-01-15'), updatedAt: new Date('2023-01-15') },
  { id: 'cat-3',  name: 'Paints & Finishes',     description: 'Paints, primers, varnishes and surface finishes',              createdAt: new Date('2023-01-15'), updatedAt: new Date('2023-01-15') },
  { id: 'cat-4',  name: 'Plumbing & Pipes',      description: 'PVC pipes, fittings and plumbing accessories',                 createdAt: new Date('2023-01-15'), updatedAt: new Date('2023-01-15') },
  { id: 'cat-5',  name: 'Tiles & Flooring',      description: 'Floor and wall tiles, grout and flooring accessories',         createdAt: new Date('2023-02-01'), updatedAt: new Date('2023-02-01') },
  { id: 'cat-6',  name: 'Electrical',            description: 'Cables, fittings and electrical fixtures',                    createdAt: new Date('2023-02-01'), updatedAt: new Date('2023-02-01') },
  { id: 'cat-7',  name: 'Roofing',               description: 'Roofing sheets, nails and roofing accessories',                createdAt: new Date('2023-02-15'), updatedAt: new Date('2023-02-15') },
  { id: 'cat-8',  name: 'Wood & Timber',         description: 'Plywood, planks and timber products',                         createdAt: new Date('2023-03-01'), updatedAt: new Date('2023-03-01') },
  { id: 'cat-9',  name: 'Sanitary Ware',         description: 'WC suites, wash basins and bathroom fittings',                 createdAt: new Date('2023-03-01'), updatedAt: new Date('2023-03-01') },
  { id: 'cat-10', name: 'Hardware & Fasteners',  description: 'Screws, nails, bolts and general hardware',                    createdAt: new Date('2023-04-10'), updatedAt: new Date('2023-04-10') }
];

const MOCK_MEASUREMENT_UNITS: MeasurementUnit[] = [
  { id: 'unit-1', name: 'Each',      code: 'EACH', description: 'Single individual unit',        createdAt: new Date('2023-01-15'), updatedAt: new Date('2023-01-15') },
  { id: 'unit-2', name: 'Box',       code: 'BOX',  description: 'Boxed unit of multiple pieces',  createdAt: new Date('2023-01-15'), updatedAt: new Date('2023-01-15') },
  { id: 'unit-3', name: 'Kilogram',  code: 'KG',   description: 'Weight measured in kilograms',   createdAt: new Date('2023-01-15'), updatedAt: new Date('2023-01-15') },
  { id: 'unit-4', name: 'Litre',     code: 'LITER',description: 'Volume measured in litres',      createdAt: new Date('2023-01-15'), updatedAt: new Date('2023-01-15') },
  { id: 'unit-5', name: 'Metre',     code: 'METER',description: 'Length measured in metres',      createdAt: new Date('2023-01-15'), updatedAt: new Date('2023-01-15') },
  { id: 'unit-6', name: 'Ton',       code: 'TON',  description: 'Weight measured in metric tons', createdAt: new Date('2023-02-01'), updatedAt: new Date('2023-02-01') },
  { id: 'unit-7', name: 'Bag',       code: 'BAG',  description: 'Bagged unit (e.g. cement bags)', createdAt: new Date('2023-02-01'), updatedAt: new Date('2023-02-01') },
  { id: 'unit-8', name: 'Roll',      code: 'ROLL', description: 'Rolled unit (e.g. cable rolls)', createdAt: new Date('2023-02-15'), updatedAt: new Date('2023-02-15') },
  { id: 'unit-9', name: 'Set',       code: 'SET',  description: 'Matched set of parts',           createdAt: new Date('2023-03-01'), updatedAt: new Date('2023-03-01') }
];

const MOCK_SUPPLIERS: Supplier[] = [
  { id: 'sup-1', name: 'Dangote Cement Factory',      email: 'sales@dangotecement.com',      phone: '+234-1-448-0001', address: 'Ibese Plant, Ogun State, Nigeria',        contactPerson: 'Ibrahim Sule',    createdAt: new Date('2023-01-10'), updatedAt: new Date('2023-01-10') },
  { id: 'sup-2', name: 'Niger Delta Plastics Ltd',    email: 'info@ndplastics.ng',           phone: '+234-84-770-2201', address: 'Trans-Amadi Industrial Layout, Port Harcourt', contactPerson: 'Ngozi Amadi',     createdAt: new Date('2023-01-20'), updatedAt: new Date('2023-01-20') },
  { id: 'sup-3', name: 'Coleman Cables Nigeria',      email: 'orders@colemancables.com.ng',  phone: '+234-1-271-3300',  address: '19 Iyalla Street, Surulere, Lagos',       contactPerson: 'David Ekpo',      createdAt: new Date('2023-02-05'), updatedAt: new Date('2023-02-05') },
  { id: 'sup-4', name: 'Tropical Timber Mills',       email: 'sales@tropicaltimber.ng',      phone: '+234-9-670-4410',  address: 'Kilometer 12, Kaduna Road, Abuja',        contactPerson: 'Solomon Danjuma', createdAt: new Date('2023-02-18'), updatedAt: new Date('2023-02-18') },
  { id: 'sup-5', name: 'Porcelain Palace Lagos',      email: 'contact@porcelainpalace.ng',   phone: '+234-1-905-6612',  address: '44 Ikorodu Road, Lagos',                  contactPerson: 'Funmi Adebayo',   createdAt: new Date('2023-03-02'), updatedAt: new Date('2023-03-02') },
  { id: 'sup-6', name: 'Roca Sanitaryware Nigeria',   email: 'ng.sales@roca.com',            phone: '+234-1-462-7788',  address: '3 Ozumba Mbadiwe Avenue, Victoria Island, Lagos', contactPerson: 'Patrick Nnamdi', createdAt: new Date('2023-03-15'), updatedAt: new Date('2023-03-15') },
  { id: 'sup-7', name: 'Delta Steel Company',         email: 'procurement@deltasteel.ng',    phone: '+234-56-610-3390', address: 'Ovwian-Aladja, Delta State, Nigeria',     contactPerson: 'Efe Okonta',      createdAt: new Date('2023-04-01'), updatedAt: new Date('2023-04-01') },
  { id: 'sup-8', name: 'Ace Hardware Supplies Nigeria', email: 'sales@acehardware.ng',       phone: '+234-1-330-8845',  address: '12 Nnamdi Azikiwe Street, Onitsha, Anambra', contactPerson: 'Chidi Eze',      createdAt: new Date('2023-04-20'), updatedAt: new Date('2023-04-20') }
];

const MOCK_PRODUCTS: Product[] = [
  { id: 'prod-1',  sku: 'CEM-DG-425',      name: 'Cement Dangote Grade 42.5R',       description: 'High-strength Portland-limestone cement, 50kg bag, ideal for all structural applications.', category: 'Building Materials',   subCategory: 'Cement',           brand: 'Dangote',   unitOfMeasure: 'EACH', costPrice: 6000,   sellingPrice: 7000,   stockQuantity: 4800, weight: 50,   dimensions: { length: 60, width: 40, height: 10 }, images: [], tags: ['cement', 'bestseller'],        status: ProductStatus.ACTIVE,       supplierIds: ['sup-1'], createdAt: new Date('2023-01-15'), updatedAt: new Date('2026-08-01') },
  { id: 'prod-2',  sku: 'IRN-16MM-TON',    name: 'Iron Rod 16mm (Per Ton)',          description: 'High-tensile deformed steel reinforcement bar, 16mm diameter, sold per metric ton.',       category: 'Metal & Steel',         subCategory: 'Rebar',            brand: 'Delta Steel', unitOfMeasure: 'KG',  costPrice: 300000, sellingPrice: 350000, stockQuantity: 127,  weight: 1000, dimensions: { length: 1200, width: 1.6, height: 1.6 }, images: [], tags: ['steel', 'rebar'],           status: ProductStatus.ACTIVE,       supplierIds: ['sup-7'], createdAt: new Date('2023-01-20'), updatedAt: new Date('2026-08-01') },
  { id: 'prod-3',  sku: 'PNT-WS-20L',      name: 'Wall Paint White Satin 20L',       description: 'Premium washable satin-finish emulsion paint, 20-litre pail, interior and exterior use.',    category: 'Paints & Finishes',     subCategory: 'Emulsion',         brand: 'Dulux',      unitOfMeasure: 'LITER', costPrice: 18000, sellingPrice: 24000, stockQuantity: 925,  weight: 22,   dimensions: { length: 30, width: 30, height: 35 }, images: [], tags: ['paint', 'interior'],       status: ProductStatus.ACTIVE,       supplierIds: [],        createdAt: new Date('2023-02-01'), updatedAt: new Date('2026-07-15') },
  { id: 'prod-4',  sku: 'PVC-4IN-6M',      name: 'PVC Pipes 4-inch (Length 6m)',     description: 'Schedule-40 uPVC drainage pipe, 4-inch diameter, 6-metre length, solvent-weld ends.',       category: 'Plumbing & Pipes',      subCategory: 'Pipes',            brand: 'Niger Delta Plastics', unitOfMeasure: 'EACH', costPrice: 5000, sellingPrice: 7000, stockQuantity: 4540, weight: 8,    dimensions: { length: 600, width: 10, height: 10 }, images: [], tags: ['plumbing', 'pvc'],         status: ProductStatus.ACTIVE,       supplierIds: ['sup-2'], createdAt: new Date('2023-02-10'), updatedAt: new Date('2026-07-20') },
  { id: 'prod-5',  sku: 'TIL-FLR-6060',    name: 'Floor Tiles 60x60cm (Box)',        description: 'Polished porcelain floor tiles, 60x60cm, 4 pieces per box (1.44sqm coverage).',            category: 'Tiles & Flooring',      subCategory: 'Floor Tiles',      brand: 'Porcelain Palace', unitOfMeasure: 'BOX', costPrice: 5000, sellingPrice: 7500, stockQuantity: 3370, weight: 32,   dimensions: { length: 62, width: 62, height: 8 }, images: [], tags: ['tiles', 'flooring'],       status: ProductStatus.ACTIVE,       supplierIds: ['sup-5'], createdAt: new Date('2023-02-20'), updatedAt: new Date('2026-06-30') },
  { id: 'prod-6',  sku: 'ELC-CBL-15-100',  name: 'Electrical Cable 1.5mm (100m Roll)', description: 'Single-core PVC-insulated copper wiring cable, 1.5mm², 100-metre roll.',                  category: 'Electrical',            subCategory: 'Cables',           brand: 'Coleman',    unitOfMeasure: 'EACH', costPrice: 11000, sellingPrice: 15000, stockQuantity: 665, weight: 12,   dimensions: { length: 40, width: 40, height: 15 }, images: [], tags: ['electrical', 'cable'],     status: ProductStatus.ACTIVE,       supplierIds: ['sup-3'], createdAt: new Date('2023-03-01'), updatedAt: new Date('2026-05-20') },
  { id: 'prod-7',  sku: 'ROF-LS-MTR',      name: 'Roofing Sheet Long Span (Per Meter)', description: 'Pre-painted aluminium long-span roofing sheet, 0.45mm gauge, sold per linear metre.',    category: 'Roofing',               subCategory: 'Roofing Sheets',   brand: 'Colorbond',  unitOfMeasure: 'METER', costPrice: 6000, sellingPrice: 8500, stockQuantity: 8020, weight: 3.5,  dimensions: { length: 100, width: 90, height: 1 }, images: [], tags: ['roofing', 'aluminium'],   status: ProductStatus.ACTIVE,       supplierIds: [],        createdAt: new Date('2023-03-10'), updatedAt: new Date('2026-08-01') },
  { id: 'prod-8',  sku: 'PLY-18MM-4X8',    name: 'Plywood Sheet 18mm (4x8ft)',       description: 'Marine-grade plywood sheet, 18mm thickness, 4ft x 8ft panel.',                             category: 'Wood & Timber',         subCategory: 'Plywood',          brand: 'Tropical Timber', unitOfMeasure: 'EACH', costPrice: 22000, sellingPrice: 30000, stockQuantity: 570, weight: 28,  dimensions: { length: 244, width: 122, height: 1.8 }, images: [], tags: ['wood', 'plywood'],       status: ProductStatus.ACTIVE,       supplierIds: ['sup-4'], createdAt: new Date('2023-03-20'), updatedAt: new Date('2026-07-01') },
  { id: 'prod-9',  sku: 'SAN-WC-SUITE',    name: 'Sanitary Ware — WC Suite Set',     description: 'Close-coupled ceramic WC suite with cistern, seat and fittings included.',                 category: 'Sanitary Ware',         subCategory: 'WC Suites',        brand: 'Roca',       unitOfMeasure: 'EACH', costPrice: 200000, sellingPrice: 260000, stockQuantity: 28, weight: 35,  dimensions: { length: 70, width: 40, height: 75 }, images: [], tags: ['sanitary', 'bathroom'],  status: ProductStatus.ACTIVE,       supplierIds: ['sup-6'], createdAt: new Date('2023-04-01'), updatedAt: new Date('2026-06-15') },
  { id: 'prod-10', sku: 'SAN-WB-SET',      name: 'Ceramic Wash Basin Set',           description: 'Pedestal-mounted ceramic wash basin with tap and waste fittings — currently out of stock.', category: 'Sanitary Ware',         subCategory: 'Wash Basins',      brand: 'Roca',       unitOfMeasure: 'EACH', costPrice: 45000, sellingPrice: 60000, stockQuantity: 0, weight: 18,   dimensions: { length: 55, width: 45, height: 85 }, images: [], tags: ['sanitary', 'basin'],     status: ProductStatus.OUT_OF_STOCK, supplierIds: ['sup-6'], createdAt: new Date('2023-05-05'), updatedAt: new Date('2026-08-10') },
  { id: 'prod-11', sku: 'HDW-SCR-200',     name: 'Wood Screws Assorted Box (200pc)', description: 'Mixed-size zinc-plated wood screws, 200 pieces per box, for general carpentry.',            category: 'Hardware & Fasteners',  subCategory: 'Screws & Fasteners', brand: 'Ace Hardware', unitOfMeasure: 'BOX', costPrice: 3500, sellingPrice: 5000, stockQuantity: 340, weight: 2.5, dimensions: { length: 20, width: 15, height: 8 }, images: [], tags: ['hardware', 'fasteners'], status: ProductStatus.ACTIVE,       supplierIds: ['sup-8'], createdAt: new Date('2023-05-15'), updatedAt: new Date('2026-07-05') },
  { id: 'prod-12', sku: 'ELC-FAN-56W',     name: 'Ceiling Fan 56-inch White',        description: 'Three-blade ceiling fan with light kit, 56-inch sweep, remote control included.',           category: 'Electrical',            subCategory: 'Fans & Lighting',  brand: 'Binatone',   unitOfMeasure: 'EACH', costPrice: 18000, sellingPrice: 25000, stockQuantity: 210, weight: 6,   dimensions: { length: 142, width: 142, height: 40 }, images: [], tags: ['electrical', 'fan'],     status: ProductStatus.ACTIVE,       supplierIds: ['sup-3'], createdAt: new Date('2023-06-01'), updatedAt: new Date('2026-06-20') },
  { id: 'prod-13', sku: 'ELC-WH-30L-OLD',  name: 'Water Heater 30L (Old Model)',     description: 'Discontinued 30-litre electric storage water heater, replaced by newer energy-efficient model.', category: 'Electrical',       subCategory: 'Water Heaters',    brand: 'Binatone',   unitOfMeasure: 'EACH', costPrice: 35000, sellingPrice: 48000, stockQuantity: 15, weight: 14,   dimensions: { length: 45, width: 45, height: 60 }, images: [], tags: ['electrical', 'discontinued'], status: ProductStatus.DISCONTINUED, supplierIds: ['sup-3'], createdAt: new Date('2022-11-10'), updatedAt: new Date('2026-01-05') }
];

const MOCK_DASHBOARD_DATA: InventoryDashboardData = {
  stats: MOCK_STATS,
  alerts: MOCK_ALERTS,
  recentMovements: MOCK_MOVEMENTS,
  topProducts: MOCK_TOP_PRODUCTS,
  branchSummaries: MOCK_BRANCH_SUMMARIES,
  quickActions: []
};

// ============================================================
// INVENTORY SERVICE (LocalStorage implementation)
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class InventoryService {

  // ----------------------------------------------------
  // STATE MANAGEMENT (RxJS subjects)
  // ----------------------------------------------------
  private dashboardDataSubject = new BehaviorSubject<InventoryDashboardData | null>(null);
  dashboardData$ = this.dashboardDataSubject.asObservable();

  private productsSubject = new BehaviorSubject<Product[]>([]);
  products$ = this.productsSubject.asObservable();

  private branchesSubject = new BehaviorSubject<Branch[]>([]);
  branches$ = this.branchesSubject.asObservable();

  private branchInventorySubject = new BehaviorSubject<BranchInventory[]>([]);
  branchInventory$ = this.branchInventorySubject.asObservable();

  private movementsSubject = new BehaviorSubject<StockMovement[]>([]);
  movements$ = this.movementsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  error$ = this.errorSubject.asObservable();

  private currentBranchIdSubject = new BehaviorSubject<string | null>(null);
  currentBranchId$ = this.currentBranchIdSubject.asObservable();

  // ----------------------------------------------------
  // CONSTRUCTOR – seed LocalStorage if empty
  // ----------------------------------------------------
  constructor() {
    if (!localStorage.getItem(LOCAL_KEYS.DASHBOARD)) {
      // seed all keys with initial mock data
      localStorage.setItem(LOCAL_KEYS.DASHBOARD, JSON.stringify(MOCK_DASHBOARD_DATA));
      localStorage.setItem(LOCAL_KEYS.PRODUCTS, JSON.stringify(MOCK_PRODUCTS));
      localStorage.setItem(LOCAL_KEYS.BRANCHES, JSON.stringify(MOCK_BRANCHES));
      localStorage.setItem(LOCAL_KEYS.BRANCH_INVENTORY, JSON.stringify(MOCK_BRANCH_INVENTORY));
      localStorage.setItem(LOCAL_KEYS.MOVEMENTS, JSON.stringify(MOCK_MOVEMENTS));
      localStorage.setItem(LOCAL_KEYS.CATEGORIES, JSON.stringify(MOCK_CATEGORIES));
      localStorage.setItem(LOCAL_KEYS.MEASUREMENT_UNITS, JSON.stringify(MOCK_MEASUREMENT_UNITS));
      localStorage.setItem(LOCAL_KEYS.SUPPLIERS, JSON.stringify(MOCK_SUPPLIERS));
    } else {
      // Back-fill any keys that were previously seeded as empty arrays
      const existingBranches = JSON.parse(localStorage.getItem(LOCAL_KEYS.BRANCHES) as string) as Branch[];
      if (!existingBranches || existingBranches.length === 0) {
        localStorage.setItem(LOCAL_KEYS.BRANCHES, JSON.stringify(MOCK_BRANCHES));
      }
      const existingMovements = JSON.parse(localStorage.getItem(LOCAL_KEYS.MOVEMENTS) as string) as StockMovement[];
      if (!existingMovements || existingMovements.length === 0) {
        localStorage.setItem(LOCAL_KEYS.MOVEMENTS, JSON.stringify(MOCK_MOVEMENTS));
      }
      const existingInventory = JSON.parse(localStorage.getItem(LOCAL_KEYS.BRANCH_INVENTORY) as string) as BranchInventory[];
      if (!existingInventory || existingInventory.length === 0) {
        localStorage.setItem(LOCAL_KEYS.BRANCH_INVENTORY, JSON.stringify(MOCK_BRANCH_INVENTORY));
      }
      const existingProducts = JSON.parse(localStorage.getItem(LOCAL_KEYS.PRODUCTS) as string) as Product[];
      if (!existingProducts || existingProducts.length === 0) {
        localStorage.setItem(LOCAL_KEYS.PRODUCTS, JSON.stringify(MOCK_PRODUCTS));
      }
      const existingCategories = JSON.parse(localStorage.getItem(LOCAL_KEYS.CATEGORIES) as string) as Category[];
      if (!existingCategories || existingCategories.length === 0) {
        localStorage.setItem(LOCAL_KEYS.CATEGORIES, JSON.stringify(MOCK_CATEGORIES));
      }
      const existingUnits = JSON.parse(localStorage.getItem(LOCAL_KEYS.MEASUREMENT_UNITS) as string) as MeasurementUnit[];
      if (!existingUnits || existingUnits.length === 0) {
        localStorage.setItem(LOCAL_KEYS.MEASUREMENT_UNITS, JSON.stringify(MOCK_MEASUREMENT_UNITS));
      }
      const existingSuppliers = JSON.parse(localStorage.getItem(LOCAL_KEYS.SUPPLIERS) as string) as Supplier[];
      if (!existingSuppliers || existingSuppliers.length === 0) {
        localStorage.setItem(LOCAL_KEYS.SUPPLIERS, JSON.stringify(MOCK_SUPPLIERS));
      }
      // Refresh dashboard branch summaries with richer data
      const dash = JSON.parse(localStorage.getItem(LOCAL_KEYS.DASHBOARD) as string) as InventoryDashboardData;
      dash.branchSummaries = MOCK_BRANCH_SUMMARIES;
      dash.recentMovements = MOCK_MOVEMENTS.slice(0, 5);
      localStorage.setItem(LOCAL_KEYS.DASHBOARD, JSON.stringify(dash));
    }
    this.loadInitialState();
  }

  private loadInitialState(): void {
    this.dashboardDataSubject.next(
      JSON.parse(localStorage.getItem(LOCAL_KEYS.DASHBOARD) as string) as InventoryDashboardData
    );
    this.productsSubject.next(
      JSON.parse(localStorage.getItem(LOCAL_KEYS.PRODUCTS) as string) as Product[]
    );
    this.branchesSubject.next(
      JSON.parse(localStorage.getItem(LOCAL_KEYS.BRANCHES) as string) as Branch[]
    );
    // Removed erroneous self-referential call; quick actions are accessed via component subscription.


    this.branchInventorySubject.next(
      JSON.parse(localStorage.getItem(LOCAL_KEYS.BRANCH_INVENTORY) as string) as BranchInventory[]
    );
    this.movementsSubject.next(
      JSON.parse(localStorage.getItem(LOCAL_KEYS.MOVEMENTS) as string) as StockMovement[]
    );
  }

  // ----------------------------------------------------
  // DASHBOARD
  // ----------------------------------------------------
  /** Get full dashboard data */
  getDashboardData(): Observable<InventoryDashboardData> {
    this.loadingSubject.next(true);
    const data = JSON.parse(localStorage.getItem(LOCAL_KEYS.DASHBOARD) as string) as InventoryDashboardData;
    this.dashboardDataSubject.next(data);
    this.loadingSubject.next(false);
    return of(data);
  }

  /** Get only stats */
  getDashboardStats(): Observable<InventoryDashboardStats> {
    const dash = JSON.parse(localStorage.getItem(LOCAL_KEYS.DASHBOARD) as string) as InventoryDashboardData;
    return of(dash.stats);
  }

  /** Get alerts */
  getDashboardAlerts(): Observable<StockAlert[]> {
    const dash = JSON.parse(localStorage.getItem(LOCAL_KEYS.DASHBOARD) as string) as InventoryDashboardData;
    return of(dash.alerts);
  }

  /** Recent movements (limit optional) */
  getRecentMovements(limit: number = 10): Observable<StockMovement[]> {
    const dash = JSON.parse(localStorage.getItem(LOCAL_KEYS.DASHBOARD) as string) as InventoryDashboardData;
    return of(dash.recentMovements.slice(0, limit));
  }

  /** Top products (limit optional) */
  getTopProducts(limit: number = 5): Observable<ProductPerformance[]> {
    const dash = JSON.parse(localStorage.getItem(LOCAL_KEYS.DASHBOARD) as string) as InventoryDashboardData;
    return of(dash.topProducts.slice(0, limit));
  }

  /** Branch summaries */
  getBranchSummaries(): Observable<BranchStockSummary[]> {
    const dash = JSON.parse(localStorage.getItem(LOCAL_KEYS.DASHBOARD) as string) as InventoryDashboardData;
    return of(dash.branchSummaries);
  }

  /** Resolve an alert – marks it resolved in storage */
  resolveAlert(alertId: string): Observable<void> {
    const dash = JSON.parse(localStorage.getItem(LOCAL_KEYS.DASHBOARD) as string) as InventoryDashboardData;
    const alert = dash.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.isResolved = true;
      localStorage.setItem(LOCAL_KEYS.DASHBOARD, JSON.stringify(dash));
    }
    return of(undefined);
  }

  // ----------------------------------------------------
  // PRODUCTS
  // ----------------------------------------------------
  /** Get all products (filters ignored for local mode) */
  getProducts(_filters?: ProductFilters): Observable<PaginatedResponse<Product>> {
    this.loadingSubject.next(true);
    const products = JSON.parse(localStorage.getItem(LOCAL_KEYS.PRODUCTS) as string) as Product[];
    const response: PaginatedResponse<Product> = {
      data: products,
      total: products.length,
      page: 1,
      limit: products.length,
      totalPages: 1
    };
    this.productsSubject.next(products);
    this.loadingSubject.next(false);
    return of(response);
  }

  /** Single product by id */
  getProduct(id: string): Observable<Product> {
    this.loadingSubject.next(true);
    const products = JSON.parse(localStorage.getItem(LOCAL_KEYS.PRODUCTS) as string) as Product[];
    const product = products.find(p => p.id === id);
    this.loadingSubject.next(false);
    return product ? of(product) : throwError(() => new Error('Product not found'));
  }

  /** Create product – generates a simple temporary id */
  createProduct(product: Partial<Product>): Observable<Product> {
    this.loadingSubject.next(true);
    const products = JSON.parse(localStorage.getItem(LOCAL_KEYS.PRODUCTS) as string) as Product[];
    const newProduct: Product = {
      ...(product as Product),
      id: 'prod-' + Date.now(),
      createdAt: new Date(),
      updatedAt: new Date()
    } as Product;
    products.push(newProduct);
    localStorage.setItem(LOCAL_KEYS.PRODUCTS, JSON.stringify(products));
    this.productsSubject.next(products);
    this.loadingSubject.next(false);
    return of(newProduct);
  }

  /** Update existing product */
  updateProduct(id: string, product: Partial<Product>): Observable<Product> {
    this.loadingSubject.next(true);
    const products = JSON.parse(localStorage.getItem(LOCAL_KEYS.PRODUCTS) as string) as Product[];
    const index = products.findIndex(p => p.id === id);
    if (index === -1) {
      this.loadingSubject.next(false);
      return throwError(() => new Error('Product not found'));
    }
    const updated = { ...products[index], ...product, updatedAt: new Date() } as Product;
    products[index] = updated;
    localStorage.setItem(LOCAL_KEYS.PRODUCTS, JSON.stringify(products));
    this.productsSubject.next(products);
    this.loadingSubject.next(false);
    return of(updated);
  }

  /** Delete product */
  deleteProduct(id: string): Observable<void> {
    this.loadingSubject.next(true);
    let products = JSON.parse(localStorage.getItem(LOCAL_KEYS.PRODUCTS) as string) as Product[];
    products = products.filter(p => p.id !== id);
    localStorage.setItem(LOCAL_KEYS.PRODUCTS, JSON.stringify(products));
    this.productsSubject.next(products);
    this.loadingSubject.next(false);
    return of(undefined);
  }

  // ----------------------------------------------------
  // BRANCHES
  // ----------------------------------------------------
  getBranches(): Observable<Branch[]> {
    const branches = JSON.parse(localStorage.getItem(LOCAL_KEYS.BRANCHES) as string) as Branch[];
    this.branchesSubject.next(branches);
    return of(branches);
  }

  getBranch(id: string): Observable<Branch> {
    const branches = JSON.parse(localStorage.getItem(LOCAL_KEYS.BRANCHES) as string) as Branch[];
    const branch = branches.find(b => b.id === id);
    return branch ? of(branch) : throwError(() => new Error('Branch not found'));
  }

  updateBranch(id: string, branch: Partial<Branch>): Observable<Branch> {
    const branches = JSON.parse(localStorage.getItem(LOCAL_KEYS.BRANCHES) as string) as Branch[];
    const index = branches.findIndex(b => b.id === id);
    if (index === -1) {
      return throwError(() => new Error('Branch not found'));
    }
    const updated = { ...branches[index], ...branch, updatedAt: new Date() } as Branch;
    branches[index] = updated;
    localStorage.setItem(LOCAL_KEYS.BRANCHES, JSON.stringify(branches));
    this.branchesSubject.next(branches);
    return of(updated);
  }

  createBranch(branch: Partial<Branch>): Observable<Branch> {
    const branches = JSON.parse(localStorage.getItem(LOCAL_KEYS.BRANCHES) as string) as Branch[];
    const newBranch: Branch = {
      ...(branch as Branch),
      id: 'br-' + Date.now(),
      createdAt: new Date(),
      updatedAt: new Date()
    } as Branch;
    branches.push(newBranch);
    localStorage.setItem(LOCAL_KEYS.BRANCHES, JSON.stringify(branches));
    this.branchesSubject.next(branches);
    return of(newBranch);
  }

  /** Get inventory for a branch, scoped to that branch. */
  getBranchInventory(branchId: string): Observable<BranchInventory[]> {
    const allInventory = JSON.parse(localStorage.getItem(LOCAL_KEYS.BRANCH_INVENTORY) as string) as BranchInventory[];
    const inventory = branchId ? allInventory.filter(i => i.branchId === branchId) : allInventory;
    this.branchInventorySubject.next(inventory);
    return of(inventory);
  }

  setCurrentBranch(branchId: string | null): void {
    this.currentBranchIdSubject.next(branchId);
  }

  getCurrentBranchId(): string | null {
    return this.currentBranchIdSubject.value;
  }

  // ----------------------------------------------------
  // STOCK MOVEMENTS
  // ----------------------------------------------------
  /** Get stock movements (filters ignored) */
  getMovements(_filters?: MovementFilters): Observable<PaginatedResponse<StockMovement>> {
    this.loadingSubject.next(true);
    const movements = JSON.parse(localStorage.getItem(LOCAL_KEYS.MOVEMENTS) as string) as StockMovement[];
    const response: PaginatedResponse<StockMovement> = {
      data: movements,
      total: movements.length,
      page: 1,
      limit: movements.length,
      totalPages: 1
    };
    this.movementsSubject.next(movements);
    this.loadingSubject.next(false);
    return of(response);
  }

  /** Create a movement (transfer / adjustment / etc.) */
  createMovement(movement: Partial<StockMovement>): Observable<StockMovement> {
    this.loadingSubject.next(true);
    const movements = JSON.parse(localStorage.getItem(LOCAL_KEYS.MOVEMENTS) as string) as StockMovement[];
    const newMovement: StockMovement = {
      ...(movement as StockMovement),
      id: 'mov-' + Date.now(),
      createdAt: new Date(),
      status: MovementStatus.PENDING
    } as StockMovement;
    movements.push(newMovement);
    localStorage.setItem(LOCAL_KEYS.MOVEMENTS, JSON.stringify(movements));
    this.movementsSubject.next(movements);
    this.loadingSubject.next(false);
    return of(newMovement);
  }

  /** Update a movement */
  updateMovement(id: string, movement: Partial<StockMovement>): Observable<StockMovement> {
    this.loadingSubject.next(true);
    const movements = JSON.parse(localStorage.getItem(LOCAL_KEYS.MOVEMENTS) as string) as StockMovement[];
    const index = movements.findIndex(m => m.id === id);
    if (index === -1) {
      this.loadingSubject.next(false);
      return throwError(() => new Error('Movement not found'));
    }
    const updated = { ...movements[index], ...movement, updatedAt: new Date() } as StockMovement;
    movements[index] = updated;
    localStorage.setItem(LOCAL_KEYS.MOVEMENTS, JSON.stringify(movements));
    this.movementsSubject.next(movements);
    this.loadingSubject.next(false);
    return of(updated);
  }

  /** Approve a movement – set status to COMPLETED */
  approveMovement(id: string): Observable<void> {
    this.loadingSubject.next(true);
    const movements = JSON.parse(localStorage.getItem(LOCAL_KEYS.MOVEMENTS) as string) as StockMovement[];
    const movement = movements.find(m => m.id === id);
    if (movement) {
      movement.status = MovementStatus.COMPLETED;
      (movement as any).approvedAt = new Date();
      localStorage.setItem(LOCAL_KEYS.MOVEMENTS, JSON.stringify(movements));
    }
    this.movementsSubject.next(movements);
    this.loadingSubject.next(false);
    return of(undefined);
  }

  /** Reject a movement – set status to CANCELLED */
  rejectMovement(id: string, _reason: string): Observable<void> {
    this.loadingSubject.next(true);
    const movements = JSON.parse(localStorage.getItem(LOCAL_KEYS.MOVEMENTS) as string) as StockMovement[];
    const movement = movements.find(m => m.id === id);
    if (movement) {
      movement.status = MovementStatus.CANCELLED;
      localStorage.setItem(LOCAL_KEYS.MOVEMENTS, JSON.stringify(movements));
    }
    this.movementsSubject.next(movements);
    this.loadingSubject.next(false);
    return of(undefined);
  }

// ----------------------------------------------------
// QUICK ACTIONS (read from dashboard data)
// ----------------------------------------------------
getQuickActions(): Observable<QuickAction[]> {
  const dash = JSON.parse(localStorage.getItem(LOCAL_KEYS.DASHBOARD) as string) as InventoryDashboardData;
  return of(dash.quickActions);
}

// ----------------------------------------------------
// CATEGORIES CRUD
// ----------------------------------------------------
getCategories(): Observable<Category[]> {
  const categories = JSON.parse(localStorage.getItem(LOCAL_KEYS.CATEGORIES) as string) as Category[];
  return of(categories);
}
createCategory(cat: Partial<Category>): Observable<Category[]> {
  const categories = JSON.parse(localStorage.getItem(LOCAL_KEYS.CATEGORIES) as string) as Category[];
  const newCat: Category = { ...(cat as Category), id: 'cat-' + Date.now() } as Category;
  categories.push(newCat);
  localStorage.setItem(LOCAL_KEYS.CATEGORIES, JSON.stringify(categories));
  return of(categories);
}
updateCategory(id: string, cat: Partial<Category>): Observable<Category[]> {
  const categories = JSON.parse(localStorage.getItem(LOCAL_KEYS.CATEGORIES) as string) as Category[];
  const idx = categories.findIndex(c => c.id === id);
  if (idx === -1) return throwError(() => new Error('Category not found'));
  const updated = { ...categories[idx], ...cat } as Category;
  categories[idx] = updated;
  localStorage.setItem(LOCAL_KEYS.CATEGORIES, JSON.stringify(categories));
  return of(categories);
}
deleteCategory(id: string): Observable<Category[]> {
  let categories = JSON.parse(localStorage.getItem(LOCAL_KEYS.CATEGORIES) as string) as Category[];
  categories = categories.filter(c => c.id !== id);
  localStorage.setItem(LOCAL_KEYS.CATEGORIES, JSON.stringify(categories));
  return of(categories);
}

// ----------------------------------------------------
// MEASUREMENT UNITS CRUD
// ----------------------------------------------------
getMeasurementUnits(): Observable<MeasurementUnit[]> {
  const units = JSON.parse(localStorage.getItem(LOCAL_KEYS.MEASUREMENT_UNITS) as string) as MeasurementUnit[];
  return of(units);
}
createMeasurementUnit(unit: Partial<MeasurementUnit>): Observable<MeasurementUnit[]> {
  const units = JSON.parse(localStorage.getItem(LOCAL_KEYS.MEASUREMENT_UNITS) as string) as MeasurementUnit[];
  const newUnit: MeasurementUnit = { ...(unit as MeasurementUnit), id: 'unit-' + Date.now() } as MeasurementUnit;
  units.push(newUnit);
  localStorage.setItem(LOCAL_KEYS.MEASUREMENT_UNITS, JSON.stringify(units));
  return of(units);
}
updateMeasurementUnit(id: string, unit: Partial<MeasurementUnit>): Observable<MeasurementUnit[]> {
  const units = JSON.parse(localStorage.getItem(LOCAL_KEYS.MEASUREMENT_UNITS) as string) as MeasurementUnit[];
  const idx = units.findIndex(u => u.id === id);
  if (idx === -1) return throwError(() => new Error('Unit not found'));
  const updated = { ...units[idx], ...unit } as MeasurementUnit;
  units[idx] = updated;
  localStorage.setItem(LOCAL_KEYS.MEASUREMENT_UNITS, JSON.stringify(units));
  return of(units);
}
deleteMeasurementUnit(id: string): Observable<MeasurementUnit[]> {
  let units = JSON.parse(localStorage.getItem(LOCAL_KEYS.MEASUREMENT_UNITS) as string) as MeasurementUnit[];
  units = units.filter(u => u.id !== id);
  localStorage.setItem(LOCAL_KEYS.MEASUREMENT_UNITS, JSON.stringify(units));
  return of(units);
}

// ----------------------------------------------------
// SUPPLIERS CRUD
// ----------------------------------------------------
getSuppliers(): Observable<Supplier[]> {
  const suppliers = JSON.parse(localStorage.getItem(LOCAL_KEYS.SUPPLIERS) as string) as Supplier[];
  return of(suppliers);
}
createSupplier(supplier: Partial<Supplier>): Observable<Supplier[]> {
  const suppliers = JSON.parse(localStorage.getItem(LOCAL_KEYS.SUPPLIERS) as string) as Supplier[];
  const newSup: Supplier = { ...(supplier as Supplier), id: 'sup-' + Date.now() } as Supplier;
  suppliers.push(newSup);
  localStorage.setItem(LOCAL_KEYS.SUPPLIERS, JSON.stringify(suppliers));
  return of(suppliers);
}
updateSupplier(id: string, supplier: Partial<Supplier>): Observable<Supplier[]> {
  const suppliers = JSON.parse(localStorage.getItem(LOCAL_KEYS.SUPPLIERS) as string) as Supplier[];
  const idx = suppliers.findIndex(s => s.id === id);
  if (idx === -1) return throwError(() => new Error('Supplier not found'));
  const updated = { ...suppliers[idx], ...supplier } as Supplier;
  suppliers[idx] = updated;
  localStorage.setItem(LOCAL_KEYS.SUPPLIERS, JSON.stringify(suppliers));
  return of(suppliers);
}
deleteSupplier(id: string): Observable<Supplier[]> {
  let suppliers = JSON.parse(localStorage.getItem(LOCAL_KEYS.SUPPLIERS) as string) as Supplier[];
  suppliers = suppliers.filter(s => s.id !== id);
  localStorage.setItem(LOCAL_KEYS.SUPPLIERS, JSON.stringify(suppliers));
  return of(suppliers);
}

// ----------------------------------------------------
// SINGLE MOVEMENT FETCH
// ----------------------------------------------------
getMovement(id: string): Observable<StockMovement> {
  const movements = JSON.parse(localStorage.getItem(LOCAL_KEYS.MOVEMENTS) as string) as StockMovement[];
  const mov = movements.find(m => m.id === id);
  return mov ? of(mov) : throwError(() => new Error('Movement not found'));
}

// ----------------------------------------------------
// BRANCH ANALYTICS (stub)
// ----------------------------------------------------
getBranchAnalytics(_branchId: string): Observable<any> {
  return of({});
}

}