// job-openings.component.ts
import { Component, OnInit } from '@angular/core';
import { RecruitmentService } from '../../../service/recruitment.service';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-job-openings',
  templateUrl: './jop.openings.component.html',
  styleUrl: './jop.openings.component.scss',
  providers: [MessageService]
})
export class JopOpeningsComponent implements OnInit {
  vacancies: any[] = [];
  filteredVacancies: any[] = [];
  selectedJob: any = null;
  showApplyModal = false;
  jobCategories: any[] = [];

  // Active filter state
  private activeCategory = '';
  private activeType     = '';
  private activeLocation = '';

  application: {
    fullName: string;
    email: string;
    phone: string;
    letter: string;
    file: File | null;
    customData: Record<string, any>;
  } = {
    fullName: '',
    email: '',
    phone: '',
    letter: '',
    file: null,
    customData: {} as Record<string, any>,
  };

  constructor(
    private recruitmentService: RecruitmentService,
    private router: Router,
    private messageService: MessageService
  ) {
     const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state && navigation.extras.state['job']) {
      this.selectedJob = navigation.extras.state['job'];
      this.showApplyModal = true;
    }
  }

  ngOnInit(): void {
    this.loadPublishedJobs();


    if (!this.selectedJob && history.state && history.state.job) {
      this.selectedJob = history.state.job;
      this.showApplyModal = true;
    }
    
    this.recruitmentService.getJobCategories().subscribe((res) => {
      this.jobCategories = res;
    });

  }

  loadPublishedJobs(): void {
    this.recruitmentService.getJobVacancies().subscribe((res) => {
      this.vacancies         = res;
      this.filteredVacancies = res;
    });
  }

  // ── Filter handlers ───────────────────────────────────────────────
  onCategoryChange(event: Event): void {
    this.activeCategory = (event.target as HTMLSelectElement).value;
    this.applyFilters();
  }

  onTypeChange(event: Event): void {
    this.activeType = (event.target as HTMLSelectElement).value;
    this.applyFilters();
  }

  onLocationChange(event: Event): void {
    this.activeLocation = (event.target as HTMLSelectElement).value;
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filteredVacancies = this.vacancies.filter((job) => {
      const matchCat = !this.activeCategory
        || String(job.categoryId) === this.activeCategory;

      const matchType = !this.activeType
        || job.jobType?.name?.toLowerCase().includes(this.activeType.toLowerCase());

      const matchLoc = !this.activeLocation
        || job.location?.toLowerCase().includes(this.activeLocation.toLowerCase());

      return matchCat && matchType && matchLoc;
    });
  }

  // ── Modal ─────────────────────────────────────────────────────────
  openApplyModal(job: any): void {
    this.selectedJob  = job;
    this.application  = { fullName: '', email: '', phone: '', letter: '', file: null, customData: {} };
    this.showApplyModal = true;
  }

  async submitApplication(): Promise<void> {
    if (!this.selectedJob?.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Application Failed',
        detail: 'No job opening is currently selected.'
      });
      return;
    }

    if (!this.application.file) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Resume Required',
        detail: 'Please upload your CV or resume before submitting.'
      });
      return;
    }

    const payload = {
      vacancyId: this.selectedJob?.id,
      ...this.application,
    };

    // Uncomment when API is ready:
    // this.recruitmentService.submitApplication(payload).subscribe({
    //   next: () => { alert('Application submitted!'); this.showApplyModal = false; },
    //   error: (err) => console.error(err),
    // });
    try {
      const candidateRecord = await this.buildCandidateApplicationRecord();
      const existingApplications = this.getStoredCandidateApplications();

      localStorage.setItem('candidateData', JSON.stringify([
        ...existingApplications,
        candidateRecord
      ]));

      console.log('Application payload:', payload);
      this.messageService.add({
        severity: 'success',
        summary: 'Application Submitted',
        detail: 'Your application has been added to the candidate pipeline.'
      });
      this.showApplyModal = false;
      this.application = { fullName: '', email: '', phone: '', letter: '', file: null, customData: {} };
    } catch (error) {
      console.error('Error submitting application:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Application Failed',
        detail: 'We could not save your application right now.'
      });
    }
  }

  // Inside your component class

    onCustomFileChange(event: any, label: string) {
      const file = event.target.files[0];
      if (file) {
        this.application.customData[label] = file;
      }
    }

    // Update your main file handler for the default CV as well
    onMainFileChange(event: any) {
      this.application.file = event.target.files[0];
    }

  private async buildCandidateApplicationRecord(): Promise<any> {
    const appliedDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const { firstname, lastname } = this.splitFullName(this.application.fullName);
    const resumeFile = this.application.file instanceof File ? this.application.file : null;
    const documents = [];

    if (resumeFile) {
      documents.push(await this.createDocumentFromFile(resumeFile, 'Resume'));
    }

    const formResponses = [];
    if (this.application.letter.trim()) {
      formResponses.push({ label: 'Cover Letter', value: this.application.letter.trim() });
    }

    const customFieldsResponse = [];
    for (const field of this.selectedJob?.jobVacancyCustomFields || []) {
      const rawValue = this.application.customData[field.label];
      if (rawValue === undefined || rawValue === null || rawValue === '') {
        continue;
      }

      if (rawValue instanceof File) {
        const document = await this.createDocumentFromFile(rawValue, field.label);
        documents.push(document);
        customFieldsResponse.push({
          jobVacancyCustomFields: field,
          value: document.url,
          type: 'File'
        });
        continue;
      }

      formResponses.push({
        label: field.label,
        value: String(rawValue)
      });
      customFieldsResponse.push({
        jobVacancyCustomFields: field,
        value: String(rawValue),
        type: field.type || 'String'
      });
    }

    const resumeDataUrl = resumeFile ? await this.readFileAsDataUrl(resumeFile) : '';

    return {
      id: this.generateId('candidate'),
      firstname,
      lastname,
      fullName: this.application.fullName.trim(),
      candidateName: this.application.fullName.trim(),
      email: this.application.email.trim(),
      phone: this.application.phone.trim(),
      contactNo: this.application.phone.trim(),
      appliedDate,
      dateApplied: appliedDate,
      status: 'New',
      interviewStatus: 'Not Invited',
      coverLetter: this.application.letter.trim(),
      resume: resumeDataUrl,
      formResponses,
      documents,
      aiVetting: null,
      decisionHistory: [{
        date: new Date().toISOString(),
        action: 'Applied',
        details: `Candidate applied for ${this.selectedJob?.jobTitle || 'the role'}.`
      }],
      jobVacancy: {
        ...this.selectedJob,
        customFieldsResponce: customFieldsResponse
      }
    };
  }

  private getStoredCandidateApplications(): any[] {
    const storedData = localStorage.getItem('candidateData');
    if (!storedData) {
      return [];
    }

    try {
      const parsed = JSON.parse(storedData);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private splitFullName(fullName: string): { firstname: string; lastname: string } {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    return {
      firstname: parts[0] || '',
      lastname: parts.slice(1).join(' ') || ''
    };
  }

  private async createDocumentFromFile(file: File, fallbackName: string): Promise<{
    name: string;
    type: string;
    size: string;
    uploadedDate: string;
    url: string;
  }> {
    const dataUrl = await this.readFileAsDataUrl(file);
    return {
      name: file.name || fallbackName,
      type: this.getDocumentType(file),
      size: this.formatFileSize(file.size || 0),
      uploadedDate: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      url: dataUrl
    };
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private getDocumentType(file: File): string {
    const filename = String(file.name || '').toLowerCase();
    if (filename.endsWith('.pdf')) return 'pdf';
    if (filename.endsWith('.docx')) return 'docx';
    if (filename.endsWith('.doc')) return 'doc';
    return file.type || 'file';
  }

  private formatFileSize(bytes: number): string {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    if (bytes >= 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }

    return `${bytes} B`;
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
