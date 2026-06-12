import { Component, OnInit } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ModulesService } from '../../service/modules.service';

interface AppRegisterEntry {
  id?: number;
  appName: string;
  appCode: string;
  description: string;
  moduleId?: number;
}

interface AppModuleEntry {
  id?: number;
  name: string;
  title: string;
  uid: string;
  shortDescription: string;
  description: string;
  appRegister?: AppRegisterEntry[];
}

const TS_MODULE_CODES: { code: string; label: string; submenus: { code: string; label: string }[] }[] = [
  {
    code: 'optimaXCommerce', label: 'Commerce',
    submenus: [
      // { code: 'AI_ANALYSIS', label: 'AI Analysis' },
      { code: 'COM_SALES', label: 'Sales Hub' },
      { code: 'PROCURE_MGMT', label: 'Procurement Hub' },
      // { code: 'DELIVERY_MGMT', label: 'Delivery Management' },
      // { code: 'DOC_MGMT', label: 'Document Management' },
      // { code: 'QUOTE_MGMT', label: 'Quote Management' },
      { code: 'VENDOR_PORTAL', label: 'Vendor Portal' },
      // { code: 'VENDOR_PORTAL', label: 'Vendor Portal' },
      { code: 'REPORT_ANALYSIS', label: 'Reports & Analytics' },

    ]
  },
  {
    code: 'PURCHASE', label: 'Purchase',
    submenus: []
  },
  {
    code: 'INVENTORY', label: 'Inventory Management',
    submenus: []
  },
  {
    code: 'optimaXProcurement', label: 'Procurement',
    submenus: []
  },
  {
    code: 'optimaXAccounting', label: 'Accounting',
    submenus: [
      { code: 'ACCT_TXN', label: 'Transactions' },
      { code: 'ACCT_GL', label: 'General Ledger' },
      { code: 'ACCT_RECON', label: 'Reconciliation' },
      { code: 'ACCT_REPTS', label: 'Reports' },
    ]
  },
  {
    code: 'HR', label: 'Human Resources',
    submenus: [
      { code: 'HR_EMP_MG', label: 'Employee Management' },
      { code: 'HR_RECRUIT', label: 'Recruitment' },
      { code: 'HR_PROJECT', label: 'Projects' },
      { code: 'HR_PERF', label: 'Performance' },
      { code: 'HR_WORK_SCH', label: 'Work Schedule' },
      { code: 'HR_PAYROLL', label: 'Payroll' },
      { code: 'HR_QUERY', label: 'Payroll Operations' },
      { code: 'HR_ADVANCE', label: 'Loans & Advance' },
      { code: 'HR_ATTEND', label: 'Attendance' },
      { code: 'HR_LEAVE', label: 'Leave' },
      { code: 'HR_ANALYTICS', label: 'HR Analytics' },
      { code: 'HR_OVERTIME', label: 'Overtime' },
      { code: 'HR_ORG_CHART', label: 'Org Chart' },
      { code: 'HR_REPORTS', label: 'HR Reports' },
    ]
  },
  {
    code: 'HR_PRODUCTIVITY', label: 'Work Productivity',
    submenus: []
  },
  {
    code: 'optimaXPOS', label: 'POS',
    submenus: []
  },
];

@Component({
  selector: 'app-module-registry',
  templateUrl: './module-registry.component.html',
  styleUrl: './module-registry.component.scss'
})
export class ModuleRegistryComponent implements OnInit {

  modules: AppModuleEntry[] = [];
  loading = false;

  showModuleForm = false;
  editingModule: AppModuleEntry | null = null;
  moduleForm: AppModuleEntry = this.blankModule();

  showRegisterForm = false;
  activeModuleForRegister: AppModuleEntry | null = null;
  registerForm: AppRegisterEntry = this.blankRegister();

  showRefPanel = false;
  tsCodes = TS_MODULE_CODES;

  constructor(
    private moduleService: ModulesService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadModules();
  }

  loadModules(): void {
    this.loading = true;
    this.moduleService.getModules().subscribe({
      next: (data: any) => {
        this.modules = data || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast('error', 'Failed to load modules');
      }
    });
  }

  openModuleForm(module?: AppModuleEntry): void {
    if (module) {
      this.editingModule = module;
      this.moduleForm = { ...module };
    } else {
      this.editingModule = null;
      this.moduleForm = this.blankModule();
    }
    this.showModuleForm = true;
  }

