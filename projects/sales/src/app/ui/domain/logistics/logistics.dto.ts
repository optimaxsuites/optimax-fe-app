// ============================================================================
// LOGISTICS SUBMODULE — DOMAIN MODELS
// Derived from: Logistics Submodule - Comprehensive PRD Document
// ============================================================================

// ----------------------------------------------------------------------------
// ENUMS / UNION TYPES
// ----------------------------------------------------------------------------

/** 3.1.1 Delivery Types */
export type DeliveryType =
  | 'BRANCH_TRANSFER'
  | 'SUPPLIER_PURCHASE'
  | 'CUSTOMER_DELIVERY'
  | 'RETURN_DELIVERY'
  | 'BULK_TRANSFER';

/** 3.1.2 Delivery Status Workflow */
export type DeliveryStatus =
  | 'PENDING'
  | 'PICKING'
  | 'PACKING'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'DELAYED'
  | 'ARRIVED'
  | 'DELIVERED'
  | 'CANCELLED';

/** 3.1.4 Delivery Priority Levels */
export type DeliveryPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

export type VehicleType = 'VAN' | 'TRUCK' | 'BIKE' | 'CAR' | 'TRICYCLE';

export type VehicleStatus = 'ACTIVE' | 'IDLE' | 'MAINTENANCE' | 'OUT_OF_SERVICE';

export type DriverStatus = 'ON_DUTY' | 'ON_DELIVERY' | 'OFF_DUTY' | 'ON_LEAVE';

export type RouteStatus = 'DRAFT' | 'OPTIMIZED' | 'ACTIVE' | 'COMPLETED';

// ----------------------------------------------------------------------------
// STATIC LOOKUP CONFIG (labels, colors, SLA) — used across all logistics views
// ----------------------------------------------------------------------------

export interface StatusMeta {
  label: string;
  description: string;
  color: string;
  order: number;
}

export const DELIVERY_STATUS_META: Record<DeliveryStatus, StatusMeta> = {
  PENDING: { label: 'Pending', description: 'Awaiting processing', color: '#8a8f98', order: 0 },
  PICKING: { label: 'Picking', description: 'Items being picked', color: '#a16207', order: 1 },
  PACKING: { label: 'Packing', description: 'Being packaged', color: '#a16207', order: 2 },
  DISPATCHED: { label: 'Dispatched', description: 'On the way to destination', color: '#3b82f6', order: 3 },
  IN_TRANSIT: { label: 'In Transit', description: 'In transit to destination', color: '#2563eb', order: 4 },
  DELAYED: { label: 'Delayed', description: 'Delayed due to issues', color: '#dc2626', order: 5 },
  ARRIVED: { label: 'Arrived', description: 'Arrived at destination', color: '#0891b2', order: 6 },
  DELIVERED: { label: 'Delivered', description: 'Successfully delivered', color: '#16a34a', order: 7 },
  CANCELLED: { label: 'Cancelled', description: 'Cancelled before delivery', color: '#6b7280', order: 8 },
};

export interface PriorityMeta {
  label: string;
  sla: string;
  color: string;
}

export const DELIVERY_PRIORITY_META: Record<DeliveryPriority, PriorityMeta> = {
  URGENT: { label: 'Urgent', sla: 'Same day, < 4 hours', color: '#dc2626' },
  HIGH: { label: 'High', sla: 'Same day, < 8 hours', color: '#ea580c' },
  MEDIUM: { label: 'Medium', sla: 'Next day', color: '#2563eb' },
  LOW: { label: 'Low', sla: 'Within 3 days', color: '#6b7280' },
};

export interface DeliveryTypeMeta {
  label: string;
  description: string;
  useCase: string;
  icon: string;
}

export const DELIVERY_TYPE_META: Record<DeliveryType, DeliveryTypeMeta> = {
  BRANCH_TRANSFER: { label: 'Branch Transfer', description: 'Stock movement between branches', useCase: 'Rebalancing inventory', icon: 'pi pi-arrow-right-arrow-left' },
  SUPPLIER_PURCHASE: { label: 'Supplier Purchase', description: 'Stock from supplier to warehouse', useCase: 'Restocking', icon: 'pi pi-box' },
  CUSTOMER_DELIVERY: { label: 'Customer Delivery', description: 'Last-mile delivery to customer', useCase: 'Customer orders', icon: 'pi pi-send' },
  RETURN_DELIVERY: { label: 'Return Delivery', description: 'Returns management', useCase: 'Customer returns', icon: 'pi pi-replay' },
  BULK_TRANSFER: { label: 'Bulk Transfer', description: 'Bulk movement to multiple destinations', useCase: 'Large-scale distribution', icon: 'pi pi-th-large' },
};

