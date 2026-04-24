import { Component, OnInit } from '@angular/core';
import { BankConnectionDTO, CreateBankConnectionPayload } from '../../domain/accounting.dto';
import { DisbursementService } from '../../../services/disbursement.service';

interface BankConnectionForm {
  providerName: string;
  apiKey: string;
  secretKey: string;
  webhookUrl: string;
  active: boolean;
}

@Component({
  selector: 'app-bank-connection-settings',
  templateUrl: './bank-connection-settings.component.html',
  styleUrls: ['./bank-connection-settings.component.scss']
})
export class BankConnectionSettingsComponent implements OnInit {

  // ── List ─────────────────────────────────────────────────
  connections: BankConnectionDTO[] = [];
  isLoading = false;
  listError: string | null = null;

  // ── Form State ───────────────────────────────────────────
  showForm = false;
  isEditing = false;
  editingId: number | null = null;
  isSaving = false;
  formError: string | null = null;
  formSuccess: string | null = null;

  form: BankConnectionForm = {
    providerName: '',
    apiKey: '',
    secretKey: '',
    webhookUrl: '',
    active: true
  };

  // ── Reveal toggles (only for current session input) ───────
  revealApiKey = false;
  revealSecretKey = false;

  // ── Reveal per-row (for list view — always masked) ────────
  // We purposely never reveal server-returned maskets; just show dots.

  // ── Delete Confirm ───────────────────────────────────────
  deleteTargetId: number | null = null;
  isDeleting = false;
  deleteError: string | null = null;

  constructor(private disbursementService: DisbursementService) {}

  ngOnInit(): void {
    this.loadConnections();
  }

  loadConnections(): void {
    this.isLoading = true;
    this.listError = null;
    this.disbursementService.getBankConnections().subscribe({
      next: (resp: any) => {
        this.connections = resp.content || [];
        this.isLoading = false;
      },
      error: (err: any) => {
        this.listError = err?.error?.message || 'Failed to load bank connections.';
        this.isLoading = false;
      }
    });
  }

  openCreateForm(): void {
    this.isEditing = false;
    this.editingId = null;
    this.form = { providerName: '', apiKey: '', secretKey: '', webhookUrl: '', active: true };
    this.revealApiKey = false;
    this.revealSecretKey = false;
    this.formError = null;
    this.formSuccess = null;
    this.showForm = true;
  }

  openEditForm(conn: BankConnectionDTO): void {
    this.isEditing = true;
    this.editingId = conn.id;
    // Never populate secrets from server — user must re-enter to change
    this.form = {
      providerName: conn.providerName,
      apiKey: '',       // intentionally blank — server value never shown
      secretKey: '',    // intentionally blank — server value never shown
      webhookUrl: conn.webhookUrl,
      active: conn.active
    };
    this.revealApiKey = false;
    this.revealSecretKey = false;
    this.formError = null;
    this.formSuccess = null;
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.formError = null;
    this.formSuccess = null;
  }

  saveConnection(): void {
    if (!this.form.providerName.trim()) {
      this.formError = 'Provider name is required.';
      return;
    }
    if (!this.isEditing && !this.form.apiKey.trim()) {
      this.formError = 'API Key is required when creating a new connection.';
      return;
    }
    if (!this.isEditing && !this.form.secretKey.trim()) {
      this.formError = 'Secret Key is required when creating a new connection.';
      return;
    }

    this.isSaving = true;
    this.formError = null;
    this.formSuccess = null;

    if (this.isEditing && this.editingId !== null) {
      // Build partial payload — only send secrets if user typed new values
      const payload: Partial<CreateBankConnectionPayload> = {
        providerName: this.form.providerName,
        webhookUrl: this.form.webhookUrl,
        active: this.form.active
      };
      if (this.form.apiKey.trim()) payload.apiKey = this.form.apiKey;
      if (this.form.secretKey.trim()) payload.secretKey = this.form.secretKey;

      this.disbursementService.updateBankConnection(this.editingId, payload).subscribe({
        next: (updated: BankConnectionDTO) => {
          const idx = this.connections.findIndex(c => c.id === this.editingId);
          if (idx > -1) this.connections[idx] = updated;
          this.isSaving = false;
          this.formSuccess = 'Bank connection updated successfully.';
          setTimeout(() => this.closeForm(), 1500);
        },
        error: (err: any) => {
          this.formError = err?.error?.message || 'Failed to update bank connection.';
          this.isSaving = false;
        }
      });
    } else {
      const payload: CreateBankConnectionPayload = {
        providerName: this.form.providerName,
        apiKey: this.form.apiKey,
        secretKey: this.form.secretKey,
        webhookUrl: this.form.webhookUrl,
        active: this.form.active
      };
      this.disbursementService.createBankConnection(payload).subscribe({
        next: (created: BankConnectionDTO) => {
          this.connections.unshift(created);
          this.isSaving = false;
          this.formSuccess = 'Bank connection created successfully.';
          // Clear local secret values so they can never be read again
          this.form.apiKey = '';
          this.form.secretKey = '';
          setTimeout(() => this.closeForm(), 1500);
        },
        error: (err: any) => {
          this.formError = err?.error?.message || 'Failed to create bank connection.';
          this.isSaving = false;
        }
      });
    }
  }

  confirmDelete(id: number): void {
    this.deleteTargetId = id;
    this.deleteError = null;
  }

  cancelDelete(): void {
    this.deleteTargetId = null;
    this.deleteError = null;
  }

  executeDelete(): void {
    if (this.deleteTargetId === null) return;
    this.isDeleting = true;
    this.disbursementService.deleteBankConnection(this.deleteTargetId).subscribe({
      next: () => {
        this.connections = this.connections.filter(c => c.id !== this.deleteTargetId);
        this.deleteTargetId = null;
        this.isDeleting = false;
      },
      error: (err: any) => {
        this.deleteError = err?.error?.message || 'Failed to delete bank connection.';
        this.isDeleting = false;
      }
    });
  }
}
