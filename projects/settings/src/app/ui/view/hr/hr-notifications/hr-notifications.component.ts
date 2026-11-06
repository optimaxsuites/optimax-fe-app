import { Component, Input, OnChanges, OnInit } from '@angular/core';
import {
  NotificationSubscriptionService,
  NotificationSubscription,
} from '../../../service/notification-subscription.service';

export type Channel = 'inApp' | 'email' | 'pushNotif' | 'sms';

export interface EventDef {
  key: string;
  label: string;
  description: string;
  priority: 'Critical' | 'High' | 'Normal';
}

export interface ModuleDef {
  key: string;
  label: string;
  icon: string;
  color: string;
  events: EventDef[];
}

const CHANNELS: Array<{ key: Channel; label: string; icon: string }> = [
  { key: 'inApp',     label: 'In-App', icon: 'fas fa-bell'         },
  { key: 'email',     label: 'Email',  icon: 'fas fa-envelope'     },
  { key: 'pushNotif', label: 'Push',   icon: 'fas fa-mobile-alt'   },
  { key: 'sms',       label: 'SMS',    icon: 'fas fa-comment-dots' },
];

const MODULES: ModuleDef[] = [
  {
    key: 'INVENTORY', label: 'Inventory', icon: 'fas fa-boxes', color: '#0ea5e9',
    events: [
      { key: 'LOW_STOCK',                  label: 'Low stock',                    description: 'Product quantity falls below its reorder point',               priority: 'High'     },
      { key: 'OUT_OF_STOCK',               label: 'Out of stock',                 description: 'Product quantity at a branch reaches zero',                   priority: 'Critical' },
      { key: 'BATCH_EXPIRING_SOON',        label: 'Batch expiring soon',          description: 'Batch is within its expiry window (30 days / 7 days)',        priority: 'High'     },
      { key: 'BATCH_EXPIRED',              label: 'Batch expired',                description: 'Batch passes its expiry date while still in stock',           priority: 'Critical' },
      { key: 'OVERSTOCK',                  label: 'Overstock',                    description: 'Product quantity rises above its maximum threshold',           priority: 'Normal'   },
      { key: 'TRANSFER_AWAITING_APPROVAL', label: 'Transfer awaiting approval',   description: 'Stock transfer between branches is submitted',                priority: 'High'     },
      { key: 'TRANSFER_APPROVED_REJECTED', label: 'Transfer approved / rejected', description: 'Approver decides on a transfer',                              priority: 'Normal'   },
      { key: 'TRANSFER_CHANGES_REQUESTED', label: 'Transfer changes requested',   description: 'Approver sends a transfer back for edits',                    priority: 'High'     },
      { key: 'TRANSFER_ARRIVED',           label: 'Transfer arrived',             description: 'Receiving branch confirms the goods arrived',                  priority: 'Normal'   },
      { key: 'RESTOCK_REQUEST_SUBMITTED',  label: 'Restock request submitted',    description: 'A branch requests more stock',                                priority: 'High'     },
      { key: 'RESTOCK_APPROVED_REJECTED',  label: 'Restock approved / rejected',  description: 'Approver decides on a restock request',                       priority: 'Normal'   },
      { key: 'RESTOCK_RECEIVED',           label: 'Restock received',             description: 'Requested stock is received at the branch',                   priority: 'Normal'   },
      { key: 'RESTOCK_SUGGESTION_READY',   label: 'Restock suggestion ready',     description: 'System suggests products to reorder',                         priority: 'Normal'   },
      { key: 'BULK_IMPORT_FINISHED',       label: 'Bulk product import finished', description: 'Product import completes with success / failure summary',     priority: 'Normal'   },
    ],
  },
  {
    key: 'SALES', label: 'Sales Hub', icon: 'fas fa-chart-line', color: '#10b981',
    events: [
      { key: 'QUOTE_ACCEPTED',          label: 'Quote accepted',           description: 'A customer accepts a quote',                                       priority: 'High'     },
      { key: 'QUOTE_DECLINED',          label: 'Quote declined',           description: 'A customer declines a quote',                                      priority: 'Normal'   },
      { key: 'QUOTE_EXPIRING',          label: 'Quote expiring',           description: 'Sent quote is near its valid-until date with no answer',           priority: 'Normal'   },
      { key: 'CUSTOMER_LPO_RECEIVED',   label: 'Customer LPO received',    description: 'Customer purchase order uploaded against a quote',                 priority: 'High'     },
      { key: 'INVOICE_DUE_SOON',        label: 'Invoice due soon',         description: 'Unpaid invoice is close to its due date',                          priority: 'Normal'   },
      { key: 'INVOICE_OVERDUE',         label: 'Invoice overdue',          description: 'Invoice passes its due date unpaid',                               priority: 'High'     },
      { key: 'PAYMENT_RECEIVED',        label: 'Payment received',         description: 'Full or part payment recorded against an invoice',                  priority: 'Normal'   },
      { key: 'PAYMENT_FAILED_REVERSED', label: 'Payment failed / reversed',description: 'A recorded payment fails or is reversed',                          priority: 'Critical' },
      { key: 'DELIVERY_DISPATCHED',     label: 'Delivery dispatched',      description: 'Delivery note is dispatched to the customer',                      priority: 'Normal'   },
      { key: 'DELIVERY_COMPLETED',      label: 'Delivery completed',       description: 'Delivery is marked delivered or signed note uploaded',              priority: 'Normal'   },
      { key: 'DELIVERY_RETURNED',       label: 'Delivery returned',        description: 'Goods on a delivery note come back',                               priority: 'High'     },
      { key: 'CUSTOMER_EMAIL_FAILED',   label: 'Customer email failed',    description: 'Quote, invoice or receipt email to a customer bounces',            priority: 'High'     },
    ],
  },
  {
    key: 'PROCUREMENT', label: 'Procurement', icon: 'fas fa-shopping-cart', color: '#f59e0b',
    events: [
      { key: 'REQUEST_AWAITING_APPROVAL', label: 'Request awaiting approval',        description: 'Procurement request reaches an approver\'s stage',               priority: 'High'   },
      { key: 'APPROVAL_REMINDER',         label: 'Approval reminder',                description: 'Request has waited at one stage longer than agreed (e.g. 24 h)',  priority: 'High'   },
      { key: 'REQUEST_APPROVED_REJECTED', label: 'Request approved / rejected',      description: 'Approver decides, or final approval completes',                  priority: 'Normal' },
      { key: 'RFQ_SENT_TO_VENDORS',       label: 'RFQ sent to vendors',              description: 'Approved request goes out to selected vendors',                  priority: 'Normal' },
      { key: 'QUOTATION_RECEIVED',        label: 'Quotation received',               description: 'A vendor submits a quote',                                       priority: 'High'   },
      { key: 'VENDOR_DECLINED_RFQ',       label: 'Vendor declined RFQ',              description: 'A vendor says they won\'t quote',                                priority: 'Normal' },
      { key: 'RFQ_CLOSING_FEW_QUOTES',    label: 'RFQ closing with few quotes',      description: 'RFQ near deadline with fewer quotes than vendors invited',        priority: 'High'   },
      { key: 'REVISED_QUOTE_RECEIVED',    label: 'Revised quote received',           description: 'Vendor resubmits after a revision request',                      priority: 'Normal' },
      { key: 'LPO_ACCEPTED_REJECTED',     label: 'LPO accepted / rejected',          description: 'Vendor responds to an issued LPO',                               priority: 'High'   },
      { key: 'DELIVERY_SCHEDULED',        label: 'Delivery scheduled',               description: 'Vendor sets a delivery date for an LPO',                         priority: 'Normal' },
      { key: 'DELIVERY_UPDATE',           label: 'Delivery update',                  description: 'A delivery status changes on the way',                            priority: 'Normal' },
      { key: 'DELIVERY_LATE',             label: 'Delivery late',                    description: 'LPO passes its delivery date without goods received',              priority: 'High'   },
      { key: 'GOODS_RECEIVED',            label: 'Goods received',                   description: 'A goods received note is submitted',                              priority: 'Normal' },
      { key: 'GOODS_SHORT_OR_DAMAGED',    label: 'Goods short or damaged',           description: 'GRN records less than ordered or damaged items',                  priority: 'High'   },
      { key: 'VENDOR_INVOICE_RECEIVED',   label: 'Vendor invoice received',          description: 'Vendor submits an invoice against an LPO',                       priority: 'High'   },
      { key: 'PAYMENT_VOUCHER_AWAITING',  label: 'Payment voucher awaiting approval',description: 'A payment voucher for a vendor is raised',                        priority: 'High'   },
      { key: 'NEW_PROCUREMENT_MESSAGE',   label: 'New procurement message',          description: 'Vendor or colleague sends a message on a request',               priority: 'Normal' },
    ],
  },
  {
    key: 'VENDOR_MANAGEMENT', label: 'Vendor Management', icon: 'fas fa-handshake', color: '#8b5cf6',
    events: [
      { key: 'NEW_VENDOR_AWAITING_APPROVAL', label: 'New vendor awaiting approval',  description: 'Vendor signs up and verifies their email',                  priority: 'High'     },
      { key: 'VENDOR_DETAILS_SUBMITTED',     label: 'Vendor details submitted',      description: 'Vendor uploads their details for the first time',           priority: 'High'     },
      { key: 'VENDOR_DETAILS_CHANGED',       label: 'Vendor details changed',        description: 'Approved vendor edits business or contact details',         priority: 'Normal'   },
      { key: 'VENDOR_BANK_DETAILS_CHANGED',  label: 'Vendor bank details changed',   description: 'Approved vendor changes their bank account',                priority: 'Critical' },
      { key: 'VENDOR_DOCUMENT_UPLOADED',     label: 'Vendor document uploaded',      description: 'Vendor uploads a compliance document for review',           priority: 'Normal'   },
      { key: 'VENDOR_DOCUMENT_EXPIRING',     label: 'Vendor document expiring',      description: 'Vendor certificate or licence is near its expiry date',     priority: 'High'     },
      { key: 'VENDOR_DOCUMENT_EXPIRED',      label: 'Vendor document expired',       description: 'Required document has expired on an active vendor',         priority: 'Critical' },
      { key: 'FRAUD_OR_RISK_FLAG_RAISED',    label: 'Fraud or risk flag raised',     description: 'System raises a fraud flag or risk alert on a vendor',      priority: 'Critical' },
      { key: 'VENDOR_PERFORMANCE_DROPPED',   label: 'Vendor performance dropped',    description: 'Vendor performance score falls below an agreed level',      priority: 'Normal'   },
      { key: 'VENDOR_SUSPENDED_OFFBOARDED',  label: 'Vendor suspended / offboarded', description: 'Vendor status changed to suspended or offboarded',          priority: 'High'     },
    ],
  },
  {
    key: 'VENDOR_PORTAL', label: 'Vendor Portal', icon: 'fas fa-store', color: '#ec4899',
    events: [
      { key: 'ACCOUNT_APPROVED',           label: 'Account approved',             description: 'Vendor management team approves the vendor',                  priority: 'High'     },
      { key: 'ACCOUNT_REJECTED_SUSPENDED', label: 'Account rejected / suspended', description: 'Vendor is rejected, suspended or offboarded',                 priority: 'High'     },
      { key: 'LOGIN_ENABLED',              label: 'Login enabled',                description: 'Portal access is switched on for the vendor',                  priority: 'High'     },
      { key: 'NEW_RFQ_RECEIVED',           label: 'New RFQ received',             description: 'A buyer sends the vendor an RFQ',                              priority: 'High'     },
      { key: 'RFQ_CLOSING_SOON',           label: 'RFQ closing soon',             description: 'An RFQ the vendor has not quoted on closes within 24 hours',   priority: 'High'     },
      { key: 'QUOTE_VIEWED',               label: 'Quote viewed',                 description: 'The buyer opens the vendor\'s quote',                          priority: 'Normal'   },
      { key: 'QUOTE_ACCEPTED_VP',          label: 'Quote accepted',               description: 'The buyer accepts the vendor\'s quote',                        priority: 'High'     },
      { key: 'QUOTE_REJECTED_VP',          label: 'Quote rejected',               description: 'The buyer rejects the quote or chooses another vendor',        priority: 'Normal'   },
      { key: 'REVISION_REQUESTED',         label: 'Revision requested',           description: 'The buyer asks the vendor to change their quote',              priority: 'High'     },
      { key: 'LPO_RECEIVED_VP',            label: 'LPO received',                 description: 'The buyer issues an LPO to the vendor',                        priority: 'Critical' },
      { key: 'INVOICE_APPROVED_REJECTED',  label: 'Invoice approved / rejected',  description: 'Buyer approves, rejects or disputes vendor invoice',           priority: 'High'     },
      { key: 'PAYMENT_MADE_VP',            label: 'Payment made',                 description: 'The buyer pays the vendor\'s invoice',                         priority: 'High'     },
      { key: 'PAYMENT_RECEIPT_AVAILABLE',  label: 'Payment receipt available',    description: 'A receipt is issued for the payment',                          priority: 'Normal'   },
      { key: 'DOCUMENT_EXPIRING_VP',       label: 'Document expiring',            description: 'One of the vendor\'s own documents is near its expiry',        priority: 'High'     },
      { key: 'NEW_MESSAGE_FROM_BUYER',     label: 'New message from buyer',       description: 'The buyer sends a message about an RFQ or order',              priority: 'Normal'   },
    ],
  },
  {
    key: 'LOGISTICS', label: 'Logistics', icon: 'fas fa-truck', color: '#f97316',
    events: [
      { key: 'ORDER_READY_FOR_ROUTING', label: 'Order ready for routing',  description: 'A new order joins the routing queue',                                  priority: 'Normal' },
      { key: 'ORDERS_WAITING_TOO_LONG', label: 'Orders waiting too long',  description: 'Orders sit unrouted past an agreed time',                             priority: 'High'   },
      { key: 'ROUTE_AWAITING_APPROVAL', label: 'Route awaiting approval',  description: 'A dispatcher submits a route for approval',                           priority: 'High'   },
      { key: 'ROUTE_APPROVED_REJECTED', label: 'Route approved / rejected',description: 'The approver decides on a route',                                     priority: 'Normal' },
      { key: 'ROUTE_ASSIGNED',          label: 'Route assigned',           description: 'A route is assigned to a rider',                                      priority: 'High'   },
      { key: 'ROUTE_CHANGED',           label: 'Route changed',            description: 'Stops added, removed or reordered on a rider\'s active route',        priority: 'High'   },
      { key: 'PICKUP_READY',            label: 'Pickup ready',             description: 'Goods for a route are ready to collect from the branch',              priority: 'Normal' },
      { key: 'OUT_FOR_DELIVERY',        label: 'Out for delivery',         description: 'The rider starts the route',                                          priority: 'Normal' },
      { key: 'DELIVERED_WITH_PROOF',    label: 'Delivered with proof',     description: 'Rider records a delivery with proof of delivery',                     priority: 'Normal' },
      { key: 'DELIVERY_FAILED_LOG',     label: 'Delivery failed',          description: 'Rider records a failed delivery attempt',                             priority: 'High'   },
      { key: 'DELIVERY_RUNNING_LATE',   label: 'Delivery running late',    description: 'A stop passes expected time without being completed',                 priority: 'High'   },
      { key: 'RIDER_INACTIVE',          label: 'Rider inactive',           description: 'Rider on active route has not updated status for agreed time',        priority: 'High'   },
    ],
  },
  {
    key: 'HR', label: 'HR & Personnel', icon: 'fas fa-users', color: '#6366f1',
    events: [
      { key: 'TASK_ASSIGNED',      label: 'Task assigned to me',           description: 'A task has been assigned to you',                   priority: 'High'   },
      { key: 'TASK_STATUS_CHANGE', label: 'Task status changed',           description: 'A task you are involved in changed status',         priority: 'Normal' },
      { key: 'FOLLOW_UP',          label: 'New follow-up / update posted', description: 'A new comment or update posted on a task',          priority: 'Normal' },
      { key: 'SUPERVISOR_REVIEW',  label: 'Supervisor review submitted',   description: 'Your supervisor submitted a review',                 priority: 'High'   },
      { key: 'DUE_REMINDER',       label: 'Task due-date reminder',        description: 'A task assigned to you is due within 24 hours',    priority: 'High'   },
      { key: 'APPRAISAL_DEADLINE', label: 'Appraisal cycle deadline',      description: 'An appraisal cycle deadline is approaching',        priority: 'High'   },
      { key: 'LEAVE_APPROVED',     label: 'Leave approved / rejected',     description: 'A leave request you submitted has been decided',    priority: 'Normal' },
      { key: 'PAYROLL_PROCESSED',  label: 'Payroll processed',             description: 'Your payroll for the period has been processed',    priority: 'Normal' },
    ],
  },
];