export const VEHICLE_STATUS_META: Record<VehicleStatus, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: '#16a34a' },
  IDLE: { label: 'Idle', color: '#8a8f98' },
  MAINTENANCE: { label: 'Maintenance', color: '#d97706' },
  OUT_OF_SERVICE: { label: 'Out of Service', color: '#dc2626' },
};

export const DRIVER_STATUS_META: Record<DriverStatus, { label: string; color: string }> = {
  ON_DUTY: { label: 'On Duty', color: '#16a34a' },
  ON_DELIVERY: { label: 'On Delivery', color: '#2563eb' },
  OFF_DUTY: { label: 'Off Duty', color: '#8a8f98' },
  ON_LEAVE: { label: 'On Leave', color: '#d97706' },
};

/** Ordered pipeline used by kanban / progress-bar views */
export const DELIVERY_STATUS_FLOW: DeliveryStatus[] = [
  'PENDING', 'PICKING', 'PACKING', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED',
];

// ----------------------------------------------------------------------------
// CORE ENTITIES
// ----------------------------------------------------------------------------

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Address {
  label: string;
  line1: string;
  city: string;
  state: string;
  contactName?: string;
  contactPhone?: string;
  geo?: GeoPoint;
}

export interface DeliveryTimelineEvent {
  status: DeliveryStatus;
  label: string;
  timestamp: string;
  note?: string;
  actor?: string;
}

export interface ProofOfDelivery {
  receivedBy: string;
  signatureUrl?: string;
  photoUrl?: string;
  deliveredAt: string;
  notes?: string;
}

export interface DeliveryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unit: string;
}

export interface Delivery {
  id: string;
  deliveryNumber: string;
  type: DeliveryType;
  status: DeliveryStatus;
  priority: DeliveryPriority;

  origin: Address;
  destination: Address;

  linkedOrderRef?: string;   // Sales order / PO reference
  linkedModule?: 'Sales' | 'Procurement' | 'Inventory' | 'Vendor Management' | 'Branch Management';

  driverId?: string;
  driverName?: string;
  vehicleId?: string;
  vehiclePlate?: string;

  items: DeliveryItem[];
  itemCount: number;

  distanceKm: number;
  cost: number;

  createdAt: string;
  scheduledAt?: string;
  dispatchedAt?: string;
  eta?: string;
  deliveredAt?: string;

  timeline: DeliveryTimelineEvent[];
  proofOfDelivery?: ProofOfDelivery;

  currentLocation?: GeoPoint;
  notes?: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  name: string;
  type: VehicleType;
  status: VehicleStatus;
  capacityKg: number;
  odometerKm: number;
  fuelLevelPct: number;
  ageYears: number;
  purchaseDate: string;
  lastServiceDate: string;
  nextServiceDue: string;
  nextServiceKm: number;
  assignedDriverId?: string;
  assignedDriverName?: string;
  currentLocation?: GeoPoint;
  homeBranch: string;
  documents: { name: string; expiresAt: string; status: 'valid' | 'expiring' | 'expired' }[];
  utilizationPct: number;
  activeDeliveries: number;
  totalDeliveriesCompleted: number;
}

export interface Driver {
  id: string;
  name: string;
  initials: string;
  phone: string;
  email?: string;
  licenseNumber: string;
  licenseExpiry: string;
  status: DriverStatus;
  assignedVehicleId?: string;
  assignedVehiclePlate?: string;
  rating: number;
  totalDeliveries: number;
  successRatePct: number;
  onTimeRatePct: number;
  yearsOfService: number;
  homeBranch: string;
}

export interface RouteStop {
  order: number;
  deliveryId: string;
  deliveryNumber: string;
  address: Address;
  status: DeliveryStatus;
  etaMinutesFromStart: number;
  distanceFromPrevKm: number;
}

export interface DeliveryRoute {
  id: string;
  name: string;
  status: RouteStatus;
  driverId?: string;
  driverName?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  stops: RouteStop[];
  totalDistanceKm: number;
  totalDistanceKmBeforeOptimization?: number;
  estimatedDurationMin: number;
  estimatedDurationMinBeforeOptimization?: number;
  estimatedFuelCost: number;
  estimatedFuelCostBeforeOptimization?: number;
  createdAt: string;
  scheduledFor: string;
  optimized: boolean;
}

