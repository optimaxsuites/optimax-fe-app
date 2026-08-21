// logistics.dto.ts
// ============================================================
// ENUMS
// ============================================================

export enum FulfillmentType {
  UNASSIGNED = 'UNASSIGNED',
  PICKUP = 'PICKUP',
  DELIVERY = 'DELIVERY'
}

export enum OrderStatus {
  PENDING_ROUTING = 'PENDING_ROUTING',
  // pickup lane
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  COLLECTED = 'COLLECTED',
  // delivery lane
  POOL = 'POOL',
  CLAIMED = 'CLAIMED',
  ROUTE_PENDING_APPROVAL = 'ROUTE_PENDING_APPROVAL',
  ROUTE_APPROVED = 'ROUTE_APPROVED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  // terminal
  CLOSED = 'CLOSED'
}

export enum BatchStatus {
  CLAIMING = 'CLAIMING',           // rider still adding orders / building route
  ROUTE_SUBMITTED = 'ROUTE_SUBMITTED', // waiting on admin decision
  ROUTE_APPROVED = 'ROUTE_APPROVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export enum StopStatus {
  PENDING = 'PENDING',
  EN_ROUTE = 'EN_ROUTE',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED'
}

export enum ProofType {
  SIGNATURE = 'SIGNATURE',
  PHOTO = 'PHOTO',
  CODE = 'CODE'
}

export enum FailureReason {
  NOT_HOME = 'NOT_HOME',
  REFUSED = 'REFUSED',
  WRONG_ADDRESS = 'WRONG_ADDRESS',
  DAMAGED = 'DAMAGED',
  OTHER = 'OTHER'
}

export enum FailedOrderAction {
  REQUEUE = 'REQUEUE',
  CANCEL = 'CANCEL',
  ESCALATE = 'ESCALATE'
}

export enum RiderActiveStatus {
  AVAILABLE = 'AVAILABLE',
  ON_ROUTE = 'ON_ROUTE',
  OFFLINE = 'OFFLINE'
}

export enum VehicleType {
  BIKE = 'BIKE',
  VAN = 'VAN',
  TRUCK = 'TRUCK'
}

// ============================================================
// CORE MODELS
// ============================================================

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  note?: string;   // e.g. "Fragile", "Keep upright"
}

export interface Order {
  id: string;               // internal id
  orderId: string;           // display code e.g. #ORD-8821-A
  customerName: string;
  itemsSummary: string;      // e.g. "3 items (Heavy, Fragile)"
  itemCount: number;
  items?: OrderItem[];
  deliveryLocation: string;
  fullAddress?: string;
  area?: string;
  weightKg?: number;
  lat?: number;
  lng?: number;
  paymentStatus: 'paid';
  fulfillmentType: FulfillmentType;
  status: OrderStatus;
  paidAt: string;             // ISO date
  routedAt?: string;
  enteredPoolAt?: string;
  claimedAt?: string;
  batchId?: string;
  riderId?: string;
  riderName?: string;
  deliveryAttemptId?: string;
  isAging?: boolean;          // derived client-side for pool orders
  timeInPoolMinutes?: number; // derived
  priority?: 'standard' | 'high';
  distanceKm?: number;        // derived client-side, rider's distance to stop
}

export interface Rider {
  id: string;
  riderCode?: string;         // display id e.g. R-4921
  name: string;
  initials: string;
  phone?: string;
  email?: string;
  activeStatus: RiderActiveStatus;
  currentBatchId?: string;
  currentLoad: number;        // count of active claimed orders
  vehicleType: VehicleType;
  todayDelivered: number;
  todayFailed: number;
  avgDeliveryMinutes?: number;
}

export interface RouteStop {
  sequence: number;           // 1-based order in the route
  orderId: string;
  orderDisplayId: string;
  location: string;
  itemsSummary: string;
  stopStatus: StopStatus;
  lat?: number;
  lng?: number;
  locationConfirmed?: boolean; // rider has pinned/confirmed the exact drop location
  weightKg?: number;
  customerName?: string;
  area?: string;
  distanceKm?: number;
  requiresSignature?: boolean;
}

export interface DeliveryBatch {
  id: string;
  batchCode: string;          // display e.g. B-7492
  riderId: string;
  riderName: string;
  riderInitials: string;
  vehicleType: VehicleType;
  status: BatchStatus;
  orderIds: string[];
  proposedRoute: RouteStop[];
  totalItems: number;
  isHighPriorityArea?: boolean;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  adminNotes?: string;
  waitMinutes?: number;       // derived: time waiting for approval
  createdAt: string;
}

export interface DeliveryAttempt {
  id: string;
  orderId: string;
  orderDisplayId: string;
  customerName: string;
  deliveryLocation: string;
  batchId: string;
  riderId: string;
  riderName: string;
  riderInitials: string;
  outcome?: 'delivered' | 'failed';
  failureReason?: FailureReason;
  proofOfDeliveryId?: string;
  proof?: ProofOfDelivery;
  attemptedAt?: string;
  escalationNote?: string;
  escalatedAt?: string;
  closedReason?: string;
  isResolved?: boolean; // failed attempts leave the active exceptions list once actioned
}

export interface ProofOfDelivery {
  id: string;
  deliveryAttemptId: string;
  type: ProofType;
  dataUrl?: string;
  code?: string;
  capturedAt: string;
}

export interface AuditLogEntry {
  id: string;
  entityType: 'ORDER' | 'BATCH';
  entityId: string;
  entityDisplayId?: string;
  actor: string;
  actorType: 'admin' | 'rider' | 'system';
  action: string;         // short human label e.g. "Routed to Delivery"
  fromStatus: string;
  toStatus: string;
  note?: string;
  timestamp: string;
}