const LOCKED_IN_APP = new Set([
  'INVENTORY.OUT_OF_STOCK', 'INVENTORY.BATCH_EXPIRED',
  'SALES.PAYMENT_FAILED_REVERSED',
  'VENDOR_MANAGEMENT.VENDOR_BANK_DETAILS_CHANGED',
  'VENDOR_MANAGEMENT.VENDOR_DOCUMENT_EXPIRED',
  'VENDOR_MANAGEMENT.FRAUD_OR_RISK_FLAG_RAISED',
  'VENDOR_PORTAL.LPO_RECEIVED_VP',
]);

type SubState = { [mod: string]: { [ev: string]: { inApp: boolean; email: boolean; pushNotif: boolean; sms: boolean } } };

function buildDefaults(): SubState {
  const map: SubState = {};
  for (const mod of MODULES) {
    map[mod.key] = {};
    for (const ev of mod.events) {
      map[mod.key][ev.key] = { inApp: true, email: false, pushNotif: false, sms: false };
    }
  }
  return map;
}

@Component({
  selector: 'app-hr-notifications',
  templateUrl: './hr-notifications.component.html',
  styleUrl: './hr-notifications.component.scss',
})
export class HrNotificationsComponent implements OnInit, OnChanges {

  @Input() moduleKeys: string[] | null = null;

