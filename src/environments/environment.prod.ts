// Runtime override: the self-hosted installer writes assets/env.js which sets
// window.__env.apiBaseUrl to the local server URL before this module loads.
const _w = (typeof window !== 'undefined' ? window : {}) as any;
const _runtimeApi: string = (_w.__env && _w.__env.apiBaseUrl) ? _w.__env.apiBaseUrl : '';

export const environment = {
  production: true,
  baseUrl: _runtimeApi || 'https://be.optimaxsuites.com',
  apiBaseUrl: _runtimeApi || 'https://be.optimaxsuites.com',
  env: 'production',
  project: 'ERP',
  apiKey: '',
  clientId: 'optimax-erp-web',
  appVersion: '2026.05.30',
  paystackPublicKey: 'pk_live_9452fec9efa78c8d490995df5e5ecfa9adb256d8'
};
