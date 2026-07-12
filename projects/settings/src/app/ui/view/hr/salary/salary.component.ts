
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { LevelService } from '../../../service/level.service';
import { SalaryService } from '../../../service/salary.service';
import { AllowanceTypeDTO, BonusTypeDTO, DeductionsTypeDTO, OvertimeTypeDTO } from '../../../domain/salary.dto';
import { LevelDTO } from '../../../domain/level.dto';

@Component({
  selector: 'app-salary',
  templateUrl: './salary.component.html',
  styleUrl: './salary.component.scss',
  providers: [MessageService, ConfirmationService],
})
export class SalaryComponent implements OnInit {
  showAddForm = false;
  isEditMode = false;
  editSalaryId: number | null = null;

  salaryStructure: any[] = [];
  salaryForm: FormGroup;
  allowanceForm: FormGroup;
  bonusForm: FormGroup;
  deductionForm: FormGroup;
  overtimeForm: FormGroup;
  newTypeForm: FormGroup;

  levels: LevelDTO[] = [];
  allowanceType: AllowanceTypeDTO[] = [];
  deductionType: DeductionsTypeDTO[] = [];
  bonusType: BonusTypeDTO[] = [];
  overtimeType: OvertimeTypeDTO[] = [];

  allowances: any[] = [];
  deductions: any[] = [];
  bonuses: any[] = [];
  overtimes: any[] = [];

  openTypeForm = false;
  typeFormContext = '';
  loading = false;
  saving = false;

  showAllowanceAdd = false;
  showDeductionAdd = false;
  showBonusAdd = false;
  showOvertimeAdd = false;

  editingAllowanceIndex: number | null = null;
  editAllowanceAmount = new FormControl<number | null>(null, [Validators.required, Validators.min(0)]);

