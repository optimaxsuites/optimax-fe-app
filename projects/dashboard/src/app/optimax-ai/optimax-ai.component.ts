import {
  Component, OnInit, ViewChild,
  ElementRef, AfterViewChecked
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  OptimaxAiService,
  AgentPromptResponse,
  AgentPromptRequest,
  ChartPayload,
  KpiItem,
} from '../ui/services/optimax-ai.service';

// ─────────────────────────────────────────────────────
//  Domain Types
// ─────────────────────────────────────────────────────
export type ToneMode   = 'business' | 'casual';
export type FormatMode = 'markdown' | 'json' | 'chart';
export type ModuleKey  = 'all' | 'hr' | 'accounting' | 'pos' | 'expense';

// ─────────────────────────────────────────────────────
//  Chat Message — now fully driven by API response
// ─────────────────────────────────────────────────────
export interface ChatMessage {
  sender: 'ai' | 'user';
  text: string;
  time: string;
  format?: FormatMode;
  tone?: ToneMode;

  // ── API response fields ──
  executiveSummary?: string;
  kpis?: KpiItem[];
  actions?: string[];
  coverage?: string[];
  followUpPrompts?: string[];
  matchedScenario?: string;
  chart?: ChartPayload | null;
  rawJson?: string;         // full JSON when responseFormat === 'json'
  loading?: boolean;        // true while awaiting API response
  error?: string;           // error message if request failed
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

interface KpiCard {
  label: string;
  value: string;
  sub: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
}

// ─────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────
@Component({
  selector: 'app-optimaxai',
  templateUrl: './optimax-ai.component.html',
  styleUrls: ['./optimax-ai.component.scss'],
})
export class OptimaxaiComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  // ── State ──────────────────────────────────────────
  newChatMessage = '';
  aiTyping = false;
  activeChatId = '';
  showWelcome = true;
  tone: ToneMode = 'business';
  responseFormat: FormatMode = 'markdown';
  activeModule: ModuleKey = 'all';