  saveModule(): void {
    if (!this.moduleForm.name || !this.moduleForm.title || !this.moduleForm.uid) {
      this.toast('warn', 'Name, title and UID (module code) are required');
      return;
    }
    if (this.editingModule?.id) {
      this.moduleService.updateAppModule(this.editingModule.id, this.moduleForm).subscribe({
        next: () => {
          this.toast('success', 'Module updated');
          this.showModuleForm = false;
          this.loadModules();
        },
        error: () => this.toast('error', 'Failed to update module')
      });
    } else {
      this.moduleService.createAppModule(this.moduleForm).subscribe({
        next: () => {
          this.toast('success', 'Module created');
          this.showModuleForm = false;
          this.loadModules();
        },
        error: () => this.toast('error', 'Failed to create module')
      });
    }
  }

  confirmDeleteModule(module: AppModuleEntry, $event: MouseEvent): void {
    $event.stopPropagation();
    this.confirmationService.confirm({
      message: `Delete module <b>${module.title}</b>? All linked AppRegister entries will also be removed.`,
      header: 'Delete Module',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-btn-danger p-button-text',
      rejectButtonStyleClass: 'p-btn-cancle p-button-text',
      acceptIcon: 'none',
      rejectIcon: 'none',
      accept: () => {
        this.moduleService.deleteAppModule(module.id!).subscribe({
          next: () => {
            this.toast('success', 'Module deleted');
            this.loadModules();
          },
          error: () => this.toast('error', 'Failed to delete module')
        });
      }
    });
  }

  openRegisterForm(module: AppModuleEntry): void {
    this.activeModuleForRegister = module;
    this.registerForm = this.blankRegister();
    this.showRegisterForm = true;
  }

  saveRegister(): void {
    if (!this.registerForm.appName || !this.registerForm.appCode) {
      this.toast('warn', 'App name and app code are required');
      return;
    }
    const payload = {
      ...this.registerForm,
      moduleId: this.activeModuleForRegister?.id
    };
    this.moduleService.createAppRegister(payload).subscribe({
      next: () => {
        this.toast('success', 'Submenu registered');
        this.showRegisterForm = false;
        this.loadModules();
      },
      error: () => this.toast('error', 'Failed to register submenu')
    });
  }

  confirmDeleteRegister(reg: AppRegisterEntry, $event: MouseEvent): void {
    $event.stopPropagation();
    this.confirmationService.confirm({
      message: `Remove <b>${reg.appName}</b> from the registry?`,
      header: 'Remove Submenu Register',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Remove',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-btn-danger p-button-text',
      rejectButtonStyleClass: 'p-btn-cancle p-button-text',
      acceptIcon: 'none',
      rejectIcon: 'none',
      accept: () => {
        this.moduleService.deleteAppRegister(reg.id!).subscribe({
          next: () => {
            this.toast('success', 'Register entry removed');
            this.loadModules();
          },
          error: () => this.toast('error', 'Failed to remove entry')
        });
      }
    });
  }

  fillFromTsCode(tsCode: string, type: 'module' | 'register'): void {
    if (type === 'module') {
      const found = TS_MODULE_CODES.find(m => m.code === tsCode);
      if (found) {
        this.moduleForm.uid = found.code;
        this.moduleForm.name = found.label.toLowerCase().replace(/\s+/g, '_');
        this.moduleForm.title = found.label;
      }
    } else {
      const tsEntry = TS_MODULE_CODES
        .flatMap(m => m.submenus)
        .find(s => s.code === tsCode);
      if (tsEntry) {
        this.registerForm.appCode = tsEntry.code;
        this.registerForm.appName = tsEntry.label;
      }
    }
  }

  isRegistered(code: string): boolean {
    return this.modules.some(m =>
      m.uid === code ||
      (m.appRegister || []).some(r => r.appCode === code)
    );
  }

  private blankModule(): AppModuleEntry {
    return { name: '', title: '', uid: '', shortDescription: '', description: '' };
  }

  private blankRegister(): AppRegisterEntry {
    return { appName: '', appCode: '', description: '' };
  }

  private toast(severity: 'success' | 'error' | 'warn', detail: string): void {
    this.messageService.add({ severity, summary: severity === 'success' ? 'Done' : severity === 'warn' ? 'Warning' : 'Error', detail, key: 'tl', life: 3500 });
  }
}