export interface RiderPerformanceStat {
  riderId: string;
  riderName: string;
  riderInitials: string;
  ordersClaimedWeek: number;
  delivered: number;
  failed: number;
  avgTimeMinutes: number;        // avg claim-to-deliver time
  avgApprovalWaitMinutes: number; // avg time a submitted route sits before approval
  isHoardingRisk: boolean;
}

export interface AuditLogFilter {
  orderId?: string;
  riderId?: string;
  actionType?: string;
  dateRange?: string;
}

export interface RiderCreatePayload {
  name: string;
  email: string;
  phone: string;
  vehicleType: VehicleType;
  activeStatus: RiderActiveStatus;
}

export interface GeoPoint {
  label: string;
  lat: number;
  lng: number;
}

// ============================================================
// RESPONSE WRAPPERS
// ============================================================

export interface TriageListResponse {
  orders: Order[];
  total: number;
}

export interface PoolListResponse {
  orders: Order[];
  total: number;
  agingCount: number;
}

export interface ApprovalQueueResponse {
  batches: DeliveryBatch[];
  total: number;
}

export interface ActiveRoutesResponse {
  batches: DeliveryBatch[];
  total: number;
}

export interface DeliveredListResponse {
  attempts: DeliveryAttempt[];
  total: number;
}

export interface FailedListResponse {
  attempts: DeliveryAttempt[];
  total: number;
}

export interface PickupListResponse {
  orders: Order[];
  total: number;
}

export interface RiderRosterResponse {
  riders: Rider[];
  total: number;
}

export interface RiderPerformanceResponse {
  stats: RiderPerformanceStat[];
  total: number;
  activeRiders: number;
  avgDeliveryRate: number;   // %
  avgTimePerOrderMinutes: number;
  hoardingRiskCount: number;
}

export interface AuditLogResponse {
  entries: AuditLogEntry[];
  total: number;
}

export interface AvailablePoolResponse {
  orders: Order[];
  total: number;
  claimLimit: number;
  currentLoad: number;
}

// ============================================================
// HELPERS
// ============================================================

export const AGING_THRESHOLD_MINUTES = 240; // 4h default, admin-configurable later

export function getOrderStatusLabel(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    [OrderStatus.PENDING_ROUTING]: 'Pending Routing',
    [OrderStatus.READY_FOR_PICKUP]: 'Ready for Pickup',
    [OrderStatus.COLLECTED]: 'Collected',
    [OrderStatus.POOL]: 'In Pool',
    [OrderStatus.CLAIMED]: 'Claimed',
    [OrderStatus.ROUTE_PENDING_APPROVAL]: 'Pending Approval',
    [OrderStatus.ROUTE_APPROVED]: 'Route Approved',
    [OrderStatus.IN_TRANSIT]: 'In Transit',
    [OrderStatus.DELIVERED]: 'Delivered',
    [OrderStatus.FAILED]: 'Failed',
    [OrderStatus.CLOSED]: 'Closed'
  };
  return map[status] ?? status;
}

export function getOrderStatusBadgeClass(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.DELIVERED:
    case OrderStatus.COLLECTED:
      return 'bg-[#00a191]/10 text-[#00a191]';
    case OrderStatus.FAILED:
      return 'bg-[#dc2626]/10 text-[#dc2626]';
    case OrderStatus.IN_TRANSIT:
    case OrderStatus.ROUTE_APPROVED:
      return 'bg-[#2563eb]/10 text-[#2563eb]';
    case OrderStatus.POOL:
    case OrderStatus.READY_FOR_PICKUP:
      return 'bg-[#eab308]/10 text-[#a16207]';
    case OrderStatus.ROUTE_PENDING_APPROVAL:
    case OrderStatus.CLAIMED:
      return 'bg-[#f97316]/10 text-[#f97316]';
    default:
      return 'bg-[#9aa7ae]/10 text-[#566670]';
  }
}

export function getStopStatusBadgeClass(status: StopStatus): string {
  switch (status) {
    case StopStatus.DELIVERED:
      return 'bg-[#16a34a]/10 text-[#16a34a]';
    case StopStatus.FAILED:
      return 'bg-[#dc2626]/10 text-[#dc2626]';
    case StopStatus.EN_ROUTE:
      return 'bg-[#eab308]/10 text-[#a16207]';
    default:
      return 'bg-[#9aa7ae]/10 text-[#566670]';
  }
}

export function minutesBetween(fromIso: string, toIso: string = new Date().toISOString()): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return Math.max(0, Math.round((to - from) / 60000));
}

export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function getFailureReasonLabel(reason?: FailureReason): string {
  const map: Record<FailureReason, string> = {
    [FailureReason.NOT_HOME]: 'Not Home',
    [FailureReason.REFUSED]: 'Refused',
    [FailureReason.WRONG_ADDRESS]: 'Wrong Address',
    [FailureReason.DAMAGED]: 'Damaged',
    [FailureReason.OTHER]: 'Other'
  };
  return reason ? map[reason] ?? reason : '—';
}

export function getRiderStatusBadgeClass(status: RiderActiveStatus): string {
  switch (status) {
    case RiderActiveStatus.AVAILABLE:
      return 'bg-[#16a34a]/10 text-[#16a34a]';
    case RiderActiveStatus.ON_ROUTE:
      return 'bg-[#2563eb]/10 text-[#2563eb]';
    default:
      return 'bg-[#9aa7ae]/10 text-[#566670]';
  }
}
