import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

export interface FilterOptions {
  reportType: 'Actual' | 'Budget' | 'Actual vs Budget' | 'Actual vs Previous Year';
  entity: string;
  period: string;
  customStartDate?: string;
  customEndDate?: string;
  showPercentages: boolean;
  showVariance: boolean;
  includeForecasts: boolean;
}

@Component({
  selector: 'app-income-statement-filter',
  templateUrl: './income-statement-filter.component.html',
  styleUrls: ['./income-statement-filter.component.scss']
})
export class IncomeStatementFilterComponent implements OnInit {

  // ── Inputs ──────────────────────────────────────────────────────────────────
  @Input() initialFilters!: FilterOptions;

  // ── Outputs ─────────────────────────────────────────────────────────────────
  @Output() filtersApplied = new EventEmitter<FilterOptions>();

  // ── State ───────────────────────────────────────────────────────────────────
  showFilterModal = false;
  filterForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.filterForm = this.fb.group({
      reportType: [this.initialFilters?.reportType ?? 'Actual'],
      entity: [this.initialFilters?.entity ?? 'All Locations'],
      period: [this.initialFilters?.period ?? 'This Month'],
      customStartDate: [this.initialFilters?.customStartDate ?? ''],
      customEndDate: [this.initialFilters?.customEndDate ?? ''],
      showPercentages: [this.initialFilters?.showPercentages ?? false],
      showVariance: [this.initialFilters?.showVariance ?? false],
      includeForecasts: [this.initialFilters?.includeForecasts ?? false]
    });
  }

  openFilterModal(): void {
    this.showFilterModal = true;
  }

  closeFilterModal(): void {
    this.showFilterModal = false;
  }

  applyFilters(): void {
    const filters: FilterOptions = { ...this.filterForm.value };
    this.filtersApplied.emit(filters);
    this.closeFilterModal();
  }

  resetFilters(): void {
    this.filterForm.reset({
      reportType: 'Actual',
      entity: 'All Locations',
      period: 'This Month',
      customStartDate: '',
      customEndDate: '',
      showPercentages: false,
      showVariance: false,
      includeForecasts: false,
    });
  }
}
