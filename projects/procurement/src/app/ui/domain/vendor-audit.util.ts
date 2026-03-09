import { VendorDto, VendorStatus } from './vendor.dto';

export enum VendorAuditEventType {
  Created = 'Created',
  RegistrationStarted = 'RegistrationStarted',
  Submitted = 'Submitted',
  Approved = 'Approved',
  Rejected = 'Rejected',
  StatusChanged = 'StatusChanged',
}

export interface VendorAuditEventDto {
  id: string;
  type: VendorAuditEventType;
  at: string;

  actorId?: string;
  actorName?: string;
  actorRole?: string;

  fromStatus?: VendorStatus;
  toStatus?: VendorStatus;

  reason?: string;
  note?: string;
  meta?: Record<string, any>;
}

export interface VendorAuditDto {
  createdAt: string;
  lastUpdatedAt?: string;

  registrationStartedAt?: string;
  submittedAt?: string;

  approvedAt?: string;
  rejectedAt?: string;

  events: VendorAuditEventDto[];
}

const nowIso = () => new Date().toISOString();
const id = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function ensureVendorAudit(v: VendorDto): VendorDto {
  if (v.audit) return v;

  const t = nowIso();
  return {
    ...v,
    audit: {
      createdAt: t,
      lastUpdatedAt: t,
      events: [{ id: id(), type: VendorAuditEventType.Created, at: t, toStatus: v.status }],
    },
  };
}

export function addVendorAuditEvent(
  v: VendorDto,
  evt: Omit<VendorAuditEventDto, 'id' | 'at'> & { at?: string }
): VendorDto {
  v = ensureVendorAudit(v);
  const at = evt.at ?? nowIso();

  return {
    ...v,
    audit: {
      ...v.audit,
      lastUpdatedAt: at,
      events: [...(v.audit.events ?? []), { id: id(), at, ...evt }],
    },
  };
}