import { Component, Input } from '@angular/core';
import { AccountingDiagnostics } from '../../../core/services/accounting.service';

@Component({
  selector: 'app-accounting-diagnostics',
  template: `
    <section class="accounting-diagnostics-card">
      <header>
        <h2>Accounting Diagnostics</h2>
        <p>Service state, request diagnostics, and configuration checks.</p>
      </header>

      <div class="diagnostics-grid">
        <div class="diagnostic-item">
          <span class="label">Entity ID</span>
          <span class="value">{{ diagnostics?.entityId || 'Not resolved' }}</span>
        </div>
        <div class="diagnostic-item">
          <span class="label">Tenant ID</span>
          <span class="value">{{ diagnostics?.tenantId || 'Not resolved' }}</span>
        </div>
        <div class="diagnostic-item">
          <span class="label">Token status</span>
          <span class="value">{{ diagnostics?.tokenPresent ? 'Present' : 'Missing' }}</span>
        </div>
        <div class="diagnostic-item">
          <span class="label">Token source</span>
          <span class="value">{{ diagnostics?.tokenSource }}</span>
        </div>
      </div>

      <div class="diagnostics-detail" *ngIf="diagnostics?.lastRequest">
        <h3>Last API request</h3>
        <div>
          <strong>{{ diagnostics?.lastRequest?.method }}</strong>
          <span>{{ diagnostics?.lastRequest?.path }}</span>
        </div>
        <small>{{ diagnostics?.lastRequest?.timestamp | date:'short' }}</small>
        <pre>{{ diagnostics?.lastRequest?.payload | json }}</pre>
      </div>

      <div class="diagnostics-detail error" *ngIf="diagnostics?.lastError">
        <h3>Last API error</h3>
        <div>
          <strong>{{ diagnostics?.lastError?.method }}</strong>
          <span>{{ diagnostics?.lastError?.path }}</span>
        </div>
        <small>{{ diagnostics?.lastError?.timestamp | date:'short' }}</small>
        <pre>{{ diagnostics?.lastError?.error | json }}</pre>
      </div>
    </section>
  `,
  styles: [
    `
      .accounting-diagnostics-card {
        border: 1px solid #d9d9d9;
        border-radius: 12px;
        padding: 1rem;
        margin-bottom: 1.5rem;
        background: #fff;
      }

      .accounting-diagnostics-card header h2 {
        margin: 0;
        font-size: 1.15rem;
      }

      .accounting-diagnostics-card header p {
        margin: 0.25rem 0 1rem;
        color: #666;
      }

      .diagnostics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 0.75rem;
        margin-bottom: 1rem;
      }

      .diagnostic-item {
        background: #f8f9fa;
        padding: 0.85rem;
        border-radius: 8px;
      }

      .diagnostic-item .label {
        display: block;
        font-size: 0.8rem;
        color: #555;
      }

      .diagnostic-item .value {
        display: block;
        margin-top: 0.35rem;
        font-weight: 600;
      }

      .diagnostics-detail {
        margin-top: 1rem;
      }

      .diagnostics-detail h3 {
        margin-bottom: 0.5rem;
      }

      .diagnostics-detail pre {
        background: #f3f4f6;
        border-radius: 8px;
        padding: 0.75rem;
        overflow: auto;
        font-size: 0.82rem;
      }

      .diagnostics-detail.error {
        border-left: 3px solid #d93025;
        padding-left: 0.75rem;
      }
    `,
  ],
})
export class AccountingDiagnosticsComponent {
  @Input() diagnostics: AccountingDiagnostics | null = null;
}
