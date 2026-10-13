import { Component } from '@angular/core';

export interface BioManufacturer {
  id: string;
  name: string;
  icon: string;
  iconColor: string;
  tagline: string;
  models: string[];
  available: boolean;
  callbackPath?: string;
  setupSteps?: string[];
  capabilities?: { icon: string; iconColor: string; value: string; label: string }[];
  envVar?: string;
}

@Component({
  selector: 'app-biometric-integrations',
  templateUrl: './biometric-integrations.component.html',
  styleUrl: './biometric-integrations.component.scss',
})
export class BiometricIntegrationsComponent {
  readonly baseUrl = 'https://be.optimaxsuites.com/x/api/v2/hr';

  manufacturers: BioManufacturer[] = [
    {
      id: 'hikvision',
      name: 'Hikvision',
      icon: 'fas fa-camera',
      iconColor: '#e11d48',
      tagline: 'DS-K1T321 series — push attendance events via HTTP callback.',
      models: ['DS-K1T321MFWX', 'DS-K1T341BMF', 'DS-K1T671MF'],
      available: true,
      callbackPath: '/hikvision/callback?token=<YOUR_TOKEN>',
      envVar: 'HIKVISION_CALLBACK_TOKEN',
      setupSteps: [
        'Open a browser and navigate to the device IP (e.g. <code>http://192.168.1.100</code>).',
        'Log in with admin credentials (default: <code>admin / 12345</code> — change on first login).',
        'Go to <strong>Configuration → Network → Advanced Settings → Linked Network Application</strong>.',
        'Set <strong>Subscribing Host Address</strong> to the callback URL above (with your token substituted).',
        'Set <strong>Subscribing Host Port</strong> to <code>443</code> (HTTPS).',
        'Enable <strong>HTTPS</strong> and subscribe to <strong>Access Control Events</strong>.',
        'Save and reboot the device.',
        'Register the device in <strong>HR Settings → Biometric Devices</strong> (IP address must match).',
        'Enroll employee fingerprints / faces in <strong>Personnel → Biometric Enrollment</strong>.',
      ],
      capabilities: [
        { icon: 'fas fa-fingerprint', iconColor: '#6366f1', value: '3,000', label: 'Fingerprint templates' },
        { icon: 'fas fa-smile',       iconColor: '#0ea5e9', value: '500',   label: 'Face templates' },
        { icon: 'fas fa-history',     iconColor: '#10b981', value: '150,000', label: 'Event records' },
        { icon: 'fas fa-wifi',        iconColor: '#f59e0b', value: 'WiFi',  label: '+ Ethernet' },
      ],
    },
    {
      id: 'zkteco',
      name: 'ZKTeco',
      icon: 'fas fa-fingerprint',
      iconColor: '#0ea5e9',
      tagline: 'SpeedFace-V5L & BioFace series — PUSH SDK / ZKBioSecurity.',
      models: ['SpeedFace-V5L', 'BioFace 3', 'ZK-K20', 'ProFace X'],
      available: false,
    },
    {
      id: 'suprema',
      name: 'Suprema',
      icon: 'fas fa-id-card',
      iconColor: '#8b5cf6',
      tagline: 'BioStation 3 & FaceStation F2 — BioStar 2 REST API.',
      models: ['BioStation 3', 'FaceStation F2', 'BioEntry W3', 'BioLite N2'],
      available: false,
    },
    {
      id: 'anviz',
      name: 'Anviz',
      icon: 'fas fa-shield-alt',
      iconColor: '#f59e0b',
      tagline: 'W2 Pro & EP30 Pro — CrossChex Cloud webhook integration.',
      models: ['W2 Pro', 'EP30 Pro', 'FaceDeep 5', 'C2 Pro'],
      available: false,
    },
    {
      id: 'fingertec',
      name: 'FingerTec',
      icon: 'fas fa-hand-paper',
      iconColor: '#10b981',
      tagline: 'TA500 & Face ID 5 — TCMS V3 / Ingress SDK.',
      models: ['TA500', 'Face ID 5', 'H3', 'R3'],
      available: false,
    },
    {
      id: 'virdi',
      name: 'Virdi',
      icon: 'fas fa-eye',
      iconColor: '#6366f1',
      tagline: 'AC-7000 Plus & UBio-X Pro 2 — multi-modal access control.',
      models: ['AC-7000 Plus', 'UBio-X Pro 2', 'AC-F100', 'UBio-X Face'],
      available: false,
    },
    {
      id: 'realand',
      name: 'Realand',
      icon: 'fas fa-user-check',
      iconColor: '#64748b',
      tagline: 'M-F261 series — face & fingerprint attendance terminals.',
      models: ['M-F261', 'A-F261', 'ZDC100', 'G4'],
      available: false,
    },
  ];

  selected: BioManufacturer = this.manufacturers[0];
  urlCopied = false;

  get callbackUrl(): string {
    return this.baseUrl + (this.selected.callbackPath ?? '');
  }

  select(m: BioManufacturer): void {
    this.selected = m;
    this.urlCopied = false;
  }

  copyUrl(): void {
    navigator.clipboard.writeText(this.callbackUrl).then(() => {
      this.urlCopied = true;
      setTimeout(() => { this.urlCopied = false; }, 2000);
    }).catch(() => {});
  }
}
