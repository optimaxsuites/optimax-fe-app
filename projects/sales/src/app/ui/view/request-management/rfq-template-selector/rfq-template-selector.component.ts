// rfq-template-selector/rfq-template-selector.component.ts

import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { RFQTemplate } from '../../../domain/procurement-request/procurement.dto';
import { ExtendedProcurementRequest, parseIdToNumber } from '../../../service/procurement/rfq-quotation-bridge.util';
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
          this.procurementService.getRequest(parseIdToNumber(uuid)).subscribe({
            next: (req) => {
              const extendedReq = req as ExtendedProcurementRequest;
              if (extendedReq && extendedReq.rfqTemplateId) {
                this.selectedTemplateId = extendedReq.rfqTemplateId;
                this.templateForm.patchValue({ 
                  templateId: extendedReq.rfqTemplateId,
                  customMessage: extendedReq.rfqTitle || ''
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
      error: (err) => {
        console.error('Error loading RFQ templates:', err);
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
        this.procurementService.updateRequest(parseIdToNumber(uuid), {
          rfqTemplateId: this.templateForm.get('templateId')?.value,
          rfqTitle: this.templateForm.get('customMessage')?.value
        } as any).subscribe(() => {
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