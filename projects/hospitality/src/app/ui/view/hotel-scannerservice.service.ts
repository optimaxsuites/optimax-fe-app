import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import Dynamsoft from 'dwt';

export interface ScannerDevice {
  deviceId: string;
  name: string;
  status: 'ready' | 'busy' | 'offline';
}

export interface ScanResult {
  success: boolean;
  imageBuffer?: ArrayBuffer;
  error?: string;
}

export const environment = {
  production: false, // true in prod
  dynamsoftLicenseKey: 'YOUR_LICENSE_KEY',
};

export interface ScanStatus {
  status:
    | 'idle'
    | 'initializing'
    | 'starting'
    | 'scanning'
    | 'processing'
    | 'completed'
    | 'error'
    | 'cancelled';
  progress?: number;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class HotelScannerserviceService {
  private DWObject: any = null;
  private isInitialized = false;
  private scanInProgress = false;

  private containerId = 'dwtControlContainer';

  // Status observable
  public scanStatus$ = new Subject<ScanStatus>();

  // Current status
  private currentStatus: ScanStatus = {
    status: 'idle',
  };

  constructor(private ngZone: NgZone) {
    // Initialize on service creation
    this.initializeDynamsoft();
  }

  /**
   * Initialize Dynamsoft Web TWAIN
   */
  private async initializeDynamsoft(): Promise<void> {
    if (this.isInitialized) return;

    this.updateStatus({
      status: 'initializing',
      message: 'Initializing scanner service...',
    });

    try {
      // Configure Dynamsoft settings
      Dynamsoft.DWT.ResourcesPath = environment.production
        ? '/assets/dwt-resources/'
        : 'https://unpkg.com/dwt@18.3.0/dist/';

      Dynamsoft.DWT.ProductKey = environment.dynamsoftLicenseKey;
      Dynamsoft.DWT.AutoLoad = true;
      Dynamsoft.DWT.Containers = [{ ContainerId: this.containerId }];

      // Create container if it doesn't exist
      this.ensureScannerContainer();

      // Load the WebTwain instance
      this.DWObject = await Dynamsoft.DWT.GetWebTwain(this.containerId);

      // Configure default settings
      this.configureScannerDefaults();

      this.isInitialized = true;
      this.updateStatus({
        status: 'idle',
        message: 'Scanner ready',
      });

      console.log('Dynamsoft Web TWAIN initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Dynamsoft:', error);
      this.updateStatus({
        status: 'error',
        message: 'Failed to initialize scanner. Please refresh the page.',
      });

      // Attempt recovery
      setTimeout(() => this.initializeDynamsoft(), 5000);
    }
  }

  private configureScannerDefaults(): void {
    if (!this.DWObject) return;

    // Set default scanner configuration
    this.DWObject.IfDisableSourceAfterAcquire = true;
    this.DWObject.IfShowUI = false;
    this.DWObject.TimeOut = 30000;
    this.DWObject.Resolution = 200;
    this.DWObject.PixelType = Dynamsoft.DWT.EnumDWT_PixelType.TWPT_GRAY;
    this.DWObject.PageSize = Dynamsoft.DWT.EnumDWT_CapSupportedSizes.TWSS_A4;

    // Register event handlers
    this.registerEventHandlers();
  }

  private registerEventHandlers(): void {
    if (!this.DWObject) return;

    // Progress updates during transfer
    this.DWObject.RegisterEvent('OnPostTransfer', () => {
      const progress = Math.min(
        90,
        (this.DWObject.CurrentImageIndexInBuffer / 1) * 100
      );
      this.updateStatus({
        status: 'scanning',
        progress,
        message: 'Scanning document...',
      });
    });

    // Error handling
    this.DWObject.RegisterEvent(
      'OnError',
      (errorCode: number, errorString: string) => {
        this.handleScannerError(errorCode, errorString);
      }
    );
  }

  private ensureScannerContainer(): void {
    if (!document.getElementById(this.containerId)) {
      const container = document.createElement('div');
      container.id = this.containerId;
      container.style.position = 'absolute';
      container.style.width = '0px';
      container.style.height = '0px';
      container.style.overflow = 'hidden';
      container.style.visibility = 'hidden';
      document.body.appendChild(container);
    }
  }

  /**
   * Get list of connected scanner devices
   */
  async getConnectedDevices(): Promise<ScannerDevice[]> {
    if (!this.isInitialized) {
      await this.initializeDynamsoft();
    }

    if (!this.DWObject) {
      throw new Error('Scanner not initialized');
    }

    try {
      // Refresh source list
      await this.refreshSources();

      const devices: ScannerDevice[] = [];
      for (let i = 0; i < this.DWObject.SourceCount; i++) {
        devices.push({
          deviceId: i.toString(),
          name: this.DWObject.GetSourceNameItems(i) || `Scanner ${i + 1}`,
          status: 'ready',
        });
      }

      return devices;
    } catch (error) {
      console.error('Error getting connected devices:', error);
      throw new Error(
        'Failed to get scanner devices. Please check your scanner connection.'
      );
    }
  }

  private async refreshSources(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (
        this.DWObject &&
        typeof this.DWObject.RefreshSourceList === 'function'
      ) {
        this.DWObject.RefreshSourceList();
        // Give some time for sources to refresh
        setTimeout(resolve, 1000);
      } else {
        resolve();
      }
    });
  }

  /**
   * Start scanning process
   */
  async startScan(deviceIndex = 0): Promise<ScanResult> {
    if (this.scanInProgress) {
      return {
        success: false,
        error: 'Scan already in progress',
      };
    }

    this.scanInProgress = true;

    this.updateStatus({
      status: 'starting',
      progress: 0,
      message: 'Preparing scanner...',
    });

    try {
      // Ensure initialized
      if (!this.isInitialized || !this.DWObject) {
        await this.initializeDynamsoft();
      }

      // Select source
      await this.selectSource(deviceIndex);

      // Clear buffer
      this.DWObject.RemoveAllImages();

      // Acquire image
      await this.acquireImage();

      // Convert to buffer
      const imageBuffer = await this.convertToBuffer();

      this.updateStatus({
        status: 'completed',
        progress: 100,
        message: 'Scan completed successfully',
      });

      return {
        success: true,
        imageBuffer,
      };
    } catch (error) {
      console.error('Scan error:', error);

      this.updateStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'Scan failed',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scan failed',
      };
    } finally {
      this.scanInProgress = false;
    }
  }

  private async selectSource(deviceIndex: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.DWObject) {
        return reject(new Error('Scanner not initialized'));
      }

      // First try async method if available
      if (typeof this.DWObject.SelectSourceAsync === 'function') {
        this.DWObject.SelectSourceAsync({
          deviceIndex,
          successCallback: () => resolve(),
          failureCallback: (errorCode: number, errorString: string) => {
            reject(new Error(errorString || 'Failed to select scanner'));
          },
        });
      }
      // Fallback to sync method
      else if (typeof this.DWObject.SelectSource === 'function') {
        const success = this.DWObject.SelectSource(deviceIndex);
        if (success) {
          resolve();
        } else {
          reject(new Error('Failed to select scanner'));
        }
      } else {
        // No selection method available
        console.warn('No source selection method available');
        resolve();
      }
    });
  }

  private async acquireImage(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.DWObject) {
        return reject(new Error('Scanner not initialized'));
      }

      this.updateStatus({
        status: 'scanning',
        progress: 5,
        message: 'Ready to scan...',
      });

      // Set timeout for scan operation
      const timeout = setTimeout(() => {
        reject(new Error('Scanner operation timed out'));
      }, 30000);

      this.DWObject.AcquireImage({
        successCallback: () => {
          clearTimeout(timeout);
          resolve();
        },
        failureCallback: (errorCode: number, errorString: string) => {
          clearTimeout(timeout);
          reject(
            new Error(errorString || `Scanner error (code: ${errorCode})`)
          );
        },
      });
    });
  }

  private async convertToBuffer(): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      if (!this.DWObject || this.DWObject.HowManyImagesInBuffer === 0) {
        return reject(new Error('No image to convert'));
      }

      this.updateStatus({
        status: 'processing',
        progress: 95,
        message: 'Processing scanned image...',
      });

      // First try JPEG
      this.DWObject.ConvertToBlob(
        [0], // First image
        Dynamsoft.DWT.EnumDWT_ImageType.IT_JPG,
        {
          onSuccess: (blob: Blob) =>
            this.blobToArrayBuffer(blob, resolve, reject),
          onFailure: (errorCode: number, errorString: string) => {
            console.warn('JPEG conversion failed, trying PNG:', errorString);
            // Fallback to PNG
            this.DWObject.ConvertToBlob(
              [0],
              Dynamsoft.DWT.EnumDWT_ImageType.IT_PNG,
              {
                onSuccess: (blob: Blob) =>
                  this.blobToArrayBuffer(blob, resolve, reject),
                onFailure: (errorCode: number, errorString: string) => {
                  reject(new Error(`Failed to convert image: ${errorString}`));
                },
              }
            );
          },
        }
      );
    });
  }

  private blobToArrayBuffer(
    blob: Blob,
    resolve: (value: ArrayBuffer) => void,
    reject: (reason?: any) => void
  ): void {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image data'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read image data'));
    };
    reader.readAsArrayBuffer(blob);
  }

  /**
   * Cancel current scan operation
   */
  cancelScan(): void {
    if (this.scanInProgress && this.DWObject) {
      try {
        if (typeof this.DWObject.CancelAllPendingTransfers === 'function') {
          this.DWObject.CancelAllPendingTransfers();
        }
        if (typeof this.DWObject.StopAcquire === 'function') {
          this.DWObject.StopAcquire();
        }

        this.updateStatus({
          status: 'cancelled',
          message: 'Scan cancelled',
        });
      } catch (error) {
        console.error('Error cancelling scan:', error);
      } finally {
        this.scanInProgress = false;
      }
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.DWObject) {
      try {
        if (typeof this.DWObject.CloseSource === 'function') {
          this.DWObject.CloseSource();
        }
        if (typeof this.DWObject.RemoveAllImages === 'function') {
          this.DWObject.RemoveAllImages();
        }
      } catch (error) {
        console.error('Error cleaning up scanner:', error);
      }
    }

    this.updateStatus({
      status: 'idle',
    });
  }

  private handleScannerError(errorCode: number, errorString: string): void {
    console.error(`Scanner error (${errorCode}): ${errorString}`);

    let userMessage = 'Scanner error occurred';

    // Handle specific error codes
    switch (errorCode) {
      case -1001: // Connection error
        userMessage = 'Scanner connection error. Please check the connection.';
        break;
      case -1006: // No scanner found
        userMessage = 'No scanner detected. Please connect a scanner.';
        break;
      case -1016: // Paper jam
        userMessage = 'Paper jam detected. Please clear the scanner.';
        break;
    }

    this.updateStatus({
      status: 'error',
      message: userMessage,
    });
  }

  private updateStatus(statusUpdate: Partial<ScanStatus>): void {
    this.currentStatus = {
      ...this.currentStatus,
      ...statusUpdate,
    };

    // Run in Angular zone to ensure change detection
    this.ngZone.run(() => {
      this.scanStatus$.next(this.currentStatus);
    });
  }
}
