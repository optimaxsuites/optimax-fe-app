import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { EmployeeProfile } from '../../ui/services/collaboration.service';

export interface ChannelModalState {
  open: boolean;
  mode: 'create' | 'edit';
  name: string;
  description: string;
  channelType: 'PUBLIC' | 'PRIVATE';
  workspaceMode: 'CHAT' | 'DOCUMENT_LIBRARY' | 'HYBRID';
  allowFolders: boolean;
  allowSubfolders: boolean;
  selectedUserIds: number[];
  saving: boolean;
  error: string;
  editingChannelId?: number;
  editingCreatedBy?: number;
}

@Component({
  selector: 'app-channel-modal',
  templateUrl: './channel-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelModalComponent {
  @Input() state!: ChannelModalState;
  @Input() modalEmployees: EmployeeProfile[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();
  @Output() nameChange = new EventEmitter<string>();
  @Output() descriptionChange = new EventEmitter<string>();
  @Output() channelTypeChange = new EventEmitter<'PUBLIC' | 'PRIVATE'>();
  @Output() workspaceModeChange = new EventEmitter<'CHAT' | 'DOCUMENT_LIBRARY' | 'HYBRID'>();
  @Output() allowFoldersChange = new EventEmitter<boolean>();
  @Output() allowSubfoldersChange = new EventEmitter<boolean>();
  @Output() memberToggled = new EventEmitter<number>();

  getEmpName(e: EmployeeProfile): string {
    return (
      `${e.firstName || ''} ${e.lastName || ''}`.trim() ||
      e.fullname ||
      e.user?.fullname ||
      `User ${e.id}`
    );
  }

  getEmpInitials(e: EmployeeProfile): string {
    const name = this.getEmpName(e);
    const p = name.trim().split(/\s+/).filter(Boolean);
    if (p.length >= 2) return `${p[0][0]}${p[1][0]}`.toUpperCase();
    if (p.length === 1 && p[0].length >= 2)
      return p[0].slice(0, 2).toUpperCase();
    return 'U?';
  }

  getEmpAvatarColor(e: EmployeeProfile): string {
    const COLORS = [
      '#10b981',
      '#6366f1',
      '#f59e0b',
      '#2e6276',
      '#ec4899',
      '#14b8a6',
      '#8b5cf6',
      '#0ea5e9',
    ];
    return COLORS[Math.abs(e.id) % COLORS.length];
  }

  getEmpImageUrl(e: EmployeeProfile): string | undefined {
    return undefined; // Parent manages image cache; pass via additional input if needed
  }

  isMemberSelected(userId: number): boolean {
    return this.state.selectedUserIds.includes(userId);
  }

  isDocumentLibraryMode(): boolean {
    return this.state.workspaceMode === 'DOCUMENT_LIBRARY' || this.state.workspaceMode === 'HYBRID';
  }
}
