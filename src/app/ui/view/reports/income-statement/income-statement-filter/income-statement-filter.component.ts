// income-statement-filter.component.ts
import { Component, EventEmitter, Input, output, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

interface FilterOptions {
  reportType: 'Actual' | 'Budget' | 'Actual vs Budget' | 'Actual vs Previous Year';
  entity: string;
  period: string;
  showPercentages: boolean;
  showVariance: boolean;
  includeForecasts: boolean;
}

@Component({
  selector: 'app-income-statement-filter',
  templateUrl: './income-statement-filter.component.html',
  styleUrls: ['./income-statement-filter.component.scss']
})
export class IncomeStatementFilterComponent {
  @Input() initialFilters!: FilterOptions;
  @Output() filtersApplied = new EventEmitter<FilterOptions>();
  @Output() commetModal = new EventEmitter<void>();
    @Input() showCommentsModal = false;
  @Input() showArchivesModal = false;
  @Input() comments: Comment[] = [];
  @Input() isSaved = false;
  @Input() activeFilters: any;
  @Input() totalRevenue: number = 0;
  @Input() netIncome: number = 0;
  @Input() getFormattedDate!: () => string;
  
  @Output() toggleCommentsModal = new EventEmitter<void>();
  @Output() toggleArchivesModal = new EventEmitter<void>();
  @Output() addComment = new EventEmitter<string>();

  showFilterModal = false;
  filterForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.filterForm = this.fb.group({
      reportType: [this.initialFilters.reportType],
      entity: [this.initialFilters.entity],
      period: [this.initialFilters.period],
      showPercentages: [this.initialFilters.showPercentages],
      showVariance: [this.initialFilters.showVariance],
      includeForecasts: [this.initialFilters.includeForecasts]
    });
  }

  openFilterModal(): void {
    this.showFilterModal = true;
  }

  closeFilterModal(): void {
    this.showFilterModal = false;
  }

  applyFilters(): void {
    const filters: FilterOptions = {
      reportType: this.filterForm.value.reportType,
      entity: this.filterForm.value.entity,
      period: this.filterForm.value.period,
      showPercentages: this.filterForm.value.showPercentages,
      showVariance: this.filterForm.value.showVariance,
      includeForecasts: this.filterForm.value.includeForecasts
    };
    this.filtersApplied.emit(filters);
    this.closeFilterModal();
  }

  resetFilters(): void {
    this.filterForm.reset(this.initialFilters);
  }
}