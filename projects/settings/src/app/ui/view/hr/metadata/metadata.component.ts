import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MessageService } from 'primeng/api';
import { DataService } from '../../../service/data.service';

type MetaTab = 'genders' | 'maritalStatuses' | 'religions' | 'departments' | 'jobTypes' | 'relationships';

interface MetaItem {
  id?: number;
  name: string;
  code?: string;
  description?: string;
}

@Component({
  selector: 'app-hr-metadata',
  templateUrl: './metadata.component.html',
  styleUrl: './metadata.component.scss',
  providers: [MessageService]
})
export class MetadataComponent {
  activeTab: MetaTab = 'genders';
  loading = false;
  saving = false;

  genders: MetaItem[] = [];
  maritalStatuses: MetaItem[] = [];
  religions: MetaItem[] = [];
  departments: MetaItem[] = [];
  jobTypes: MetaItem[] = [];
  relationships: MetaItem[] = [];

  metaForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dataService: DataService,
    private messageService: MessageService
  ) {
    this.metaForm = this.fb.group({
      name: ['', Validators.required],
      code: [''],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.loadAll();
  }

  setActiveTab(tab: MetaTab): void {
    this.activeTab = tab;
    this.metaForm.reset();
  }

  get activeItems(): MetaItem[] {
    switch (this.activeTab) {
      case 'maritalStatuses':
        return this.maritalStatuses;
      case 'religions':
        return this.religions;
      case 'departments':
        return this.departments;
      case 'jobTypes':
        return this.jobTypes;
      case 'relationships':
        return this.relationships;
      default:
        return this.genders;
    }
  }

  get activeTitle(): string {
    switch (this.activeTab) {
      case 'maritalStatuses':
        return 'Marital Status';
      case 'religions':
        return 'Religion';
      case 'departments':
        return 'Department';
      case 'jobTypes':
        return 'Job Type';
      case 'relationships':
        return 'Relationship';
      default:
        return 'Gender';
    }
  }

  private loadAll(): void {
    this.loading = true;
    forkJoin({
      genders: this.dataService.getGender(),
      maritalStatuses: this.dataService.getMaritalStatus(),
      religions: this.dataService.getReligion(),
      departments: this.dataService.getDepartment(),
      jobTypes: this.dataService.getJobType(),
      relationships: this.dataService.getRelationship()
    }).subscribe({
      next: (data) => {
        this.genders = Array.isArray(data.genders) ? data.genders : [];
        this.maritalStatuses = Array.isArray(data.maritalStatuses) ? data.maritalStatuses : [];
        this.religions = Array.isArray(data.religions) ? data.religions : [];
        this.departments = Array.isArray(data.departments) ? data.departments : [];
        this.jobTypes = Array.isArray(data.jobTypes) ? data.jobTypes : [];
        this.relationships = Array.isArray(data.relationships) ? data.relationships : [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private loadActive(): void {
    const request =
      this.activeTab === 'maritalStatuses'
        ? this.dataService.getMaritalStatus()
        : this.activeTab === 'religions'
        ? this.dataService.getReligion()
        : this.activeTab === 'departments'
        ? this.dataService.getDepartment()
        : this.activeTab === 'jobTypes'
        ? this.dataService.getJobType()
        : this.activeTab === 'relationships'
        ? this.dataService.getRelationship()
        : this.dataService.getGender();

    request.subscribe({
      next: (data) => {
        const items = Array.isArray(data) ? data : [];
        if (this.activeTab === 'maritalStatuses') {
          this.maritalStatuses = items;
        } else if (this.activeTab === 'religions') {
          this.religions = items;
        } else if (this.activeTab === 'departments') {
          this.departments = items;
        } else if (this.activeTab === 'jobTypes') {
          this.jobTypes = items;
        } else if (this.activeTab === 'relationships') {
          this.relationships = items;
        } else {
          this.genders = items;
        }
      }
    });
  }

  saveMeta(): void {
    this.metaForm.markAllAsTouched();
    if (this.metaForm.invalid || this.saving) return;

    const payload = {
      id: 0,
      name: this.metaForm.get('name')?.value ?? '',
      code: this.metaForm.get('code')?.value ?? '',
      description: this.metaForm.get('description')?.value ?? ''
    };

    this.saving = true;
    const request =
      this.activeTab === 'maritalStatuses'
        ? this.dataService.addMaritalStatus(payload)
        : this.activeTab === 'religions'
        ? this.dataService.addReligion(payload)
        : this.activeTab === 'departments'
        ? this.dataService.addDepartment(payload)
        : this.activeTab === 'jobTypes'
        ? this.dataService.addJobType(payload)
        : this.activeTab === 'relationships'
        ? this.dataService.addRelationship(payload)
        : this.dataService.addGender(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.metaForm.reset();
        this.loadActive();
        this.messageService.add({
          severity: 'success',
          summary: 'Saved',
          detail: `${this.activeTitle} saved successfully`,
          key: 'tl',
          life: 3000
        });
      },
      error: () => {
        this.saving = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Unable to save ${this.activeTitle}`,
          key: 'tl',
          life: 3000
        });
      }
    });
  }
}
