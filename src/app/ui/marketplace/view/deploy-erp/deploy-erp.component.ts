import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { interval, Subscription } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { IaasDeploymentService } from '../../service/iaas-deployment.service';

declare var PaystackPop: any;

@Component({
  selector: 'app-deploy-erp',
  templateUrl: './deploy-erp.component.html',
  styleUrls: ['./deploy-erp.component.scss']
})
export class DeployErpComponent implements OnInit, OnDestroy {
  @Output() closed = new EventEmitter<void>();

  step = 1;
  loading = false;

  providers: any[] = [];
  plans: any[] = [];
  filteredPlans: any[] = [];

  readonly deploymentModes = [
    {
      label: 'Managed SaaS',
      sublabel: 'OptimaX hosts and manages your instance',
      value: 'MANAGED_SAAS',
      icon: 'fas fa-cloud'
    },
    {
      label: 'Dedicated Single-Tenant',
      sublabel: 'Your own isolated instance, managed rollout',
      value: 'DEDICATED_SINGLE_TENANT',
      icon: 'fas fa-server'
    },
    {
      label: 'Client-Owned Cloud',
      sublabel: 'We package and deliver to your server',
      value: 'CLIENT_OWNED_CLOUD',
      icon: 'fas fa-building'
    }
  ];

  config = {
    deploymentMode: '' as string,
    providerId: null as number | null,
    planId: null as number | null,
    customerName: '',
    customerEmail: '',
    companyName: '',
    deploymentName: '',
    regionCode: '',
    billingCountryCode: '',
    adminEmail: '',
    domainName: ''
  };

  options: any = null;
  order: any = null;
  provisionResult: any = null;
  smokeChecks: any[] = [];

  private pollSub?: Subscription;

  get selectedMode(): any {
    return this.deploymentModes.find(m => m.value === this.config.deploymentMode);
  }

  get selectedProvider(): any {
    return this.providers.find(p => p.id === this.config.providerId);
  }

  get selectedPlan(): any {
    return this.filteredPlans.find(p => p.id === this.config.planId);
  }

  get canProceedStep1(): boolean {
    return !!(
      this.config.deploymentMode &&
      this.config.providerId &&
      this.config.planId &&
      this.config.customerName.trim() &&
      this.config.customerEmail.trim() &&
      this.config.deploymentName.trim() &&
      this.config.regionCode.trim()
    );
  }

  constructor(
    private iaasService: IaasDeploymentService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.config.customerEmail = sessionStorage.getItem('email') || '';
    this.config.adminEmail = sessionStorage.getItem('email') || '';

    this.iaasService.getProviders().subscribe({
      next: data => { this.providers = (data || []).filter((p: any) => p.active); },
      error: () => {}
    });
    this.iaasService.getPlans().subscribe({
      next: data => { this.plans = (data || []).filter((p: any) => p.active); },
      error: () => {}
    });
  }

  onProviderChange() {
    this.config.planId = null;
    this.filteredPlans = this.plans.filter(
      (p: any) => p.provider?.id === this.config.providerId
    );
  }

  goToStep2() {
    if (!this.canProceedStep1) return;
    this.loading = true;
    this.iaasService.getOptions(
      this.config.providerId!,
      this.config.planId!,
      this.config.deploymentMode,
      this.config.regionCode,
      this.config.billingCountryCode || undefined
    ).subscribe({
      next: data => {
        this.options = data;
        this.step = 2;
        this.loading = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error', summary: 'Error',
          detail: 'Could not load pricing options. Check your selections and try again.',
          key: 'tf', life: 4000
        });
        this.loading = false;
      }
    });
  }

  goToStep3() {
    this.loading = true;
    const dto = {
      deploymentMode: this.config.deploymentMode,
      providerId: this.config.providerId,
      planId: this.config.planId,
      customerName: this.config.customerName,
      customerEmail: this.config.customerEmail,
      companyName: this.config.companyName || undefined,
      deploymentName: this.config.deploymentName,
      regionCode: this.config.regionCode,
      billingCountryCode: this.config.billingCountryCode || undefined,
      adminEmail: this.config.adminEmail || undefined,
      domainName: this.config.domainName || undefined,
      frontendDeploymentTarget: 'VERCEL',
      backendDeploymentTarget: 'DOCKER_HOST',
      selectedPaymentGateway: this.options?.preferredPaymentGateway || 'PAYSTACK'
    };
    this.iaasService.createOrder(dto).subscribe({
      next: orderData => {
        this.order = orderData;
        this.step = 3;
        this.loading = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error', summary: 'Error',
          detail: 'Could not create deployment order.',
          key: 'tf', life: 4000
        });
        this.loading = false;
      }
    });
  }

  launchPaystack() {
    const amount = this.order.totalAmount;
    const ref = this.order.paymentReference || this.order.externalOrderRef;
    const handler = PaystackPop.setup({
      key: 'pk_test_4bb9516e2618286cf962ee0f14e9b043b4e05f16',
      email: this.config.customerEmail,
      amount: Math.round(amount * 100),
      currency: this.order.currency || 'NGN',
      ref,
      callback: (response: any) => {
        if (response.status === 'success') {
          this.loading = true;
          this.iaasService.confirmPayment(this.order.id, response.reference || ref).subscribe({
            next: () => this.startProvisioning(),
            error: () => {
              this.messageService.add({
                severity: 'error', summary: 'Error',
                detail: 'Payment confirmed but provisioning could not start. Contact support with ref: ' + ref,
                key: 'tf', life: 6000
              });
              this.loading = false;
            }
          });
        } else {
          this.messageService.add({
            severity: 'error', summary: 'Payment Failed',
            detail: 'Payment was not completed.',
            key: 'tf', life: 3000
          });
        }
      },
      onClose: () => {
        this.messageService.add({
          severity: 'info', summary: 'Cancelled',
          detail: 'Payment window closed. Your order is saved — you can complete payment later.',
          key: 'tf', life: 5000
        });
      }
    });
    handler.openIframe();
  }

  startProvisioning() {
    this.step = 4;
    this.loading = true;
    this.iaasService.provision(this.order.id).subscribe({
      next: result => {
        this.provisionResult = result;
        this.loading = false;
        this.pollSmokeChecks();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error', summary: 'Provisioning Failed',
          detail: err?.error?.message || 'Deployment could not be started. Our team has been notified.',
          key: 'tf', life: 6000
        });
        this.loading = false;
        this.step = 4;
      }
    });
  }

  pollSmokeChecks() {
    this.pollSub = interval(6000).pipe(
      switchMap(() => this.iaasService.getSmokeChecks(this.order.id)),
      takeWhile(
        (checks: any[]) => checks.length === 0 || checks.some((c: any) => c.passed === null || c.passed === undefined),
        true
      )
    ).subscribe({
      next: checks => { this.smokeChecks = checks; },
      error: () => {}
    });
  }

  close() {
    this.pollSub?.unsubscribe();
    this.closed.emit();
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
  }
}