  get modules(): ModuleDef[] {
    return this.moduleKeys ? MODULES.filter(m => this.moduleKeys!.includes(m.key)) : MODULES;
  }

  readonly channels = CHANNELS;

  subs: SubState = buildDefaults();
  expanded: string | null = null;

  ngOnChanges(): void {
    if (this.modules.length > 0 && (this.expanded === null || !this.modules.find(m => m.key === this.expanded))) {
      this.expanded = this.modules[0].key;
    }
  }

  loading = false;
  saving  = false;
  saved   = false;
  error   = '';

  constructor(private subService: NotificationSubscriptionService) {}

  ngOnInit(): void {
    if (this.modules.length > 0) {
      this.expanded = this.modules[0].key;
    }
    this.loading = true;
    this.subService.getSubscriptions().subscribe({
      next: (data) => {
        for (const item of data) {
          if (this.subs[item.module]?.[item.eventType] !== undefined) {
            this.subs[item.module][item.eventType] = {
              inApp:     item.inApp,
              email:     item.email,
              pushNotif: item.pushNotif,
              sms:       item.sms,
            };
          }
        }
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  isLocked(moduleKey: string, eventKey: string): boolean {
    return LOCKED_IN_APP.has(`${moduleKey}.${eventKey}`);
  }

  isOn(moduleKey: string, eventKey: string, channel: Channel): boolean {
    return this.subs[moduleKey]?.[eventKey]?.[channel] ?? false;
  }

  toggle(moduleKey: string, eventKey: string, channel: Channel): void {
    if (channel === 'inApp' && this.isLocked(moduleKey, eventKey)) return;
    this.subs[moduleKey][eventKey][channel] = !this.subs[moduleKey][eventKey][channel];
  }

  toggleExpanded(key: string): void {
    this.expanded = this.expanded === key ? null : key;
  }

  channelOnCount(moduleKey: string, channel: Channel): number {
    const mod = this.subs[moduleKey];
    return mod ? Object.values(mod).filter(e => e[channel]).length : 0;
  }

  bulkModule(moduleKey: string, channel: Channel, on: boolean): void {
    const modDef = this.modules.find(m => m.key === moduleKey);
    if (!modDef) return;
    for (const ev of modDef.events) {
      if (channel === 'inApp' && this.isLocked(moduleKey, ev.key)) continue;
      this.subs[moduleKey][ev.key][channel] = on;
    }
  }

  priorityClass(p: string): string {
    if (p === 'Critical') return 'p-critical';
    if (p === 'High')     return 'p-high';
    return 'p-normal';
  }

  save(): void {
    this.saving = true;
    this.error  = '';
    const payload: NotificationSubscription[] = [];
    for (const mod of this.modules) {
      for (const ev of mod.events) {
        const s = this.subs[mod.key][ev.key];
        payload.push({ module: mod.key, eventType: ev.key, inApp: s.inApp, email: s.email, pushNotif: s.pushNotif, sms: s.sms });
      }
    }
    this.subService.saveSubscriptions(payload).subscribe({
      next: () => {
        this.saving = false;
        this.saved  = true;
        setTimeout(() => { this.saved = false; }, 2500);
      },
      error: () => {
        this.saving = false;
        this.error  = 'Failed to save. Please try again.';
      },
    });
  }
}
