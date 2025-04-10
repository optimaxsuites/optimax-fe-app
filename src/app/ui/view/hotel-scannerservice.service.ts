import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ScannerDevice {
  deviceId: string;
  name: string;
  status: 'ready' | 'busy' | 'offline';
}

export interface ScanResult {
  success: boolean;
  imageBuffer?: ArrayBuffer; // Raw image data (temporary, not stored)
  error?: string;
}

export interface ScanStatus {
  status: string;
  progress?: number;
}

@Injectable({
  providedIn: 'root',
})
export class HotelScannerserviceService {
  private scanner: any = null;
  private isInitialized = false;
  private scanInProgress = false;

  // Emit scanning status updates
  scanStatusChanged = new Subject<ScanStatus>();

  constructor() {
    this.initializeScanner();
  }

  private async initializeScanner(): Promise<void> {
    try {
      // This would be replaced with your actual scanner SDK initialization
      // Implementation depends on your specific scanner hardware

      // For example with a TWAIN-compatible scanner:
      // this.scanner = await window.Dynamsoft.DWT.GetWebTwain('scanner-container');
      // await this.scanner.OpenSourceAsync();

      // For demo purposes, we'll use a mock implementation
      this.scanner = {
        isConnected: true,
        deviceInfo: {
          name: 'Document Scanner',
          model: 'DS-2000',
          status: 'ready',
        },
      };

      this.isInitialized = true;
      console.log('Scanner initialized successfully');
    } catch (error) {
      console.error('Failed to initialize scanner:', error);
      this.isInitialized = false;
    }
  }

  async getConnectedDevices(): Promise<ScannerDevice[]> {
    if (!this.isInitialized) {
      await this.initializeScanner();
    }

    // For real implementation, return actual connected devices
    // Example with TWAIN:
    // const sources = await this.scanner.GetSourceNamesAsync();
    // return sources.map(source => ({ deviceId: source, name: source, status: 'ready' }));

    // Mock device list for development
    return [
      { deviceId: 'scanner-1', name: 'Document Scanner', status: 'ready' },
    ];
  }

  async startScan(): Promise<ScanResult> {
    if (this.scanInProgress) {
      return { success: false, error: 'Scanning already in progress' };
    }

    if (!this.isInitialized) {
      try {
        await this.initializeScanner();
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to initialize scanner',
        };
      }
    }

    this.scanInProgress = true;
    this.scanStatusChanged.next({ status: 'starting', progress: 0 });

    try {
      // In a real implementation, this would be actual scanner code
      // Example with a TWAIN scanner:
      // await this.scanner.AcquireImageAsync({
      //   PixelType: Dynamsoft.EnumDWT_PixelType.TWPT_RGB,
      //   Resolution: 300,
      //   IfShowUI: false
      // });
      // const count = this.scanner.HowManyImagesInBuffer;
      // if (count > 0) {
      //   const imageBuffer = await this.scanner.GetImageAsync(0); // Get first image
      //   return { success: true, imageBuffer };
      // }

      // For demo purposes, simulate scanning with progress updates
      await this.simulateScanProgress();

      // Get mock scan result
      const imageBuffer = await this.getMockScanBuffer();

      this.scanStatusChanged.next({ status: 'completed', progress: 100 });
      this.scanInProgress = false;

      return {
        success: true,
        imageBuffer,
      };
    } catch (error) {
      this.scanStatusChanged.next({ status: 'error' });
      this.scanInProgress = false;
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown scanning error',
      };
    }
  }

  private async simulateScanProgress(): Promise<void> {
    // Simulate scanning progress for development
    const steps = [10, 30, 50, 70, 90];
    for (const progress of steps) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      this.scanStatusChanged.next({ status: 'scanning', progress });
    }
  }

  private async getMockScanBuffer(): Promise<ArrayBuffer> {
    // In a real implementation, this would be the actual scan result
    // For development, we return a mock buffer with sample data that OCR can process

    // This is a very basic mock - in a real implementation, you'd get actual image data
    // For testing with OCR, you could load a test image or generate a synthetic ID image

    // Sample data (this won't work with actual OCR, just for TypeScript compilation)
    const mockData = new Uint8Array(1024).fill(0);
    return mockData.buffer;
  }

  cancelScan(): void {
    if (this.scanInProgress) {
      // In a real implementation:
      // this.scanner.CancelAllPendingTransfers();

      this.scanStatusChanged.next({ status: 'cancelled' });
      this.scanInProgress = false;
    }
  }

  closeScanner(): void {
    if (this.isInitialized) {
      // In a real implementation:
      // this.scanner.CloseSource();

      this.isInitialized = false;
      this.scanner = null;
    }
  }
}
