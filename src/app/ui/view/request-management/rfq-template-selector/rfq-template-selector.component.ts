// rfq-template-selector/rfq-template-selector.component.ts

import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { RFQTemplate } from '../../../domain/procurement-request/procurement.dto';
import { ProcurementRequestService } from '../../../service/procurement/procurement.service';

@Component({
  selector: 'app-rfq-template-selector',
  templateUrl: './rfq-template-selector.component.html',
  styleUrls: ['./rfq-template-selector.component.scss']
})
export class RfqTemplateSelectorComponent implements OnInit {
  @Input() requestData: any = {};
  @Output() templateSelected = new EventEmitter<{ templateId: string; config: any }>();
  @Output() back = new EventEmitter<void>();

  templates: RFQTemplate[] = [];
  selectedTemplateId: string | null = null;
  isLoading = false;
  templateForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private procurementService: ProcurementRequestService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.templateForm = this.fb.group({
      templateId: ['', Validators.required],
      includeHeader: [true],
      includeItems: [true],
      includeTerms: [true],
      includeFooter: [true],
      customMessage: ['']
    });
  }

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.isLoading = true;
    this.procurementService.getRFQTemplates().subscribe({
      next: (templates) => {
        this.templates = templates;
        
        const uuid = this.route.snapshot.paramMap.get('uuid');
        if (uuid) {
          this.procurementService.getRequest(uuid).subscribe({
            next: (req) => {
              if (req && req.rfqTemplateId) {
                this.selectedTemplateId = req.rfqTemplateId;
                this.templateForm.patchValue({ 
                  templateId: req.rfqTemplateId,
                  customMessage: req.rfqTitle || ''
                });
              } else {
                this.selectDefaultTemplate(templates);
              }
              this.isLoading = false;
            },
            error: () => {
              this.selectDefaultTemplate(templates);
              this.isLoading = false;
            }
          });
        } else {
          this.selectDefaultTemplate(templates);
          this.isLoading = false;
        }
      },
      error: () => {
        this.loadMockTemplates();
        this.selectDefaultTemplate(this.templates);
        this.isLoading = false;
      }
    });
  }

  private selectDefaultTemplate(templates: RFQTemplate[]): void {
    const defaultTemplate = templates.find(t => t.isDefault);
    if (defaultTemplate) {
      this.selectedTemplateId = defaultTemplate.id;
      this.templateForm.patchValue({ templateId: defaultTemplate.id });
    }
  }

  loadMockTemplates(): void {
    this.templates = [
      {
        id: 't1',
        name: 'Standard RFQ',
        description: 'Balanced and professional layout suitable for most procurements',
        layout: 'STANDARD',
        isDefault: true,
        sections: [],
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 't2',
        name: 'Minimal RFQ',
        description: 'Clean and concise design for quick responses',
        layout: 'MINIMAL',
        isDefault: false,
        sections: [],
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 't3',
        name: 'Detailed RFQ',
        description: 'Comprehensive template with detailed sections',
        layout: 'DETAILED',
        isDefault: false,
        sections: [],
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 't4',
        name: 'Corporate RFQ',
        description: 'Formal design with company branding options',
        layout: 'CORPORATE',
        isDefault: false,
        sections: [],
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  selectTemplate(templateId: string): void {
    this.selectedTemplateId = templateId;
    this.templateForm.patchValue({ templateId });
  }

  getSelectedTemplate(): RFQTemplate | undefined {
    return this.templates.find(t => t.id === this.selectedTemplateId);
  }

  onNext(): void {
    if (this.templateForm.valid) {
      const uuid = this.route.snapshot.paramMap.get('uuid');
      if (uuid) {
        this.procurementService.updateRequest(uuid, {
          rfqTemplateId: this.templateForm.get('templateId')?.value,
          rfqTitle: this.templateForm.get('customMessage')?.value
        }).subscribe(() => {
          const typePath = this.router.url.includes('/service') ? 'service' : 'product';
          this.router.navigate(['/admin/sales/commerce/requests/new', typePath, uuid, 'vendors']);
        });
      }
    }
  }

  onBack(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    const typePath = this.router.url.includes('/service') ? 'service' : 'product';
    if (uuid) {
      this.router.navigate(['/admin/sales/commerce/requests/new', typePath, uuid]);
    } else {
      this.router.navigate(['/admin/sales/commerce/requests/new']);
    }
  }
}