  chatSessions: ChatSession[] = [
    {
      id: 's1',
      title: 'September Payroll Reconciliation',
      module: 'HR',
      time: 'Today 09:12',
      messages: [],
    },
    { id: 's2', title: 'Monthly Expense Report — Q3', module: 'EXPENSE', time: 'Today 11:30', messages: [] },
    { id: 's3', title: 'POS Revenue Analysis Aug', module: 'POS', time: 'Yesterday', messages: [] },
    { id: 's4', title: 'P&L Summary Draft', module: 'ACCT', time: 'Yesterday', messages: [] },
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

  formatOptions: FormatOption[] = [
    { key: 'markdown', label: `<svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> MD` },
    { key: 'json',     label: `<svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> JSON` },
    { key: 'chart',    label: `<svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg> Chart` },
  ];

  // Static KPI dashboard cards (not from AI, just module summary)
  private kpiMap: Record<ModuleKey, KpiCard[]> = {
    all: [
      { label: 'Total Revenue',    value: '₦24.6M', sub: 'Q3 YTD',           change: '+11%', trend: 'up'     },
      { label: 'Total Expenses',   value: '₦18.2M', sub: 'Q3 YTD',           change: '+4%',  trend: 'down'   },
      { label: 'Active Staff',     value: '47',      sub: 'Across all depts', change: '+2',   trend: 'up'     },
      { label: 'POS Transactions', value: '3,812',   sub: 'This month',       change: '+18%', trend: 'up'     },
    ],
    hr: [
      { label: 'Headcount',     value: '47',     sub: 'Active employees', change: '+2 hires', trend: 'up'   },
      { label: 'Gross Payroll', value: '₦8.42M', sub: 'Sep payroll',      change: '+3.1%',    trend: 'up'   },
      { label: 'Leave Requests', value: '7',     sub: 'Pending approval', change: '4 urgent', trend: 'down' },
      { label: 'Attendance',    value: '94%',    sub: 'Avg this month',   change: '+2%',      trend: 'up'   },
    ],
    accounting: [
      { label: 'Revenue',     value: '₦24.6M', sub: 'Q3 total',      change: '+11%',    trend: 'up'      },
      { label: 'EBITDA',      value: '₦6.4M',  sub: '26% margin',    change: '+1.4%',   trend: 'up'      },
      { label: 'Receivables', value: '₦2.1M',  sub: 'Outstanding',   change: '3 inv',   trend: 'down'    },
      { label: 'Payables',    value: '₦940K',  sub: 'Due this week', change: 'On time', trend: 'neutral' },
    ],
    pos: [
      { label: 'Today Revenue', value: '₦380K',  sub: 'As of now',          change: '+22%',  trend: 'up' },
      { label: 'Transactions',  value: '214',     sub: 'Today',              change: '+18',   trend: 'up' },
      { label: 'Top Item',      value: 'Grills',  sub: '₦84K sales',         change: '+18%',  trend: 'up' },
      { label: 'Avg Basket',    value: '₦1,776',  sub: 'Per transaction',    change: '+₦120', trend: 'up' },
    ],
    expense: [
      { label: 'Total Claims',      value: '₦1.23M', sub: 'This month',        change: '+9%',           trend: 'down' },
      { label: 'Pending Approval',  value: '12',      sub: 'Awaiting sign-off', change: '3 urgent',      trend: 'down' },
      { label: 'Approved',          value: '₦890K',   sub: 'Released',          change: 'On time',       trend: 'up'   },
      { label: 'Flagged',           value: '2',       sub: 'Policy breach',     change: 'Action needed', trend: 'down' },
    ],
  };

  private quickActionsMap: Record<ModuleKey, QuickAction[]> = {
    all: [
      { title: 'Payroll Summary',    description: 'Generate this month\'s payroll report with all deductions.',   prompt: 'Generate payroll summary for this month',        module: 'hr',         iconSvg: `<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>` },
      { title: 'POS Revenue Report', description: 'Analyse point-of-sale transactions and top-performing items.', prompt: 'Analyze this week\'s POS sales and top items',       module: 'pos',        iconSvg: `<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>` },
      { title: 'Expense Overview',   description: 'Review pending claims and flagged policy breaches.',           prompt: 'Show me this month\'s expense claims and flags',   module: 'expense',    iconSvg: `<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>` },
      { title: 'P&L Summary',        description: 'Quarterly profit & loss with EBITDA and margin breakdown.',   prompt: 'Give me Q3 profit and loss summary with margins',   module: 'accounting', iconSvg: `<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>` },
      { title: 'Leave Requests',     description: 'Review pending staff leave applications and approvals.',      prompt: 'Show pending leave requests and approval status',   module: 'hr',         iconSvg: `<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>` },
      { title: 'Compliance Check',   description: 'Audit tax brackets, pension remittances, and contracts.',    prompt: 'Run a compliance audit on tax and pension records', module: 'accounting', iconSvg: `<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>` },
    ],
    hr: [], accounting: [], pos: [], expense: [],
  };

  // ─────────────────────────────────────────────────
  //  Constructor
  // ─────────────────────────────────────────────────
  constructor(private aiService: OptimaxAiService) {}

  // ─────────────────────────────────────────────────
  //  Getters
  // ─────────────────────────────────────────────────
  get allSessions()   { return this.chatSessions; }
  get activeSession() { return this.chatSessions.find(s => s.id === this.activeChatId); }
  get activeMessages(): ChatMessage[] { return this.activeSession?.messages || []; }
  get activeKpis():    KpiCard[]      { return this.kpiMap[this.activeModule] || this.kpiMap['all']; }
  get activeQuickActions(): QuickAction[] {
    const list = this.quickActionsMap[this.activeModule];
    return (list?.length) ? list : this.quickActionsMap['all'];
  }
  get activeModuleLabel() { return this.erpModules.find(m => m.key === this.activeModule)?.label || 'All Modules'; }
  get inputPlaceholder()  {
    return this.tone === 'business'
      ? `Ask OptimaxAI about ${this.activeModuleLabel}...`
      : `Hey! What do you want to know about ${this.activeModuleLabel}?`;
  }

  // ─────────────────────────────────────────────────
  //  Lifecycle
  // ─────────────────────────────────────────────────
  ngOnInit() {}
  ngAfterViewChecked() { this.scrollToBottom(); }

  // ─────────────────────────────────────────────────
  //  UI helpers
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

  selectSession(id: string) { this.activeChatId = id; this.showWelcome = false; }

  newChat() {
    const id  = 'session-' + Date.now();
    const mod = this.activeModule === 'all' ? 'GEN' : this.activeModule.toUpperCase();
    this.chatSessions.unshift({ id, title: 'New conversation', module: mod, time: 'Just now', messages: [] });
    this.activeChatId = id;
    this.showWelcome  = false;
  }

  startWithAction(action: QuickAction) {
    this.newChat();
    setTimeout(() => this.sendMessage(action.prompt), 60);
  }

  copyText(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  // ─────────────────────────────────────────────────
  //  Core send — now calls the real API
  // ─────────────────────────────────────────────────
  sendMessage(text: string) {
    if (!text?.trim()) return;
    const session = this.activeSession;
    if (!session) return;

    const now     = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Update session title from first user message
    if (session.messages.length === 0) {
      session.title = text.trim().substring(0, 40) + (text.trim().length > 40 ? '...' : '');
    }

    // Push the user message
    session.messages.push({ sender: 'user', text: text.trim(), time: timeStr });
    this.newChatMessage = '';
    this.aiTyping = true;

    // Push a placeholder AI message that shows a loading state
    const placeholderMsg: ChatMessage = {
      sender: 'ai',
      text: '',
      time: timeStr,
      format: this.responseFormat,
      tone: this.tone,
      loading: true,
    };
    session.messages.push(placeholderMsg);

    // ── Build the request payload ──
    const domains = this.resolveDomains();
    const payload: AgentPromptRequest = {
      prompt: text.trim(),
      domains,
      mode: this.tone,
      responseFormat: this.responseFormat,
    };

    // ── Call the service ──
    this.aiService.sendPrompt(payload).subscribe({
      next: (res: AgentPromptResponse) => {
        this.aiTyping = false;
        const aiTime  = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Mutate the placeholder in-place so we don't get a flicker
        const idx = session.messages.indexOf(placeholderMsg);
        const filled: ChatMessage = {
          sender: 'ai',
          time: aiTime,
          format: this.responseFormat,
          tone: this.tone,
          loading: false,

          // ── Map every field from the API response ──
          text: res.executiveSummary || res.response || 'No summary returned.',
          executiveSummary: res.executiveSummary,
          kpis: res.kpis,
          actions: res.actions,
          coverage: res.coverage,
          followUpPrompts: res.followUpPrompts,
          matchedScenario: res.matchedScenario,
          chart: res.chart ?? null,

          // Full JSON blob for the JSON format view
          rawJson: JSON.stringify(res, null, 2),
        };
        if (idx !== -1) session.messages[idx] = filled;
        else session.messages.push(filled);
      },

      error: (err) => {
        this.aiTyping = false;
        const idx = session.messages.indexOf(placeholderMsg);
        const errMsg: ChatMessage = {
          sender: 'ai',
          text: 'Something went wrong while fetching the response. Please try again.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          format: 'markdown',
          loading: false,
          error: err?.message || 'Unknown error',
        };
        if (idx !== -1) session.messages[idx] = errMsg;
        else session.messages.push(errMsg);
      },
    });
  }

  // ─────────────────────────────────────────────────
  //  Helpers
  // ─────────────────────────────────────────────────

  /** Maps the active ERP module to one or more domain strings the API expects */
  private resolveDomains(): string[] {
    const map: Record<ModuleKey, string[]> = {
      all:        ['hr', 'accounting', 'pos', 'expense'],
      hr:         ['hr'],
      accounting: ['accounting'],
      pos:        ['pos'],
      expense:    ['expense'],
    };
    return map[this.activeModule] ?? ['hr'];
  }

  /** Builds an ApexCharts-compatible options object from the API chart payload */
  buildApexOptions(chart: ChartPayload): any {
    const isStacked = chart.variant?.includes('stacked');
    const isHorizontal = chart.variant?.includes('horizontal');
    const isLine = chart.type === 'line';
    const isPie  = chart.type === 'pie' || chart.type === 'donut';

    const palette = ['#2e6276', '#4a9db5', '#74c0d4', '#a8dce8', '#d0eff5', '#1a3d4a'];

    if (isPie) {
      return {
        chart:  { type: chart.type as any, toolbar: { show: false }, animations: { enabled: true, speed: 600 } },
        labels: chart.labels,
        colors: palette,
        legend: { position: 'bottom', fontSize: '11px', fontFamily: 'DM Sans, sans-serif' },
        dataLabels: { enabled: true, style: { fontSize: '11px', fontFamily: 'DM Sans, sans-serif' } },
        tooltip: { theme: 'light' },
      };
    }

    return {
      chart: {
        type: isLine ? 'line' : 'bar',
        stacked: isStacked,
        toolbar: { show: false },
        animations: { enabled: true, speed: 600 },
      },
      plotOptions: {
        bar: {
          horizontal: isHorizontal,
          borderRadius: 4,
          columnWidth: '55%',
        },
      },
      colors: palette,
      xaxis: {
        categories: chart.labels,
        title: { text: chart.xAxis, style: { fontSize: '10px', fontFamily: 'DM Sans, sans-serif', color: '#a0b0bc' } },
        labels: { style: { fontSize: '11px', fontFamily: 'DM Sans, sans-serif', colors: '#6b8898' } },
      },
      yaxis: {
        title: { text: chart.yAxis, style: { fontSize: '10px', fontFamily: 'DM Sans, sans-serif', color: '#a0b0bc' } },
        labels: { style: { fontSize: '11px', fontFamily: 'DM Sans, sans-serif', colors: '#6b8898' } },
      },
      legend: {
        show: chart.datasets.length > 1,
        position: 'top',
        fontSize: '11px',
        fontFamily: 'DM Sans, sans-serif',
      },
      dataLabels: { enabled: false },
      stroke: isLine ? { curve: 'smooth', width: 2 } : { show: false },
      grid: { borderColor: '#f0f4f7', strokeDashArray: 4 },
      tooltip: { theme: 'light', style: { fontSize: '12px', fontFamily: 'DM Sans, sans-serif' } },
    };
  }

  /** Converts the API datasets array into the ApexCharts `series` format */
  buildApexSeries(chart: ChartPayload): any[] {
    if (chart.type === 'pie' || chart.type === 'donut') {
      // Pie/donut: series is a flat number array, labels handled via `labels`
      return chart.datasets[0]?.data ?? [];
    }
    return chart.datasets.map(ds => ({ name: ds.label, data: ds.data }));
  }

  private scrollToBottom() {
    try {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }
    } catch {}
  }
}