// ----------------------------------------------------------------------------
// ANALYTICS (3.3)
// ----------------------------------------------------------------------------

export interface PerformanceOverview {
  deliverySuccessRatePct: number;
  deliverySuccessRateTrendPct: number;
  onTimeDeliveryRatePct: number;
  onTimeDeliveryRateTrendPct: number;
  avgDeliveryTimeMin: number;
  avgDeliveryTimeTrendPct: number;
  vehicleUtilizationPct: number;
  vehicleUtilizationTrendPct: number;
}

export interface VolumeMetrics {
  totalDeliveriesThisMonth: number;
  avgDailyDeliveries: number;
  peakHour: string;
  busiestDay: string;
}

export interface CostMetrics {
  totalDeliveryCost: number;
  costPerDelivery: number;
  fuelCost: number;
  driverCost: number;
}

export interface FleetMetrics {
  totalVehicles: number;
  activeVehicles: number;
  maintenanceVehicles: number;
  idleVehicles: number;
  averageAgeYears: number;
}

export interface DriverMetrics {
  bestDriverName: string;
  bestDriverSuccessRatePct: number;
  mostDeliveriesDriverName: string;
  mostDeliveriesCount: number;
  averageRating: number;
  driverTurnoverPct: number;
}

export interface LogisticsAnalytics {
  performance: PerformanceOverview;
  volume: VolumeMetrics;
  cost: CostMetrics;
  fleet: FleetMetrics;
  driver: DriverMetrics;
  deliveriesByType: { type: DeliveryType; count: number }[];
  deliveriesByStatus: { status: DeliveryStatus; count: number }[];
  dailyTrend: { date: string; completed: number; delayed: number }[];
}

export interface LogisticsDashboardSummary {
  activeDeliveries: number;
  pendingDeliveries: number;
  delayedDeliveries: number;
  deliveredToday: number;
  availableVehicles: number;
  availableDrivers: number;
  urgentCount: number;
}

// ----------------------------------------------------------------------------
// FORM PAYLOADS (create / edit)
// ----------------------------------------------------------------------------

export interface DeliveryItemInput {
  name: string;
  sku: string;
  quantity: number;
  unit: string;
}

export interface NewDeliveryPayload {
  type: DeliveryType;
  priority: DeliveryPriority;
  linkedOrderRef?: string;

  originLabel: string;
  originLine1: string;
  destinationLabel: string;
  destinationLine1: string;
  destinationContactName?: string;
  destinationContactPhone?: string;

  driverId?: string;
  vehicleId?: string;

  items: DeliveryItemInput[];
  notes?: string;
}

export interface VehicleFormPayload {
  plateNumber: string;
  name: string;
  type: VehicleType;
  status: VehicleStatus;
  capacityKg: number;
  homeBranch: string;
  purchaseDate?: string;
  assignedDriverId?: string;
}

export interface DriverFormPayload {
  name: string;
  phone: string;
  email?: string;
  licenseNumber: string;
  licenseExpiry: string;
  status: DriverStatus;
  homeBranch: string;
  assignedVehicleId?: string;
}

export const VEHICLE_TYPE_OPTIONS: VehicleType[] = ['VAN', 'TRUCK', 'BIKE', 'CAR', 'TRICYCLE'];
export const VEHICLE_STATUS_OPTIONS: VehicleStatus[] = ['ACTIVE', 'IDLE', 'MAINTENANCE', 'OUT_OF_SERVICE'];
export const DRIVER_STATUS_OPTIONS: DriverStatus[] = ['ON_DUTY', 'ON_DELIVERY', 'OFF_DUTY', 'ON_LEAVE'];
export const BRANCH_OPTIONS: string[] = ['Lekki', 'Mushin', 'Ikeja', 'Warehouse A', 'Warehouse B'];

// ----------------------------------------------------------------------------
// FILTERS
// ----------------------------------------------------------------------------

export interface DeliveryFilters {
  search?: string;
  status?: DeliveryStatus | 'ALL';
  type?: DeliveryType | 'ALL';
  priority?: DeliveryPriority | 'ALL';
  driverId?: string;
  dateRange?: 'today' | 'week' | 'month' | 'all';
  page?: number;
  size?: number;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
}