  constructor(
    private fb: FormBuilder,
    private confirmationService: ConfirmationService,
    private salaryService: SalaryService,
    private levelService: LevelService,
    private messageService: MessageService
  ) {
    this.salaryForm = this.fb.group({
      level: [null, Validators.required],
      baseSalary: ['', [Validators.required, Validators.min(0)]],
    });
    this.allowanceForm = this.fb.group({
      type: [null, Validators.required],
      amount: [null, [Validators.required, Validators.min(1)]],
    });
    this.deductionForm = this.fb.group({
      type: [null, Validators.required],
      amount: [null, [Validators.required, Validators.min(1)]],
    });
    this.bonusForm = this.fb.group({
      type: [null, Validators.required],
      amount: [null, [Validators.required, Validators.min(1)]],
    });
    this.overtimeForm = this.fb.group({
      type: [null, Validators.required],
      rate: [null, [Validators.required, Validators.min(1)]],
      maxHours: [null, [Validators.required, Validators.min(1)]],
    });
    this.newTypeForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      code: [''],
      isTax: [false],
    });
  }

  ngOnInit() {
    this.loading = true;
    this.levelService.getAllLevels().subscribe(data => { this.levels = data; });
    this.salaryService.getAllSalaries().subscribe(data => {
      this.salaryStructure = data;
      this.loading = false;
    });
    this.salaryService.getAllAllowanceTypes().subscribe(data => {
      this.allowanceType = data.sort((a: any, b: any) => a.name.localeCompare(b.name));
    });
    this.salaryService.getAllDeductionsTypes().subscribe(data => {
      this.deductionType = data.sort((a: any, b: any) => a.name.localeCompare(b.name));
    });
    this.salaryService.getAllBonusTypes().subscribe(data => {
      this.bonusType = data.sort((a: any, b: any) => a.name.localeCompare(b.name));
    });
    this.salaryService.getAllOverTimeTypes().subscribe(data => {
      this.overtimeType = data.sort((a: any, b: any) => a.name.localeCompare(b.name));
    });
  }

  // --- Computed available types (excludes already-added items) ---
  get availableAllowanceTypes(): AllowanceTypeDTO[] {
    const usedIds = new Set(this.allowances.map(a => a.allowanceTypeId));
    return this.allowanceType.filter(t => !usedIds.has(t.id));
  }

  get availableDeductionTypes(): DeductionsTypeDTO[] {
    const usedIds = new Set(this.deductions.map(d => d.deductionsTypeId));
    return this.deductionType.filter(t => !usedIds.has(t.id));
  }

  get availableBonusTypes(): BonusTypeDTO[] {
    const usedIds = new Set(this.bonuses.map(b => b.bonusTypeId));
    return this.bonusType.filter(t => !usedIds.has(t.id));
  }

  get availableOvertimeTypes(): OvertimeTypeDTO[] {
    const usedIds = new Set(this.overtimes.map(o => o.overtimeTypeId));
    return this.overtimeType.filter(t => !usedIds.has(t.id));
  }

  // --- Name lookups ---
  getAllowanceName(id: number): string {
    return this.allowanceType.find(t => t.id === id)?.name ?? 'Unknown';
  }
  getDeductionName(id: number): string {
    return this.deductionType.find(t => t.id === id)?.name ?? 'Unknown';
  }
  getBonusName(id: number): string {
    return this.bonusType.find(t => t.id === id)?.name ?? 'Unknown';
  }
  getOvertimeName(id: number): string {
    return this.overtimeType.find(t => t.id === id)?.name ?? 'Unknown';
  }
  getLevelName(levelId: number): string {
    const level = this.levels.find(l => l.id === levelId);
    return level?.position || level?.name || '';
  }
  getSalaryByLevelId(levelId: number | undefined): any {
    return this.salaryStructure.find(s => s.levelId === levelId);
  }

  // --- Allowance CRUD ---
  addAllowance() {
    if (this.allowanceForm.invalid) {
      this.allowanceForm.markAllAsTouched();
      return;
    }
    const { type, amount } = this.allowanceForm.value;
    const payload = { levelId: this.salaryForm.value.level, allowanceTypeId: type, amount };

    if (this.isEditMode) {
      this.salaryService.addAllowance(payload).subscribe({
        next: (data) => {
          this.allowances = [...this.allowances, data];
          this.allowanceForm.reset();
          this.showAllowanceAdd = false;
          this.toast('success', 'Allowance added.');
        },
        error: () => this.toast('error', 'Failed to add allowance.'),
      });
    } else {
      this.allowances = [...this.allowances, { ...payload, id: null }];
      this.allowanceForm.reset();
      this.showAllowanceAdd = false;
    }
  }

  removeAllowance(index: number, id: number) {
    if (this.isEditMode && id) {
      this.salaryService.deleteAllowance(id).subscribe({
        next: () => {
          this.allowances = this.allowances.filter((_, i) => i !== index);
          this.toast('success', 'Allowance removed.');
        },
        error: () => this.toast('error', 'Failed to remove allowance.'),
      });
    } else {
      this.allowances = this.allowances.filter((_, i) => i !== index);
    }
  }

  startEditAllowance(index: number, item: any) {
    this.editingAllowanceIndex = index;
    this.editAllowanceAmount.setValue(item.amount);
    this.showAllowanceAdd = false;
  }

  cancelEditAllowance() {
    this.editingAllowanceIndex = null;
    this.editAllowanceAmount.reset();
  }

  saveEditAllowance(index: number, item: any) {
    if (this.editAllowanceAmount.invalid) {
      this.editAllowanceAmount.markAsTouched();
      return;
    }
    const newAmount = this.editAllowanceAmount.value!;
    const payload = { id: item.id, levelId: this.salaryForm.value.level, allowanceTypeId: item.allowanceTypeId, amount: newAmount };

    if (this.isEditMode && item.id) {
      this.salaryService.updateAllowance(item.id, payload).subscribe({
        next: () => {
          this.allowances = this.allowances.map((a, i) => i === index ? { ...a, amount: newAmount } : a);
          this.cancelEditAllowance();
          this.toast('success', 'Allowance updated.');
        },
        error: () => this.toast('error', 'Failed to update allowance.'),
      });
    } else {
      this.allowances = this.allowances.map((a, i) => i === index ? { ...a, amount: newAmount } : a);
      this.cancelEditAllowance();
    }
  }

  // --- Deduction CRUD ---
  addDeduction() {
    if (this.deductionForm.invalid) {
      this.deductionForm.markAllAsTouched();
      return;
    }
    const { type, amount } = this.deductionForm.value;
    const payload = { levelId: this.salaryForm.value.level, deductionsTypeId: type, amount };

    if (this.isEditMode) {
      this.salaryService.addDeductions(payload).subscribe({
        next: (data) => {
          this.deductions = [...this.deductions, data];
          this.deductionForm.reset();
          this.showDeductionAdd = false;
          this.toast('success', 'Deduction added.');
        },
        error: () => this.toast('error', 'Failed to add deduction.'),
      });
    } else {
      this.deductions = [...this.deductions, { ...payload, id: null }];
      this.deductionForm.reset();
      this.showDeductionAdd = false;
    }
  }

  removeDeduction(index: number, id: number) {
    if (this.isEditMode && id) {
      this.salaryService.deleteDeduction(id).subscribe({
        next: () => {
          this.deductions = this.deductions.filter((_, i) => i !== index);
          this.toast('success', 'Deduction removed.');
        },
        error: () => this.toast('error', 'Failed to remove deduction.'),
      });
    } else {
      this.deductions = this.deductions.filter((_, i) => i !== index);
    }
  }

  // --- Bonus CRUD ---
  addBonus() {
    if (this.bonusForm.invalid) {
      this.bonusForm.markAllAsTouched();
      return;
    }
    const { type, amount } = this.bonusForm.value;
    const payload = { levelId: this.salaryForm.value.level, bonusTypeId: type, amount };

    if (this.isEditMode) {
      this.salaryService.addBonus(payload).subscribe({
        next: (data) => {
          this.bonuses = [...this.bonuses, data];
          this.bonusForm.reset();
          this.showBonusAdd = false;
          this.toast('success', 'Bonus added.');
        },
        error: () => this.toast('error', 'Failed to add bonus.'),
      });
    } else {
      this.bonuses = [...this.bonuses, { ...payload, id: null }];
      this.bonusForm.reset();
      this.showBonusAdd = false;
    }
  }

  removeBonus(index: number, id: number) {
    if (this.isEditMode && id) {
      this.salaryService.deleteBonus(id).subscribe({
        next: () => {
          this.bonuses = this.bonuses.filter((_, i) => i !== index);
          this.toast('success', 'Bonus removed.');
        },
        error: () => this.toast('error', 'Failed to remove bonus.'),
      });
    } else {
      this.bonuses = this.bonuses.filter((_, i) => i !== index);
    }
  }

  // --- Overtime CRUD ---
  addOvertime() {
    if (this.overtimeForm.invalid) {
      this.overtimeForm.markAllAsTouched();
      return;
    }
    const { type, rate, maxHours } = this.overtimeForm.value;
    const payload = { levelId: this.salaryForm.value.level, overtimeTypeId: type, rate, maxHours };

    if (this.isEditMode) {
      this.salaryService.addOverTime(payload).subscribe({
        next: (data) => {
          this.overtimes = [...this.overtimes, data];
          this.overtimeForm.reset();
          this.showOvertimeAdd = false;
          this.toast('success', 'Overtime added.');
        },
        error: () => this.toast('error', 'Failed to add overtime.'),
      });
    } else {
      this.overtimes = [...this.overtimes, { ...payload, id: null }];
      this.overtimeForm.reset();
      this.showOvertimeAdd = false;
    }
  }

  removeOvertime(index: number, id: number) {
    if (this.isEditMode && id) {
      this.salaryService.deleteOvertime(id).subscribe({
        next: () => {
          this.overtimes = this.overtimes.filter((_, i) => i !== index);
          this.toast('success', 'Overtime removed.');
        },
        error: () => this.toast('error', 'Failed to remove overtime.'),
      });
    } else {
      this.overtimes = this.overtimes.filter((_, i) => i !== index);
    }
  }

  // --- Form submit ---
  onSubmit() {
    if (this.salaryForm.invalid) {
      this.salaryForm.markAllAsTouched();
      return;
    }
    const { level, baseSalary } = this.salaryForm.value;
    const payload: any = {
      levelId: level,
      baseSalary,
      allowance: this.allowances,
      deductions: this.deductions,
      bonus: this.bonuses,
      overtime: this.overtimes,
    };
    this.saving = true;

    if (this.isEditMode && this.editSalaryId !== null) {
      this.salaryService.updateSalary(this.editSalaryId, { id: this.editSalaryId, ...payload }).subscribe({
        next: () => {
          this.toast('success', `Salary for ${this.getLevelName(level)} updated.`);
          this.saving = false;
          this.closeForm();
          this.refreshSalaries();
        },
        error: () => {
          this.toast('error', 'Failed to update salary structure.');
          this.saving = false;
        },
      });
    } else {
      this.salaryService.addSalary(payload).subscribe({
        next: () => {
          this.toast('success', `Salary for ${this.getLevelName(level)} created.`);
          this.saving = false;
          this.closeForm();
          this.refreshSalaries();
        },
        error: () => {
          this.toast('error', 'Failed to create salary structure.');
          this.saving = false;
        },
      });
    }
  }

  // --- Form navigation ---
  openForCreate(levelId: number) {
    this.isEditMode = false;
    this.editSalaryId = null;
    this.clearArrays();
    this.clearSubForms();
    this.salaryForm.reset();
    this.salaryForm.patchValue({ level: levelId });
    this.resetAddToggles();
    this.showAddForm = true;
  }

  openForEdit(salary: any, event: Event) {
    event.stopPropagation();
    this.isEditMode = true;
    this.editSalaryId = salary.id;
    this.salaryForm.patchValue({ level: salary.levelId, baseSalary: salary.baseSalary });
    this.allowances = [...(salary.allowance ?? [])];
    this.deductions = [...(salary.deductions ?? [])];
    this.bonuses = [...(salary.bonus ?? [])];
    this.overtimes = [...(salary.overtime ?? [])];
    this.clearSubForms();
    this.resetAddToggles();
    this.showAddForm = true;
  }

  closeForm() {
    this.showAddForm = false;
    this.isEditMode = false;
    this.editSalaryId = null;
    this.salaryForm.reset();
    this.clearArrays();
    this.clearSubForms();
    this.resetAddToggles();
  }

  private refreshSalaries() {
    this.salaryService.getAllSalaries().subscribe(data => {
      this.salaryStructure = data;
    });
  }

  private clearArrays() {
    this.allowances = [];
    this.deductions = [];
    this.bonuses = [];
    this.overtimes = [];
    this.cancelEditAllowance();
  }

  private clearSubForms() {
    this.allowanceForm.reset();
    this.deductionForm.reset();
    this.bonusForm.reset();
    this.overtimeForm.reset();
  }

  private resetAddToggles() {
    this.showAllowanceAdd = false;
    this.showDeductionAdd = false;
    this.showBonusAdd = false;
    this.showOvertimeAdd = false;
  }

  // --- Delete salary ---
  confirmDelete(levelId: number | undefined, event: Event) {
    event.stopPropagation();
    const salary = this.getSalaryByLevelId(levelId);
    if (!salary) return;
    this.confirmationService.confirm({
      message: `This will permanently remove the salary structure for ${this.getLevelName(salary.levelId)}.`,
      header: `Delete Salary — ${this.getLevelName(salary.levelId)}`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-btn-danger p-button-text',
      rejectButtonStyleClass: 'p-btn-cancel p-button-text',
      acceptIcon: 'none',
      rejectIcon: 'none',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: () => {
        this.salaryService.deleteSalry(salary.id).subscribe({
          next: () => {
            this.salaryStructure = this.salaryStructure.filter(s => s.id !== salary.id);
            this.toast('success', `Salary for ${this.getLevelName(salary.levelId)} removed.`);
          },
          error: () => this.toast('error', 'Failed to delete salary structure.'),
        });
      },
    });
  }

  // --- New type forms ---
  openNewTypeForm(type: string) {
    this.typeFormContext = type;
    this.openTypeForm = !!type;
    this.newTypeForm.reset();
  }

  addNewType(event: Event) {
    event.preventDefault();
    if (this.newTypeForm.invalid) return;
    const { name, code, description, isTax } = this.newTypeForm.value;

    switch (this.typeFormContext) {
      case 'allowance':
        this.salaryService.addAllowanceType({ name, code, description } as any).subscribe(data => {
          this.allowanceType = [...this.allowanceType, data].sort((a: any, b: any) => a.name.localeCompare(b.name));
          this.toast('success', 'Allowance type created.');
          this.openNewTypeForm('');
        });
        break;
      case 'deduction':
        this.salaryService.addDeductionsType({ name, description, isTax } as any).subscribe(data => {
          this.deductionType = [...this.deductionType, data].sort((a: any, b: any) => a.name.localeCompare(b.name));
          this.toast('success', 'Deduction type created.');
          this.openNewTypeForm('');
        });
        break;
      case 'bonus':
        this.salaryService.addBonusType({ name, description } as any).subscribe(data => {
          this.bonusType = [...this.bonusType, data].sort((a: any, b: any) => a.name.localeCompare(b.name));
          this.toast('success', 'Bonus type created.');
          this.openNewTypeForm('');
        });
        break;
      case 'overtime':
        this.salaryService.addOverTimeType({ name, description } as any).subscribe(data => {
          this.overtimeType = [...this.overtimeType, data].sort((a: any, b: any) => a.name.localeCompare(b.name));
          this.toast('success', 'Overtime type created.');
          this.openNewTypeForm('');
        });
        break;
    }
  }

  private toast(severity: 'success' | 'error', detail: string) {
    this.messageService.add({ severity, summary: severity === 'success' ? 'Success' : 'Error', detail, key: 'tl', life: 3000 });
  }
}
