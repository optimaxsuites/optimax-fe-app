import {
  Component, OnInit, ViewChild,
  ElementRef, AfterViewChecked
} from '@angular/core';
import { FormsModule } from '@angular/forms';

// ─────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────
export type ToneMode     = 'business' | 'casual';
export type FormatMode   = 'markdown' | 'json' | 'chart';
export type ModuleKey    = 'all' | 'hr' | 'accounting' | 'pos' | 'expense';

interface KpiCard {
  label: string;
  value: string;
  sub: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
}

interface ChartRow {
  label: string;
  value: string;
  delta: string;
  up: boolean;
}

interface ChatMessage {
  sender: 'ai' | 'user';
  text: string;
  time: string;
  format?: FormatMode;
  tone?: ToneMode;
  hasHighlight?: boolean;
  highlightTitle?: string;
  hasBullets?: boolean;
  bullets?: string[];
  codeBlock?: string;
  chartData?: ChartRow[];
}

interface ChatSession {
  id: string;
  title: string;
  module: string;
  time: string;
  messages: ChatMessage[];
}

interface ErpModule {
  key: ModuleKey;
  label: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
}

interface QuickAction {
  title: string;
  description: string;
  prompt: string;
  module: ModuleKey;
  iconSvg: string;
}

interface FormatOption {
  key: FormatMode;
  label: string;
}

