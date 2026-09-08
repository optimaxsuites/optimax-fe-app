import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ImageViewerData { src: string; }

@Component({
  selector: 'app-image-viewer-dialog',
  template: `
    <div class="iv-backdrop" (click)="close()">
      <button class="iv-close" (click)="close()" type="button" title="Close">
        <i class="fas fa-times"></i>
      </button>
      <img [src]="data.src" alt="Attachment preview"
           class="iv-img"
           (click)="$event.stopPropagation()" />
      <p class="iv-hint">Click outside or press Esc to close</p>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .iv-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.88);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 14px;
      cursor: default;
      padding: 40px 24px 24px;
      box-sizing: border-box;
    }

    .iv-img {
      display: block;
      max-width: 90vw;
      max-height: 80vh;
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: 10px;
      box-shadow: 0 28px 64px rgba(0,0,0,0.6);
      cursor: zoom-out;
    }

    .iv-close {
      position: absolute;
      top: 16px;
      right: 20px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.25);
      color: #fff;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s;
    }
    .iv-close:hover { background: rgba(255,255,255,0.35); }

    .iv-hint {
      font-size: 11px;
      color: rgba(255,255,255,0.5);
      margin: 0;
      letter-spacing: 0.3px;
    }
  `]
})
export class ImageViewerDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ImageViewerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ImageViewerData
  ) {
    dialogRef.addPanelClass('iv-dialog-panel');
  }

  close(): void { this.dialogRef.close(); }
}
