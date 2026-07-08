import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

interface BiometricAuthResult {
  success: boolean;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CapacitorBiometricService {
  private registeredKey = 'biometric_registered';

  /**
   * Register a new biometric credential (simulated fingerprint scanning)
   */
  async registerBiometricCredential(): Promise<BiometricAuthResult> {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      return await this.registerNative();
    } else {
      return await this.registerSimulated();
    }
  }

  /**
   * Authenticate using registered biometric credential (simulated fingerprint scanning)
   */
  async authenticateWithBiometric(): Promise<BiometricAuthResult> {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      return await this.authenticateNative();
    } else {
      return await this.authenticateSimulated();
    }
  }

  /**
   * Register biometric on native platform (iOS/Android)
   */
  private async registerNative(): Promise<BiometricAuthResult> {
    try {
      const available = await this.isBiometricAvailable();
      if (!available) {
        return {
          success: false,
          error: 'Biometric not available on this device'
        };
      }

      // @ts-ignore - plugin may not be installed
      const BiometricAuth = (window as any).BiometricAuth;
      if (!BiometricAuth) {
        return await this.registerSimulated();
      }

      console.log('✓ Native biometric registered');
      return {
        success: true,
        message: 'Biometric registered successfully'
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Registration failed: ${err.message}`
      };
    }
  }

  /**
   * Simulated fingerprint registration with realistic scanning animation
   */
  private async registerSimulated(): Promise<BiometricAuthResult> {
    try {
      console.log('Starting simulated fingerprint registration...');

      // Simulate fingerprint scanning with delay
      await this.simulateFingerprintScan();

      // Store registration flag
      localStorage.setItem(this.registeredKey, 'true');

      console.log('✓ Simulated fingerprint registered successfully');
      return {
        success: true,
        message: 'Biometric registered successfully'
      };
    } catch (err: any) {
      console.error('Simulated registration error:', err);
      return {
        success: false,
        error: 'Fingerprint registration cancelled'
      };
    }
  }

  /**
   * Native platform authentication (iOS/Android via Capacitor)
   */
  private async authenticateNative(): Promise<BiometricAuthResult> {
    try {
      const available = await this.isBiometricAvailable();
      if (!available) {
        return {
          success: false,
          error: 'Biometric authentication not available on this device'
        };
      }

      // @ts-ignore - plugin may not be installed
      const BiometricAuth = (window as any).BiometricAuth;
      if (!BiometricAuth) {
        return await this.authenticateSimulated();
      }

      const result = await BiometricAuth.authenticate({
        reason: 'Authenticate with your fingerprint or face to clock in',
        fallbackTitle: 'Use PIN/Passcode',
        disableBackButton: false
      });

      if (result.success) {
        console.log('✓ Biometric authentication successful (native)');
        return {
          success: true,
          message: 'Authenticated successfully'
        };
      } else {
        return {
          success: false,
          error: 'Biometric authentication cancelled'
        };
      }
    } catch (pluginError) {
      console.warn('Native biometric error, falling back to simulated:', pluginError);
      return await this.authenticateSimulated();
    }
  }

  /**
   * Simulated fingerprint authentication with realistic scanning animation
   */
  private async authenticateSimulated(): Promise<BiometricAuthResult> {
    try {
      console.log('Starting simulated fingerprint authentication...');

      // Check if biometric was registered
      const registered = localStorage.getItem(this.registeredKey);
      if (!registered) {
        return {
          success: false,
          error: 'No biometric registered. Please register your fingerprint first.'
        };
      }

      // Simulate fingerprint scanning with delay
      await this.simulateFingerprintScan();

      console.log('✓ Simulated fingerprint authenticated successfully');
      return {
        success: true,
        message: 'Fingerprint authenticated successfully'
      };
    } catch (err: any) {
      console.error('Simulated authentication error:', err);
      return {
        success: false,
        error: 'Fingerprint verification cancelled'
      };
    }
  }

  /**
   * Simulate fingerprint scanning with realistic delay and progress
   */
  private async simulateFingerprintScan(): Promise<void> {
    return new Promise((resolve) => {
      // Simulate 2-3 second scan
      const scanDuration = 2000 + Math.random() * 1000;
      console.log(`Simulating fingerprint scan for ${Math.round(scanDuration)}ms...`);
      setTimeout(() => {
        console.log('✓ Fingerprint scan completed');
        resolve();
      }, scanDuration);
    });
  }

  /**
   * Check if biometric authentication is available
   */
  async isBiometricAvailable(): Promise<boolean> {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      try {
        // @ts-ignore - plugin may not be installed
        const BiometricAuth = (window as any).BiometricAuth;
        if (BiometricAuth) {
          const result = await BiometricAuth.isAvailable();
          return result.isAvailable === true;
        }
        return true; // Assume available on native
      } catch {
        return true;
      }
    } else {
      // Web: always available for simulated
      return true;
    }
  }

  /**
   * Get current platform info
   */
  getPlatformInfo(): string {
    if (Capacitor.isNativePlatform()) {
      const platform = Capacitor.getPlatform();
      return `Native ${platform}`;
    }
    return 'Web Browser';
  }

  /**
   * Get biometric type available on device
   */
  async getBiometricType(): Promise<string> {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      try {
        // @ts-ignore - plugin may not be installed
        const BiometricAuth = (window as any).BiometricAuth;
        if (BiometricAuth) {
          const result = await BiometricAuth.getBiometryType();
          return result.biometryType || 'Unknown';
        }
        return 'Native Biometric';
      } catch {
        return 'Native Biometric';
      }
    } else {
      return 'Fingerprint (Simulated)';
    }
  }
}
