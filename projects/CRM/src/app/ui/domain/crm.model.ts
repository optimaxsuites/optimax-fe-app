export interface Contact {
  id?: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  jobTitle?: string;
  companyName?: string;
  accountId?: number;
  contactType?: string;
  leadSource?: string;
  ownerUserId?: number;
  ownerName?: string;
  address?: string;
  city?: string;
  state?: string;
  nin?: string;
  bvn?: string;
  tin?: string;
  ward?: string;
  ndpaConsent?: boolean;
  ndpaConsentDate?: string;
  linkedinUrl?: string;
  tags?: string;
  aiScore?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Account {
  id?: number;
  name: string;
  industry?: string;
  accountType?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  annualRevenue?: number;
  employeeCount?: number;
  ownerUserId?: number;
  ownerName?: string;
  healthScore?: number;
  tags?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PipelineStage {
  id?: number;
  pipelineId?: number;
  name: string;
  stageOrder?: number;
  probability?: number;
  color?: string;
  createdAt?: string;
}

export interface Pipeline {
  id?: number;
  name: string;
  description?: string;
  isDefault?: boolean;
  stages?: PipelineStage[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DealLineItem {
  id?: number;
  dealId?: number;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
}

export interface Deal {
  id?: number;
  title: string;
  contactId?: number;
  contactName?: string;
  accountId?: number;
  accountName?: string;
  pipelineId?: number;
  pipelineName?: string;
  stageId?: number;
  stageName?: string;
  dealValue?: number;
  currency?: string;
  probability?: number;
  expectedClose?: string;
  status?: string;
  ownerUserId?: number;
  ownerName?: string;
  lostReason?: string;
  lastActivityAt?: string;
  rottingDays?: number;
  tags?: string;
  lineItems?: DealLineItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Lead {
  id?: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  jobTitle?: string;
  leadSource?: string;
  status?: string;
  ownerUserId?: number;
  ownerName?: string;
  estimatedValue?: number;
  notes?: string;
  converted?: boolean;
  convertedAt?: string;
  contactId?: number;
  dealId?: number;
  aiScore?: number;
  tags?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Activity {
  id?: number;
  activityType: string;
  subject: string;
  description?: string;
  contactId?: number;
  contactName?: string;
  accountId?: number;
  accountName?: string;
  dealId?: number;
  dealName?: string;
  dueDate?: string;
  completedAt?: string;
  status?: string;
  ownerUserId?: number;
  ownerName?: string;
  outcome?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Campaign {
  id?: number;
  name: string;
  campaignType?: string;
  status?: string;
  description?: string;
  targetAudience?: string;
  budget?: number;
  actualCost?: number;
  startDate?: string;
  endDate?: string;
  ownerUserId?: number;
  ownerName?: string;
  leadsGenerated?: number;
  dealsCreated?: number;
  revenueGenerated?: number;
  tags?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuoteLineItem {
  id?: number;
  quoteId?: number;
  description: string;
  quantity?: number;
  unitPrice?: number;
  discount?: number;
  totalPrice?: number;
}

export interface Quote {
  id?: number;
  quoteNumber?: string;
  title?: string;
  contactId?: number;
  contactName?: string;
  accountId?: number;
  accountName?: string;
  dealId?: number;
  dealName?: string;
  status?: string;
  subtotal?: number;
  vatPercent?: number;
  vatAmount?: number;
  discountAmount?: number;
  totalAmount?: number;
  currency?: string;
  validUntil?: string;
  terms?: string;
  notes?: string;
  ownerUserId?: number;
  ownerName?: string;
  lineItems?: QuoteLineItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Contract {
  id?: number;
  contractNumber?: string;
  title: string;
  contactId?: number;
  contactName?: string;
  accountId?: number;
  accountName?: string;
  dealId?: number;
  dealName?: string;
  status?: string;
  contractValue?: number;
  currency?: string;
  startDate?: string;
  endDate?: string;
  renewalDate?: string;
  autoRenew?: boolean;
  terms?: string;
  documentUrl?: string;
  ownerUserId?: number;
  ownerName?: string;
  signedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Ticket {
  id?: number;
  ticketNumber?: string;
  subject: string;
  description?: string;
  contactId?: number;
  contactName?: string;
  accountId?: number;
  accountName?: string;
  status?: string;
  priority?: string;
  category?: string;
  assigneeUserId?: number;
  assigneeName?: string;
  slaDueAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  resolution?: string;
  channel?: string;
  createdAt?: string;
  updatedAt?: string;
}
