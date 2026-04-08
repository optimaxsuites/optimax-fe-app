import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../sharedComponent/service/environments/environment';

// ─────────────────────────────────────────────────────
//  Request / Response Types
// ─────────────────────────────────────────────────────

export interface AgentPromptRequest {
  prompt: string;
  domains: string[];
  mode: string; // 'business' | 'casual'
  responseFormat: string; // 'markdown' | 'json' | 'chart'
}

export interface KpiItem {
  metric: string;
  value: string | number;
}

export interface ChartDataset {
  label: string;
  data: number[];
}

export interface ChartPayload {
  type: string;
  variant: string;
  title: string;
  xAxis: string;
  yAxis: string;
  labels: string[];
  datasets: ChartDataset[];
  options?: any;
  empty: boolean;
}

export interface AnalysisPlan {
  planType: string;
  scenarioTitle: string;
  scenarioDomain: string;
  analysisType: string;
  timeframe: string;
  branchId: string | null;
  domains: string[];
  basePrompt: string;
  nextPrompt: string;
}

export interface AgentPromptResponse {
  provider: string;
  prompt: string;
  mode: string;
  responseFormat: string;
  response: string | null;
  domains: string[];
  executiveSummary: string;
  kpis: KpiItem[];
  coverage: string[];
  actions: string[];
  followUpPrompts: string[];
  dynamicScenario: boolean;
  matchedScenario: string;
  analysisPlan: AnalysisPlan;
  chart: ChartPayload | null;
  generatedAt: number[];
}

// ─────────────────────────────────────────────────────
//  Service
// ─────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root',
})
export class OptimaxAiService {
  // ── Swap this for your actual base URL / env variable ──
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  /**
   * Send a prompt to the AI agent endpoint.
   * POST /x/api/v2/ai/agent/prompt
   */
  sendPrompt(payload: AgentPromptRequest): Observable<AgentPromptResponse> {
    const tenantId = sessionStorage.getItem('tenantId') || 'default';
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenantId,
      Authorization: `Bearer ${sessionStorage.getItem('token') || ''}`,
    });
    return this.http.post<AgentPromptResponse>(
      `${this.baseUrl}/ai/agent/prompt`,
      payload,
      { headers },
    );
  }
}
