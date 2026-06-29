import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

interface Terminology {
  contacts: string;
  accounts: string;
  leads: string;
  pipeline: string;
}

@Component({
  selector: 'app-crm-settings',
  templateUrl: './crm-settings.component.html',
  styleUrl: './crm-settings.component.scss',
})
export class CrmSettingsComponent implements OnInit {
  searchTerm = '';
  activePanel: string | null = null;

  orgTypes = [
    { value: 'sme',         label: 'Small & Medium Business',   icon: 'fas fa-store' },
    { value: 'enterprise',  label: 'Enterprise / Corporate',     icon: 'fas fa-building' },
    { value: 'ngo',         label: 'NGO / Non-Profit',           icon: 'fas fa-hands-helping' },
    { value: 'religious',   label: 'Religious Organisation',      icon: 'fas fa-place-of-worship' },
    { value: 'church',      label: 'Church / Ministry',          icon: 'fas fa-church' },
    { value: 'educational', label: 'Educational Institution',    icon: 'fas fa-graduation-cap' },
    { value: 'government',  label: 'Government / Public Sector', icon: 'fas fa-landmark' },
    { value: 'healthcare',  label: 'Healthcare / Hospital',      icon: 'fas fa-hospital' },
    { value: 'hospitality', label: 'Hospitality / Tourism',      icon: 'fas fa-concierge-bell' },
    { value: 'realestate',  label: 'Real Estate',                icon: 'fas fa-home' },
  ];

  selectedOrgType = 'sme';

  terminology: Terminology = { contacts: 'Customers', accounts: 'Companies', leads: 'Prospects', pipeline: 'Sales Pipeline' };

  terminologyMap: Record<string, Terminology> = {
    sme:         { contacts: 'Customers',      accounts: 'Companies',     leads: 'Prospects',           pipeline: 'Sales Pipeline' },
    enterprise:  { contacts: 'Contacts',       accounts: 'Accounts',      leads: 'Leads',               pipeline: 'Deal Pipeline' },
    ngo:         { contacts: 'Beneficiaries',  accounts: 'Partners',      leads: 'Potential Donors',    pipeline: 'Donor Pipeline' },
    religious:   { contacts: 'Members',        accounts: 'Ministries',    leads: 'First-time Visitors', pipeline: 'Discipleship Journey' },
    church:      { contacts: 'Members',        accounts: 'Ministries',    leads: 'First-time Visitors', pipeline: 'Discipleship Journey' },
    educational: { contacts: 'Students',       accounts: 'Institutions',  leads: 'Applicants',          pipeline: 'Enrollment Pipeline' },
    government:  { contacts: 'Citizens',       accounts: 'Agencies',      leads: 'Applications',        pipeline: 'Case Pipeline' },
    healthcare:  { contacts: 'Patients',       accounts: 'Clinics',       leads: 'Referrals',           pipeline: 'Patient Pipeline' },
    hospitality: { contacts: 'Guests',         accounts: 'Properties',    leads: 'Enquiries',           pipeline: 'Booking Pipeline' },
    realestate:  { contacts: 'Clients',        accounts: 'Properties',    leads: 'Prospects',           pipeline: 'Listing Pipeline' },
  };

  settings = [
    { name: 'Organisation Profile',  key: 'org-profile',  icon: 'fas fa-building',        subSetting: ['Business type', 'CRM terminology', 'Industry vertical', 'Organisation name & logo'] },
    { name: 'Pipeline Stages',       key: 'pipeline',     icon: 'fas fa-funnel-dollar',    subSetting: ['Stage names', 'Win / loss probability', 'Deal categories', 'Forecasting'] },
    { name: 'Contact Fields',        key: 'contact-fields', icon: 'fas fa-address-card',  subSetting: ['Custom field types', 'Required fields', 'Field visibility by role'] },
    { name: 'Lead Sources',          key: 'lead-sources', icon: 'fas fa-crosshairs',       subSetting: ['Default sources', 'UTM tracking', 'Referral codes', 'Lead scoring weights'] },
    { name: 'Email Templates',       key: 'email-tpl',    icon: 'fas fa-envelope-open-text', subSetting: ['Follow-up templates', 'Proposal emails', 'Onboarding sequences'] },
    { name: 'Notification Rules',    key: 'notifications', icon: 'fas fa-bell',            subSetting: ['Deal won / lost alerts', 'Lead assignment notifications', 'SLA breach alerts'] },
    { name: 'Automation Rules',      key: 'automation',   icon: 'fas fa-bolt',             subSetting: ['Lead auto-assignment', 'Stage progression triggers', 'Escalation rules'] },
    { name: 'Integration Settings',  key: 'integrations', icon: 'fas fa-plug',             subSetting: ['Email sync', 'WhatsApp Business', 'Social media', 'Calendar sync'] },
    { name: 'User Roles & Access',   key: 'roles',        icon: 'fas fa-user-shield',      subSetting: ['CRM-specific permissions', 'Data visibility scope', 'Pipeline access levels'] },
    { name: 'Data Import / Export',  key: 'import-export', icon: 'fas fa-file-import',     subSetting: ['Import from CSV / Excel', 'Export contacts & deals', 'Duplicate handling'] },
    { name: 'Custom Tags & Labels',  key: 'tags',         icon: 'fas fa-tags',             subSetting: ['Contact tags', 'Deal labels', 'Lead categories'] },
    { name: 'SLA & Response Times',  key: 'sla',          icon: 'fas fa-stopwatch',        subSetting: ['First-response SLA', 'Resolution SLA', 'Escalation thresholds'] },
  ];

  filteredSettings = [...this.settings];

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.filteredSettings = [...this.settings];
    this.route.queryParams.subscribe(params => {
      if (params['panel']) {
        this.activePanel = params['panel'];
      }
    });
  }

  filterSettings(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredSettings = this.settings.filter(s =>
      s.name.toLowerCase().includes(term) ||
      s.subSetting.some(sub => sub.toLowerCase().includes(term))
    );
  }

  selectOrgType(value: string): void {
    this.selectedOrgType = value;
    this.terminology = this.terminologyMap[value] ?? this.terminologyMap['sme'];
  }

  openPanel(key: string): void {
    this.activePanel = this.activePanel === key ? null : key;
  }
}
