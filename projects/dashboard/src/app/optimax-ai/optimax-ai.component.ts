import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewChecked,
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
export type FormatMode = 'markdown' | 'chart';
export type ModuleKey = 'all' | 'hr' | 'accounting' | 'pos' | 'expense';

// ─────────────────────────────────────────────────────
//  Heatmap cell (pre-computed, no functions in template)
// ─────────────────────────────────────────────────────
export interface HeatmapCell {
  label: string;
  value: number;
  displayValue: string;
  bg: string;
}

// ─────────────────────────────────────────────────────
//  Chat Message
// ─────────────────────────────────────────────────────
export interface ChatMessage {
  sender: 'ai' | 'user';
  text: string;
  time: string;
  format?: FormatMode;

  executiveSummary?: string;
  kpis?: KpiItem[];
  actions?: string[];
  followUpPrompts?: string[];
  matchedScenario?: string;
  chart?: ChartPayload | null;
  rawJson?: string;
  loading?: boolean;
  error?: string;

  isHeatmap?: boolean;
  heatmapCells?: HeatmapCell[];
  apexSeries?: any[];
  apexOptions?: any;
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

interface SuggestedPrompt {
  label: string;
  prompt: string;
  icon: string;
}

interface KpiCard {
  label: string;
  value: string;
  sub: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
}

// ─────────────────────────────────────────────────────
//  Keywords that signal the user wants a chart
// ─────────────────────────────────────────────────────
const CHART_KEYWORDS = [
  'chart',
  'graph',
  'plot',
  'visuali',
  'trend',
  'compare',
  'comparison',
  'breakdown',
  'distribution',
  'over time',
  'bar',
  'line chart',
  'pie',
  'histogram',
  'show me the',
  'monthly',
  'weekly',
  'quarterly',
  'annual',
  'by month',
  'by week',
  'by day',
  'by quarter',
  'revenue trend',
  'sales trend',
  'expense trend',
  'performance chart',
  'analytics',
];

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
  @ViewChild('mainTextarea') mainTextarea!: ElementRef;
  @ViewChild('chatTextarea') chatTextarea!: ElementRef;

  newChatMessage = '';
  aiTyping = false;
  activeChatId = '';
  showWelcome = true;
  activeModule: ModuleKey = 'all';

  // Tone is always business — not exposed in UI
  private readonly tone = 'business';

  chatSessions: ChatSession[] = [
    {
      id: 's1',
      title: 'September Payroll Reconciliation',
      module: 'HR',
      time: 'Today 09:12',
      messages: [],
    },
    {
      id: 's2',
      title: 'Monthly Expense Report — Q3',
      module: 'EXPENSE',
      time: 'Today 11:30',
      messages: [],
    },
    {
      id: 's3',
      title: 'POS Revenue Analysis Aug',
      module: 'POS',
      time: 'Yesterday',
      messages: [],
    },
    {
      id: 's4',
      title: 'P&L Summary Draft',
      module: 'ACCT',
      time: 'Yesterday',
      messages: [],
    },
  ];

  erpModules: ErpModule[] = [
    {
      key: 'all',
      label: 'All Modules',
      icon: `<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>`,
    },
    {
      key: 'hr',
      label: 'HR & Payroll',
      badge: '3',
      badgeColor: 'bg-emerald-50 text-emerald-600',
      icon: `<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
    },
    {
      key: 'accounting',
      label: 'Accounting',
      icon: `<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>`,
    },
    {
      key: 'pos',
      label: 'Point of Sale',
      badge: 'Live',
      badgeColor: 'bg-[#eaf2f6] text-[#2e6276]',
      icon: `<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>`,
    },
    {
      key: 'expense',
      label: 'Expenses',
      badge: '!',
      badgeColor: 'bg-red-50 text-red-500',
      icon: `<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>`,
    },
  ];

  // Modern suggested prompts — minimal, no cards grid
  suggestedPrompts: SuggestedPrompt[] = [
    {
      label: 'Payroll summary for this month',
      prompt: 'Generate payroll summary for this month',
      icon: `<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
    },
    {
      label: 'POS revenue trend this week',
      prompt: "Show me a chart of this week's POS sales trend",
      icon: `<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`,
    },
    {
      label: 'Pending expense claims and flags',
      prompt: "Show me this month's expense claims and any flagged items",
      icon: `<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>`,
    },
    {
      label: 'Q3 profit & loss with margins',
      prompt:
        'Give me Q3 profit and loss summary with EBITDA and margin breakdown',
      icon: `<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>`,
    },
    {
      label: 'Pending staff leave requests',
      prompt: 'Show pending leave requests and approval status',
      icon: `<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
    },
    {
      label: 'Tax and pension compliance audit',
      prompt: 'Run a compliance audit on tax brackets and pension remittances',
      icon: `<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    },
  ];

