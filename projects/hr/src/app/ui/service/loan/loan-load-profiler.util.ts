import { isDevMode } from '@angular/core';

type LoadMetricStatus = 'success' | 'error';

type LoadMetric = {
  label: string;
  durationMs: number;
  status: LoadMetricStatus;
  meta?: Record<string, unknown>;
  recordedAt: string;
};

declare global {
  interface Window {
    __erpHrPerf?: LoadMetric[];
  }
}

export type LoanLoadProfiler = {
  success(meta?: Record<string, unknown>): void;
  error(meta?: Record<string, unknown>): void;
};

export function startLoanLoadProfiler(label: string): LoanLoadProfiler {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const record = (status: LoadMetricStatus, meta?: Record<string, unknown>) => {
    const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const metric: LoadMetric = {
      label,
      durationMs: Number((end - start).toFixed(1)),
      status,
      meta,
      recordedAt: new Date().toISOString()
    };

    if (typeof window !== 'undefined') {
      window.__erpHrPerf = [...(window.__erpHrPerf || []).slice(-49), metric];
    }

    if (isDevMode()) {
      const method = status === 'error' ? 'warn' : 'info';
      console[method](`[loan-perf] ${label} ${status} in ${metric.durationMs}ms`, meta || {});
    }
  };

  return {
    success(meta?: Record<string, unknown>) {
      record('success', meta);
    },
    error(meta?: Record<string, unknown>) {
      record('error', meta);
    }
  };
}