// ─────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────
@Component({
  selector: 'app-optimaxai',
  templateUrl: './optimax-ai.component.html',
  styleUrls:  ['./optimax-ai.component.scss'],
})
export class OptimaxaiComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  // ── State ──────────────────────────────────────────
  newChatMessage = '';
  aiTyping       = false;
  activeChatId   = '';
  showWelcome    = true;
  tone: ToneMode       = 'business';
  responseFormat: FormatMode = 'markdown';
  activeModule: ModuleKey    = 'all';

  chatSessions: ChatSession[] = [
    {
      id: 's1', title: 'September Payroll Reconciliation',
      module: 'HR', time: 'Today 09:12',
      messages: [
        {
          sender: 'ai',
          text: 'I\'ve reviewed the September payroll data across all 47 active employees.',
          time: '09:12', format: 'chart',
          chartData: [
            { label: 'Gross Pay',   value: '₦8.42M', delta: '+3.1% vs Aug', up: true  },
            { label: 'Net Pay',     value: '₦6.89M', delta: '-0.4% PAYE adj', up: false },
            { label: 'Deductions',  value: '₦1.53M', delta: 'Pension + Tax',  up: false },
            { label: 'Staff Count', value: '47',     delta: '+2 new hires',   up: true  },
            { label: 'Anomalies',   value: '3',      delta: 'Needs review',   up: false },
            { label: 'On-Time %',   value: '96%',    delta: '+2% vs target',  up: true  },
          ]
        },
        { sender: 'user', text: 'Show me the discrepancies in detail.', time: '09:15' },
        {
          sender: 'ai',
          text: 'Here are the 3 payroll discrepancies flagged for September:',
          time: '09:15', format: 'markdown',
          hasHighlight: true, highlightTitle: 'Discrepancies Flagged',
          hasBullets: true,
          bullets: [
            'Hospitality Dept — 3 staff overtime miscalculation · ₦42,000 variance',
            'POS Integration — 2 commission entries not synced from sales module',
            'Accounting — Tax bracket mismatch for 1 employee · correctable'
          ]
        }
      ]
    },
    {
      id: 's2', title: 'Monthly Expense Report — Q3',
      module: 'EXPENSE', time: 'Today 11:30', messages: []
    },
    {
      id: 's3', title: 'POS Revenue Analysis Aug',
      module: 'POS', time: 'Yesterday', messages: []
    },
    {
      id: 's4', title: 'P&L Summary Draft',
      module: 'ACCT', time: 'Yesterday', messages: []
    },
  ];

  // ── ERP Modules ────────────────────────────────────
  erpModules: ErpModule[] = [
    {
      key: 'all', label: 'All Modules',
      icon: `<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>`
    },
    {
      key: 'hr', label: 'HR & Payroll',
      icon: `<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
      badge: '3', badgeColor: 'bg-emerald-50 text-emerald-600'
    },
    {
      key: 'accounting', label: 'Accounting',
      icon: `<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>`
    },
    {
      key: 'pos', label: 'Point of Sale',
      icon: `<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>`,
      badge: 'Live', badgeColor: 'bg-[#eaf2f6] text-[#2e6276]'
    },
    {
      key: 'expense', label: 'Expenses',
      icon: `<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>`,
      badge: '!', badgeColor: 'bg-red-50 text-red-500'
    },
  ];

  // ── Format options ─────────────────────────────────
  formatOptions: FormatOption[] = [
    {
      key: 'markdown',
      label: `<svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> MD`
    },
    {
      key: 'json',
      label: `<svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> JSON`
    },
    {
      key: 'chart',
      label: `<svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg> Chart`
    },
  ];

  // ── KPI data per module ────────────────────────────
  private kpiMap: Record<ModuleKey, KpiCard[]> = {
    all: [
      { label: 'Total Revenue',    value: '₦24.6M', sub: 'Q3 YTD',            change: '+11%',  trend: 'up'      },
      { label: 'Total Expenses',   value: '₦18.2M', sub: 'Q3 YTD',            change: '+4%',   trend: 'down'    },
      { label: 'Active Staff',     value: '47',      sub: 'Across all depts',  change: '+2',    trend: 'up'      },
      { label: 'POS Transactions', value: '3,812',   sub: 'This month',        change: '+18%',  trend: 'up'      },
    ],
    hr: [
      { label: 'Headcount',    value: '47',    sub: 'Active employees', change: '+2 hires',  trend: 'up'   },
      { label: 'Gross Payroll', value: '₦8.42M', sub: 'Sep payroll',    change: '+3.1%',     trend: 'up'   },
      { label: 'Leave Requests', value: '7',   sub: 'Pending approval', change: '4 urgent',  trend: 'down' },
      { label: 'Attendance',   value: '94%',   sub: 'Avg this month',   change: '+2%',       trend: 'up'   },
    ],
    accounting: [
      { label: 'Revenue',     value: '₦24.6M', sub: 'Q3 total',          change: '+11%',  trend: 'up'   },
      { label: 'EBITDA',      value: '₦6.4M',  sub: '26% margin',        change: '+1.4%', trend: 'up'   },
      { label: 'Receivables', value: '₦2.1M',  sub: 'Outstanding',       change: '3 inv', trend: 'down' },
      { label: 'Payables',    value: '₦940K',  sub: 'Due this week',     change: 'On time', trend: 'neutral' },
    ],
    pos: [
      { label: 'Today Revenue', value: '₦380K', sub: 'As of now',         change: '+22%',  trend: 'up'   },
      { label: 'Transactions',  value: '214',    sub: 'Today',             change: '+18',   trend: 'up'   },
      { label: 'Top Item',      value: 'Grills', sub: '₦84K sales',       change: '+18%',  trend: 'up'   },
      { label: 'Avg Basket',    value: '₦1,776', sub: 'Per transaction',  change: '+₦120', trend: 'up'   },
    ],
    expense: [
      { label: 'Total Claims',    value: '₦1.23M', sub: 'This month',    change: '+9%',   trend: 'down' },
      { label: 'Pending Approval', value: '12',    sub: 'Awaiting sign-off', change: '3 urgent', trend: 'down' },
      { label: 'Approved',        value: '₦890K',  sub: 'Released',      change: 'On time', trend: 'up'  },
      { label: 'Flagged',         value: '2',      sub: 'Policy breach',  change: 'Action needed', trend: 'down' },
    ],
  };

  // ── Quick actions per module ───────────────────────
  private quickActionsMap: Record<ModuleKey, QuickAction[]> = {
    all: [
      { title: 'Payroll Summary',    description: 'Generate this month\'s payroll report with all deductions.',   prompt: 'Generate payroll summary for this month',        module: 'hr',         iconSvg: `<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>` },
      { title: 'POS Revenue Report', description: 'Analyse point-of-sale transactions and top-performing items.', prompt: 'Analyze this week\'s POS sales and top items',       module: 'pos',        iconSvg: `<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>` },
      { title: 'Expense Overview',   description: 'Review pending claims and flagged policy breaches.',           prompt: 'Show me this month\'s expense claims and flags',   module: 'expense',    iconSvg: `<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>` },
      { title: 'P&L Summary',        description: 'Quarterly profit & loss with EBITDA and margin breakdown.',   prompt: 'Give me Q3 profit and loss summary with margins',   module: 'accounting', iconSvg: `<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>` },
      { title: 'Leave Requests',     description: 'Review pending staff leave applications and approvals.',      prompt: 'Show pending leave requests and approval status',   module: 'hr',         iconSvg: `<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>` },
      { title: 'Compliance Check',   description: 'Audit tax brackets, pension remittances, and contracts.',    prompt: 'Run a compliance audit on tax and pension records', module: 'accounting', iconSvg: `<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>` },
    ],
    hr:         [], accounting: [], pos: [], expense: [],
  };

  // ── AI responses ───────────────────────────────────
  private aiPool: Record<string, { text: string; bullets?: string[]; chartData?: ChartRow[]; jsonBlock?: string }> = {
    payroll: {
      text: 'Payroll analysis complete for this month. Gross pay totals ₦8,420,000 across 47 active employees. Net pay after PAYE, pension (8%), and health deductions is ₦6,891,400.',
      bullets: ['PAYE deductions — ₦892,000 total', 'Pension contributions — ₦673,600 (8%)', 'Health insurance — ₦168,400 (2%)', '2 anomalies flagged for review before processing'],
      chartData: [
        { label: 'Gross Pay', value: '₦8.42M', delta: '+3.1%', up: true },
        { label: 'Net Pay',   value: '₦6.89M', delta: '-0.4%', up: false },
        { label: 'Deductions', value: '₦1.53M', delta: 'Stable', up: true },
        { label: 'Anomalies', value: '2', delta: 'Action needed', up: false },
        { label: 'On-time', value: '96%', delta: '+2%', up: true },
        { label: 'Headcount', value: '47', delta: '+2 hires', up: true },
      ],
      jsonBlock: `{\n  "payroll_month": "September 2025",\n  "gross_pay": 8420000,\n  "net_pay": 6891400,\n  "deductions": {\n    "paye": 892000,\n    "pension": 673600,\n    "health": 168400\n  },\n  "anomalies": 2,\n  "headcount": 47\n}`
    },
    pos: {
      text: 'POS analysis complete. Total revenue this week reached ₦1.24M across 3,812 transactions. Tuesday was your peak day at ₦380,000. Grills & Chops is outperforming last month by 18%.',
      chartData: [
        { label: 'Weekly Rev', value: '₦1.24M', delta: '+16%', up: true },
        { label: 'Transactions', value: '3,812', delta: '+18%', up: true },
        { label: 'Peak Day', value: 'Tue', delta: '₦380K', up: true },
        { label: 'Top Category', value: 'Grills', delta: '+18%', up: true },
        { label: 'Avg Basket', value: '₦1,776', delta: '+₦120', up: true },
        { label: 'Voids', value: '4', delta: '-2 vs last wk', up: true },
      ],
      jsonBlock: `{\n  "week": "Sep 23–29 2025",\n  "revenue": 1240000,\n  "transactions": 3812,\n  "peak_day": { "day": "Tuesday", "revenue": 380000 },\n  "top_category": "Grills & Chops",\n  "avg_basket": 1776\n}`
    },
    expense: {
      text: 'Expense report for this month: Total claims submitted ₦1,230,000 across 28 requests. 12 are pending approval, 2 are flagged for policy breach.',
      bullets: ['Transport claims — ₦340,000 (largest category)', 'Client entertainment — ₦210,000 (1 breach flagged)', 'Office supplies — ₦180,000 approved', 'Conference travel — ₦500,000 (3 pending sign-off)'],
      jsonBlock: `{\n  "month": "September 2025",\n  "total_claims": 1230000,\n  "pending": 12,\n  "approved": { "count": 14, "amount": 890000 },\n  "flagged": 2,\n  "categories": {\n    "transport": 340000,\n    "entertainment": 210000,\n    "supplies": 180000,\n    "travel": 500000\n  }\n}`
    },
    accounting: {
      text: 'Q3 P&L summary: Total Revenue ₦24.6M, Operating Expenses ₦18.2M, EBITDA ₦6.4M (26% margin). Hospitality is your highest-margin unit at 34%. 3 unreconciled POS entries totalling ₦87,500.',
      chartData: [
        { label: 'Revenue', value: '₦24.6M', delta: '+11%', up: true },
        { label: 'Op. Expenses', value: '₦18.2M', delta: '+4%', up: false },
        { label: 'EBITDA', value: '₦6.4M', delta: '26% margin', up: true },
        { label: 'Receivables', value: '₦2.1M', delta: 'Outstanding', up: false },
        { label: 'Top Unit', value: 'Hospitality', delta: '34% margin', up: true },
        { label: 'Unreconciled', value: '3', delta: '₦87,500', up: false },
      ],
      jsonBlock: `{\n  "quarter": "Q3 2025",\n  "revenue": 24600000,\n  "operating_expenses": 18200000,\n  "ebitda": 6400000,\n  "ebitda_margin": "26%",\n  "receivables": 2100000,\n  "unreconciled_entries": 3\n}`
    },
    hr: {
      text: 'HR overview: 7 pending leave requests (4 urgent), 3 contracts expiring within 30 days, and tax bracket correction needed for 1 employee. Current attendance rate is 94%.',
      bullets: ['4 leave requests — awaiting line manager approval', '2 leave requests — require medical documentation', '3 contracts expiring — renewal notices sent', '1 employee — tax bracket needs correction before month-end'],
      jsonBlock: `{\n  "headcount": 47,\n  "pending_leaves": 7,\n  "urgent_leaves": 4,\n  "contracts_expiring": 3,\n  "tax_issues": 1,\n  "attendance_rate": "94%"\n}`
    },
    compliance: {
      text: 'Compliance audit complete. 2 issues require immediate action before month-end close.',
      bullets: ['Tax bracket mismatch — 1 employee filing uses outdated rate', '3 staff contracts expire within 30 days — renewal required', 'All pension remittances are current and compliant'],
    },
    default: {
      text: 'I\'ve reviewed the relevant OptimaxERP data across HR, POS, Accounting, and Expenses. Here\'s a summary based on current records. Would you like me to drill down into a specific module or generate a detailed report?',
    }
  };

  // ─────────────────────────────────────────────────
  //  Getters
  // ─────────────────────────────────────────────────
  get allSessions()     { return this.chatSessions; }
  get currentSessions() { return this.chatSessions.filter(s => s); }
  get yesterdaySessions() { return []; }
  get olderSessions()   { return []; }

  get activeSession(): ChatSession | undefined {
    return this.chatSessions.find(s => s.id === this.activeChatId);
  }
  get activeMessages(): ChatMessage[] {
    return this.activeSession?.messages || [];
  }
  get activeKpis(): KpiCard[] {
    return this.kpiMap[this.activeModule] || this.kpiMap['all'];
  }
  get activeQuickActions(): QuickAction[] {
    const list = this.quickActionsMap[this.activeModule];
    return (list && list.length) ? list : this.quickActionsMap['all'];
  }
  get activeModuleLabel(): string {
    return this.erpModules.find(m => m.key === this.activeModule)?.label || 'All Modules';
  }
  get inputPlaceholder(): string {
    const mod = this.activeModuleLabel;
    return this.tone === 'business'
      ? `Ask OptimaxAI about ${mod}...`
      : `Hey! What do you want to know about ${mod}?`;
  }

  // ─────────────────────────────────────────────────
  //  Lifecycle
  // ─────────────────────────────────────────────────
  ngOnInit()        {}
  ngAfterViewChecked() { this.scrollToBottom(); }

  // ─────────────────────────────────────────────────
  //  Methods
  // ─────────────────────────────────────────────────
  selectModule(key: ModuleKey) { this.activeModule = key; }
  setTone(t: ToneMode)         { this.tone = t; }
  setFormat(f: FormatMode)     { this.responseFormat = f; }

  getModuleBadgeClass(mod: string): string {
    const m = mod?.toUpperCase();
    if (m === 'HR')      return 'bg-emerald-50 text-emerald-600';
    if (m === 'POS')     return 'bg-[#eaf2f6] text-[#2e6276]';
    if (m === 'EXPENSE') return 'bg-red-50 text-red-500';
    if (m === 'ACCT')    return 'bg-violet-50 text-violet-500';
    return 'bg-[#f0f4f7] text-[#6b8898]';
  }

  selectSession(id: string) {
    this.activeChatId = id;
    this.showWelcome  = false;
  }

  newChat() {
    const id  = 'session-' + Date.now();
    const mod = this.activeModule === 'all' ? 'GEN' : this.activeModule.toUpperCase();
    this.chatSessions.unshift({
      id, title: 'New conversation', module: mod,
      time: 'Just now', messages: []
    });
    this.activeChatId = id;
    this.showWelcome  = false;
  }

  startWithAction(action: QuickAction) {
    this.newChat();
    setTimeout(() => this.sendMessage(action.prompt), 60);
  }

  sendMessage(text: string) {
    if (!text?.trim()) return;
    const session = this.activeSession;
    if (!session) return;

    const now     = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (session.messages.length === 0) {
      session.title = text.trim().substring(0, 40) + (text.trim().length > 40 ? '...' : '');
    }

    session.messages.push({ sender: 'user', text: text.trim(), time: timeStr });
    this.newChatMessage = '';
    this.aiTyping = true;

    setTimeout(() => {
      this.aiTyping = false;
      const aiTime  = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const pool    = this.pickResponse(text);
      const fmt     = this.responseFormat;

      const msg: ChatMessage = {
        sender: 'ai',
        text:   pool.text,
        time:   aiTime,
        format: fmt,
        tone:   this.tone,
      };

      if (fmt === 'chart' && pool.chartData)  msg.chartData = pool.chartData;
      if (fmt === 'json'  && pool.jsonBlock)  msg.codeBlock = pool.jsonBlock;
      if (fmt === 'markdown' && pool.bullets) { msg.hasBullets = true; msg.bullets = pool.bullets; }

      session.messages.push(msg);
    }, 1200 + Math.random() * 700);
  }

  private pickResponse(msg: string) {
    const m = msg.toLowerCase();
    if (m.includes('payroll') || m.includes('salary') || m.includes('pay'))        return this.aiPool['payroll'];
    if (m.includes('pos') || m.includes('sales') || m.includes('transaction'))     return this.aiPool['pos'];
    if (m.includes('expense') || m.includes('claim') || m.includes('reimburs'))    return this.aiPool['expense'];
    if (m.includes('p&l') || m.includes('profit') || m.includes('account'))       return this.aiPool['accounting'];
    if (m.includes('leave') || m.includes('staff') || m.includes('hr') || m.includes('headcount')) return this.aiPool['hr'];
    if (m.includes('compliance') || m.includes('audit') || m.includes('tax'))      return this.aiPool['compliance'];
    return this.aiPool['default'];
  }

  private scrollToBottom() {
    try {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }
    } catch {}
  }

  copyText(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}