  private kpiMap: Record<ModuleKey, KpiCard[]> = {
    all: [
      {
        label: 'Total Revenue',
        value: '₦24.6M',
        sub: 'Q3 YTD',
        change: '+11%',
        trend: 'up',
      },
      {
        label: 'Total Expenses',
        value: '₦18.2M',
        sub: 'Q3 YTD',
        change: '+4%',
        trend: 'down',
      },
      {
        label: 'Active Staff',
        value: '47',
        sub: 'Across all depts',
        change: '+2',
        trend: 'up',
      },
      {
        label: 'POS Transactions',
        value: '3,812',
        sub: 'This month',
        change: '+18%',
        trend: 'up',
      },
    ],
    hr: [
      {
        label: 'Headcount',
        value: '47',
        sub: 'Active employees',
        change: '+2 hires',
        trend: 'up',
      },
      {
        label: 'Gross Payroll',
        value: '₦8.42M',
        sub: 'Sep payroll',
        change: '+3.1%',
        trend: 'up',
      },
      {
        label: 'Leave Requests',
        value: '7',
        sub: 'Pending approval',
        change: '4 urgent',
        trend: 'down',
      },
      {
        label: 'Attendance',
        value: '94%',
        sub: 'Avg this month',
        change: '+2%',
        trend: 'up',
      },
    ],
    accounting: [
      {
        label: 'Revenue',
        value: '₦24.6M',
        sub: 'Q3 total',
        change: '+11%',
        trend: 'up',
      },
      {
        label: 'EBITDA',
        value: '₦6.4M',
        sub: '26% margin',
        change: '+1.4%',
        trend: 'up',
      },
      {
        label: 'Receivables',
        value: '₦2.1M',
        sub: 'Outstanding',
        change: '3 inv',
        trend: 'down',
      },
      {
        label: 'Payables',
        value: '₦940K',
        sub: 'Due this week',
        change: 'On time',
        trend: 'neutral',
      },
    ],
    pos: [
      {
        label: 'Today Revenue',
        value: '₦380K',
        sub: 'As of now',
        change: '+22%',
        trend: 'up',
      },
      {
        label: 'Transactions',
        value: '214',
        sub: 'Today',
        change: '+18',
        trend: 'up',
      },
      {
        label: 'Top Item',
        value: 'Grills',
        sub: '₦84K sales',
        change: '+18%',
        trend: 'up',
      },
      {
        label: 'Avg Basket',
        value: '₦1,776',
        sub: 'Per transaction',
        change: '+₦120',
        trend: 'up',
      },
    ],
    expense: [
      {
        label: 'Total Claims',
        value: '₦1.23M',
        sub: 'This month',
        change: '+9%',
        trend: 'down',
      },
      {
        label: 'Pending Approval',
        value: '12',
        sub: 'Awaiting sign-off',
        change: '3 urgent',
        trend: 'down',
      },
      {
        label: 'Approved',
        value: '₦890K',
        sub: 'Released',
        change: 'On time',
        trend: 'up',
      },
      {
        label: 'Flagged',
        value: '2',
        sub: 'Policy breach',
        change: 'Action needed',
        trend: 'down',
      },
    ],
  };

  constructor(private aiService: OptimaxAiService) {}

  // ─────────────────────────────────────────────────
  //  Getters
  // ─────────────────────────────────────────────────
  get allSessions() {
    return this.chatSessions;
  }
  get activeSession() {
    return this.chatSessions.find((s) => s.id === this.activeChatId);
  }
  get activeMessages(): ChatMessage[] {
    return this.activeSession?.messages || [];
  }
  get activeKpis(): KpiCard[] {
    return this.kpiMap[this.activeModule] || this.kpiMap['all'];
  }
  get activeModuleLabel() {
    return (
      this.erpModules.find((m) => m.key === this.activeModule)?.label ||
      'All Modules'
    );
  }
  get inputPlaceholder() {
    return `Ask OptimaXAI about ${this.activeModuleLabel}…`;
  }

  ngOnInit() {}
  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  // ─────────────────────────────────────────────────
  //  Smart format inference from prompt
  // ─────────────────────────────────────────────────
  private inferFormat(prompt: string): FormatMode {
    const lower = prompt.toLowerCase();
    return CHART_KEYWORDS.some((kw) => lower.includes(kw))
      ? 'chart'
      : 'markdown';
  }

