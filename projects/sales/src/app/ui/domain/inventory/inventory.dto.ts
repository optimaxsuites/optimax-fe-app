// inventory.dto.ts
// ============================================================
// ENUMS
// ============================================================

export enum ProductStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    DISCONTINUED = 'DISCONTINUED',
    OUT_OF_STOCK = 'OUT_OF_STOCK'
}

export enum MovementType {
    PURCHASE = 'PURCHASE',
    TRANSFER = 'TRANSFER',
    SALE = 'SALE',
    RETURN = 'RETURN',
    ADJUSTMENT = 'ADJUSTMENT',
    DAMAGED = 'DAMAGED'
}

export enum MovementStatus {
    PENDING = 'PENDING',
    IN_TRANSIT = 'IN_TRANSIT',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

export enum RestockUrgency {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

export enum RestockStatus {
    DRAFT = 'DRAFT',
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    ORDERED = 'ORDERED',
    RECEIVED = 'RECEIVED'
}

export enum StockAlertType {
    LOW_STOCK = 'LOW_STOCK',
    OUT_OF_STOCK = 'OUT_OF_STOCK',
    EXPIRING = 'EXPIRING',
    OVER_STOCK = 'OVER_STOCK'
}

export enum StockAlertSeverity {
    INFO = 'INFO',
    WARNING = 'WARNING',
    CRITICAL = 'CRITICAL'
}

// ============================================================
// CORE MODELS
// ============================================================

// inventory.dto.ts - Add/Update Product interface

export interface Product {
    id: string;
    productId?: string; // For compatibility with sales service
    sku: string;
    name: string;
    description: string;
    category: string | Category; // Support both string and object
    subCategory: string;
    brand: string;
    unitOfMeasure: 'EACH' | 'BOX' | 'KG' | 'LITER' | 'METER';
    costPrice: number;
    sellingPrice: number;
    unitPrice?: number; // Alias for sellingPrice (for compatibility)
    price?: number; // Another alias
    stockQuantity: number; // ← IMPORTANT: Add this for stock tracking
    weight: number;
    dimensions: {
        length: number;
        width: number;
        height: number;
    };
    images: string[];
    tags: string[];
    status: ProductStatus;
    supplierIds: string[];
    createdAt: Date;
    updatedAt: Date;
}

// Add Category interface if not present
export interface Category {
    id: string;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

// Add MeasurementUnit interface
export interface MeasurementUnit {
    id: string;
    unitId?: string;
    name: string;
    code: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

// Add Supplier interface
export interface Supplier {
    id: string;
    supplierId?: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    contactPerson: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Branch {
    id: string;
    name: string;
    code: string;
    type: 'FLAGSHIP' | 'STANDARD' | 'MINI';
    location: {
        address: string;
        city: string;
        state: string;
        country: string;
        postalCode: string;
        lat: number;
        lng: number;
    };
    contact: {
        phone: string;
        email: string;
        manager: string;
    };
    status: 'ACTIVE' | 'INACTIVE' | 'UNDER_CONSTRUCTION';
    createdAt: Date;
    updatedAt: Date;
}

export interface BranchInventory {
    id: string;
    branchId: string;
    branchName: string;
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    reorderPoint: number;
    reorderQuantity: number;
    safetyStock: number;
    sellingPrice: number;
    costPrice: number;
    lastUpdated: Date;
}

export interface StockMovement {
    id: string;
    productId: string;
    productName: string;
    sku: string;
    fromLocation: {
        type: 'WAREHOUSE' | 'BRANCH' | 'SUPPLIER';
        id: string;
        name: string;
    };
    toLocation: {
        type: 'WAREHOUSE' | 'BRANCH' | 'CUSTOMER';
        id: string;
        name: string;
    };
    quantity: number;
    movementType: MovementType;
    status: MovementStatus;
    cost: number;
    sellingPrice: number;
    trackingNumber: string;
    batchNumber: string;
    expiryDate: Date;
    notes: string;
    scheduledDate?: Date | string;
    createdBy: string;
    createdByName: string;
    approvedBy: string;
    approvedByName: string;
    createdAt: Date;
    approvedAt: Date;
    completedAt: Date;
}

export interface RestockRequest {
    id: string;
    productId: string;
    productName: string;
    sku: string;
    branchId: string;
    branchName: string;
    currentStock: number;
    reorderPoint: number;
    safetyStock: number;
    requestedQuantity: number;
    approvedQuantity: number;
    preferredSupplier: string;
    costEstimate: number;
    urgency: RestockUrgency;
    status: RestockStatus;
    notes: string;
    createdBy: string;
    createdByName: string;
    approvedBy: string;
    approvedByName: string;
    createdAt: Date;
    approvedAt: Date;
    purchaseOrderId: string;
}

export interface StockAlert {
    id: string;
    type: StockAlertType;
    severity: StockAlertSeverity;
    productId: string;
    productName: string;
    sku: string;
    branchId: string;
    branchName: string;
    currentStock: number;
    threshold: number;
    message: string;
    isResolved: boolean;
    createdAt: Date;
    resolvedAt: Date;
}

export interface ProductPerformance {
    productId: string;
    productName: string;
    sku: string;
    category: string;
    totalSold: number;
    totalRevenue: number;
    totalProfit: number;
    averagePrice: number;
    sellThroughRate: number;
    stockTurnover: number;
    daysOfInventory: number;
    performanceScore: number;
    trend: 'UP' | 'DOWN' | 'STABLE';
    period: {
        start: Date;
        end: Date;
    };
}

export interface BranchStockSummary {
    branchId: string;
    branchName: string;
    totalProducts: number;
    totalStockValue: number;
    totalStockUnits: number;
    lowStockCount: number;
    outOfStockCount: number;
    topSellingProducts: {
        productId: string;
        productName: string;
        quantity: number;
        revenue: number;
    }[];
}

// ============================================================
// DASHBOARD MODELS
// ============================================================

export interface InventoryDashboardStats {
    totalSkus: number;
    totalStockValue: number;
    totalStockUnits: number;
    lowStockItems: number;
    outOfStockItems: number;
    totalBranches: number;
    monthlyMovementCount: number;
    monthlyMovementValue: number;
    averageStockTurnover: number;
    totalProfit: number;
    lastUpdated: Date;
}

export interface InventoryDashboardData {
    stats: InventoryDashboardStats;
    alerts: StockAlert[];
    recentMovements: StockMovement[];
    topProducts: ProductPerformance[];
    branchSummaries: BranchStockSummary[];
    quickActions: QuickAction[];
}

export interface QuickAction {
    id: string;
    label: string;
    icon: string;
    route: string;
    color: string;
    description: string;
}

// ============================================================
// RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message: string;
    errors?: string[];
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// ============================================================
// FILTER TYPES
// ============================================================

export interface ProductFilters {
    search?: string;
    category?: string;
    brand?: string;
    status?: ProductStatus;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
}

export interface MovementFilters {
    type?: MovementType;
    status?: MovementStatus;
    branchId?: string;
    productId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
}

export interface RestockFilters {
    status?: RestockStatus;
    urgency?: RestockUrgency;
    branchId?: string;
    productId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function getStockStatus(quantity: number, reorderPoint: number, safetyStock: number): 'CRITICAL' | 'LOW' | 'NORMAL' | 'OVERSTOCK' {
    if (quantity <= 0) return 'CRITICAL';
    if (quantity <= safetyStock) return 'CRITICAL';
    if (quantity <= reorderPoint) return 'LOW';
    if (quantity > reorderPoint * 3) return 'OVERSTOCK';
    return 'NORMAL';
}

export function getStockStatusColor(status: 'CRITICAL' | 'LOW' | 'NORMAL' | 'OVERSTOCK'): string {
    const map = {
        'CRITICAL': '#DC2626',
        'LOW': '#F59E0B',
        'NORMAL': '#2EB270',
        'OVERSTOCK': '#3B82F6'
    };
    return map[status];
}

export function getStockStatusLabel(status: 'CRITICAL' | 'LOW' | 'NORMAL' | 'OVERSTOCK'): string {
    const map = {
        'CRITICAL': 'Critical',
        'LOW': 'Low Stock',
        'NORMAL': 'Normal',
        'OVERSTOCK': 'Overstock'
    };
    return map[status];
}

export function getMovementTypeLabel(type: MovementType): string {
    const map: Record<MovementType, string> = {
        [MovementType.PURCHASE]: 'Purchase',
        [MovementType.TRANSFER]: 'Transfer',
        [MovementType.SALE]: 'Sale',
        [MovementType.RETURN]: 'Return',
        [MovementType.ADJUSTMENT]: 'Adjustment',
        [MovementType.DAMAGED]: 'Damaged'
    };
    return map[type];
}

export function getMovementTypeIcon(type: MovementType): string {
    const map: Record<MovementType, string> = {
        [MovementType.PURCHASE]: 'fa-truck-loading',
        [MovementType.TRANSFER]: 'fa-exchange-alt',
        [MovementType.SALE]: 'fa-shopping-cart',
        [MovementType.RETURN]: 'fa-undo-alt',
        [MovementType.ADJUSTMENT]: 'fa-sliders-h',
        [MovementType.DAMAGED]: 'fa-exclamation-triangle'
    };
    return map[type];
}