  // ─────────────────────────────────────────────────
  //  Auto-expand textarea
  // ─────────────────────────────────────────────────
  autoResize(event: Event) {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }

  handleEnterWelcome(event: KeyboardEvent) {
    if (event.shiftKey) return;
    event.preventDefault();
    this.newChat();
    this.sendMessage(this.newChatMessage);
  }

  handleEnterChat(event: KeyboardEvent) {
    if (event.shiftKey) return;
    event.preventDefault();
    this.sendMessage(this.newChatMessage);
  }

  resetTextareaHeight(ref: HTMLTextAreaElement | undefined) {
    if (ref) {
      ref.style.height = 'auto';
    }
  }

  // ─────────────────────────────────────────────────
  //  UI helpers
  // ─────────────────────────────────────────────────
  selectModule(key: ModuleKey) {
    this.activeModule = key;
  }

  getModuleBadgeClass(mod: string): string {
    const m = mod?.toUpperCase();
    if (m === 'HR') return 'bg-emerald-50 text-emerald-600';
    if (m === 'POS') return 'bg-[#eaf2f6] text-[#2e6276]';
    if (m === 'EXPENSE') return 'bg-red-50 text-red-500';
    if (m === 'ACCT') return 'bg-violet-50 text-violet-500';
    return 'bg-[#f0f4f7] text-[#6b8898]';
  }

  selectSession(id: string) {
    this.activeChatId = id;
    this.showWelcome = false;
  }

  newChat() {
    const id = 'session-' + Date.now();
    const mod =
      this.activeModule === 'all' ? 'GEN' : this.activeModule.toUpperCase();
    this.chatSessions.unshift({
      id,
      title: 'New conversation',
      module: mod,
      time: 'Just now',
      messages: [],
    });
    this.activeChatId = id;
    this.showWelcome = false;
  }

  startWithSuggestion(prompt: string) {
    this.newChat();
    setTimeout(() => this.sendMessage(prompt), 60);
  }

  copyText(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  // ─────────────────────────────────────────────────
  //  KPI display helpers
  // ─────────────────────────────────────────────────
  displayKpis(kpis: KpiItem[] | undefined): KpiItem[] {
    if (!kpis) return [];
    const SKIP_METRICS = ['request'];
    return kpis.filter(
      (k) =>
        !SKIP_METRICS.includes(k.metric?.toLowerCase()) &&
        (k.value?.toString().length ?? 0) <= 40,
    );
  }

  // ─────────────────────────────────────────────────
  //  Heatmap helpers
  // ─────────────────────────────────────────────────
  private detectHeatmap(chart: ChartPayload | null | undefined): boolean {
    if (!chart) return false;
    const t = String(chart.type || '').toLowerCase();
    const v = String(chart.variant || '').toLowerCase();
    const hint = String((chart as any).options?.renderHint || '').toLowerCase();
    return t === 'heatmap' || v === 'heatmap' || hint === 'matrix';
  }

  private heatmapColor(value: number, min: number, max: number): string {
    if (max === min) return 'rgba(46,98,118,0.65)';
    const ratio = (value - min) / (max - min);
    const alpha = 0.12 + ratio * 0.83;
    return `rgba(46,98,118,${alpha.toFixed(3)})`;
  }

  private buildHeatmapCells(chart: ChartPayload): HeatmapCell[] {
    const values = chart.datasets?.[0]?.data ?? [];
    const nums = values.map((v) => Number(v) || 0);
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    return (chart.labels || []).map((label, idx) => {
      const value = nums[idx] ?? 0;
      return {
        label,
        value,
        displayValue: value.toLocaleString(),
        bg: this.heatmapColor(value, min, max),
      };
    });
  }

  // ─────────────────────────────────────────────────
  //  ApexCharts pre-computation
  // ─────────────────────────────────────────────────
  private buildApexData(chart: ChartPayload): { series: any[]; options: any } {
    const isStacked = chart.variant?.includes('stacked');
    const isHorizontal = chart.variant?.includes('horizontal');
    const isLine = chart.type === 'line';
    const isPie = chart.type === 'pie' || chart.type === 'donut';
    const palette = [
      '#2e6276',
      '#4a9db5',
      '#74c0d4',
      '#a8dce8',
      '#d0eff5',
      '#1a3d4a',
    ];

    if (isPie) {
      return {
        series: chart.datasets[0]?.data ?? [],
        options: {
          chart: {
            type: chart.type as any,
            toolbar: { show: false },
            animations: { enabled: true, speed: 600 },
          },
          labels: chart.labels,
          colors: palette,
          legend: {
            position: 'bottom',
            fontSize: '11px',
            fontFamily: 'DM Sans, sans-serif',
          },
          dataLabels: {
            enabled: true,
            style: { fontSize: '11px', fontFamily: 'DM Sans, sans-serif' },
          },
          tooltip: { theme: 'light' },
        },
      };
    }

    return {
      series: chart.datasets.map((ds) => ({ name: ds.label, data: ds.data })),
      options: {
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
          title: {
            text: chart.xAxis,
            style: {
              fontSize: '10px',
              fontFamily: 'DM Sans, sans-serif',
              color: '#a0b0bc',
            },
          },
          labels: {
            style: {
              fontSize: '11px',
              fontFamily: 'DM Sans, sans-serif',
              colors: '#6b8898',
            },
          },
        },
        yaxis: {
          title: {
            text: chart.yAxis,
            style: {
              fontSize: '10px',
              fontFamily: 'DM Sans, sans-serif',
              color: '#a0b0bc',
            },
          },
          labels: {
            style: {
              fontSize: '11px',
              fontFamily: 'DM Sans, sans-serif',
              colors: '#6b8898',
            },
          },
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
        tooltip: {
          theme: 'light',
          style: { fontSize: '12px', fontFamily: 'DM Sans, sans-serif' },
        },
      },
    };
  }

  // ─────────────────────────────────────────────────
  //  Core send
  // ─────────────────────────────────────────────────
  sendMessage(text: string) {
    if (!text?.trim()) return;
    const session = this.activeSession;
    if (!session) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Auto-title the session from first message
    if (session.messages.length === 0) {
      session.title =
        text.trim().substring(0, 40) + (text.trim().length > 40 ? '...' : '');
    }

    // Smart format detection
    const inferredFormat = this.inferFormat(text.trim());

    session.messages.push({ sender: 'user', text: text.trim(), time: timeStr });
    this.newChatMessage = '';

    // Reset textarea heights
    setTimeout(() => {
      document.querySelectorAll('.oai-textarea').forEach((el) => {
        (el as HTMLTextAreaElement).style.height = 'auto';
      });
    }, 0);

    this.aiTyping = true;

    const placeholderMsg: ChatMessage = {
      sender: 'ai',
      text: '',
      time: timeStr,
      format: inferredFormat,
      loading: true,
    };
    session.messages.push(placeholderMsg);

    const payload: AgentPromptRequest = {
      prompt: text.trim(),
      domains: this.resolveDomains(),
      mode: this.tone,
      responseFormat: inferredFormat,
    };

    this.aiService.sendPrompt(payload).subscribe({
      next: (res: AgentPromptResponse) => {
        this.aiTyping = false;
        const aiTime = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        const idx = session.messages.indexOf(placeholderMsg);
        const isHeatmap = this.detectHeatmap(res.chart);

        let apexSeries: any[] | undefined;
        let apexOptions: any | undefined;
        let heatmapCells: HeatmapCell[] | undefined;

        if (res.chart && !res.chart.empty) {
          if (isHeatmap) {
            heatmapCells = this.buildHeatmapCells(res.chart);
          } else {
            const d = this.buildApexData(res.chart);
            apexSeries = d.series;
            apexOptions = d.options;
          }
        }

        const filled: ChatMessage = {
          sender: 'ai',
          time: aiTime,
          format: inferredFormat,
          loading: false,

          text: res.response || res.executiveSummary || '',
          executiveSummary: res.executiveSummary,
          kpis: res.kpis,
          actions: res.actions,
          followUpPrompts: res.followUpPrompts,
          matchedScenario: res.matchedScenario,
          chart: res.chart ?? null,
          rawJson: JSON.stringify(res, null, 2),

          isHeatmap,
          heatmapCells,
          apexSeries,
          apexOptions,
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
          time: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          format: 'markdown',
          loading: false,
          error: err?.message || 'Unknown error',
        };
        if (idx !== -1) session.messages[idx] = errMsg;
        else session.messages.push(errMsg);
      },
    });
  }

  private resolveDomains(): string[] {
    const map: Record<ModuleKey, string[]> = {
      all: ['hr', 'accounting', 'pos', 'expense'],
      hr: ['hr'],
      accounting: ['accounting'],
      pos: ['pos'],
      expense: ['expense'],
    };
    return map[this.activeModule] ?? ['hr'];
  }

  private scrollToBottom() {
    try {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop =
          this.chatContainer.nativeElement.scrollHeight;
      }
    } catch {}
  }
  onWelcomeKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.newChat();
      this.sendMessage(this.newChatMessage);
    }
  }

  onChatKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage(this.newChatMessage);
    }
  }
}
