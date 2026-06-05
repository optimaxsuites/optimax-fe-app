import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { MenuItem } from 'src/app/ui/shared/domain/menuItem.dto';
// import { MenuItemsService } from 'src/app/ui/shared/service/menue-items/menu-items.service';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';
import { MarketplaceService } from '../../service/marketplace.service'
import { MenuItemsService } from 'projects/settings/src/app/ui/sharedComponents/service/menue-items/menu-items.service';
import { BehaviorSubject, catchError, forkJoin, map } from 'rxjs';
import { SubscriptionService } from '../../service/subscription.service';
import { AppRegisterServiceService } from 'projects/settings/src/app/ui/sharedComponents/service/app-register-service.service';
import { ChangeDetectorRef } from '@angular/core';
@Component({
  selector: 'app-marketplace',
  templateUrl: './marketplace.component.html',
  styleUrl: './marketplace.component.scss'
})
export class MarketplaceComponent {
  role: string|null = ''
  modules: any[] = [];
  visible: boolean = false;
  module: any = {}
  code: string = ''
  key: string = ''
  loading: boolean = false
  selectedPlan: any = {}
  openHistory: boolean = false
  history: any[] = []
  appList  = []
  showDetails: boolean = false;
  openAddModule: boolean = false
  openConfirmDialog: boolean = false
  deletingModule: boolean = false
  editingModule: any = null;
  // selectedModuleDetails: any = null
  selectedModuleDetails$ = new BehaviorSubject<any>(null);
  String = String
  Number = Number
  showAdminUI: boolean = false
  searchTerm: string = ''
  activeFilter: 'all' | 'installed' | 'available' | 'coming-soon' = 'all'

  get filteredModules(): any[] {
    const q = this.searchTerm.toLowerCase();
    return this.modules.filter(m => {
      const matchesSearch = !q || m.name?.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (this.activeFilter === 'installed') return !m.locked && m.status === 'ACTIVE';
      if (this.activeFilter === 'available') return m.locked && m.status === 'ACTIVE';
      if (this.activeFilter === 'coming-soon') return m.status === 'INACTIVE';
      return true;
    });
  }

  constructor(
    private menuService: MenuItemsService,
    private messageService: MessageService,
    private navigationLink: NavigationLinksService,
    private marketplaceService: MarketplaceService,
    private router: Router,
    private subscriptionService: SubscriptionService,
    private appRegisterService: AppRegisterServiceService,
    private cdr: ChangeDetectorRef
  ) {}

   ngOnInit(): void {
      this.role = sessionStorage.getItem('role');
      if (!this.role) return;

      // show global loading until both endpoints return

     this.loadModules()

    const hostname = window.location.hostname; 
    
    const subdomain = hostname.split('.')[0]; 

    this.showAdminUI = subdomain === 'optimax' || subdomain === 'localhost';
  }
   
    showDialog(module: any ) {
      this.visible = true;
      this.module = module;
   }

   loadModules() {

      this.loading = true;

     forkJoin({
        apps: this.marketplaceService.getApps(),
        registered: this.appRegisterService.getRegisteredApp()
      }).subscribe({
        next: ({ apps, registered }) => {
          // initial locked state then mark unlocked based on registered apps
          this.modules = (apps || []).map((module: any) => ({
            ...module,
            locked: true
          }));

          this.appList = registered || [];
          this.markModulesWithLockStatus();

          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error loading marketplace data', err);
          this.loading = false;
          this.cdr.markForCheck();
        }
      });

      this.subscriptionService.getOrderRecord().subscribe({
        next: (data) => {
          this.history = data
        },
        error(err) {
          console.error(err)
        },
      })
   }

 openModuledetails(module: any) {
  this.showDetails = true;
  this.selectedModuleDetails$.next(module);
  this.enrichModuleWithPlanLimits(module);
}

enrichModuleWithPlanLimits(module: any) {
  if (!module?.subscriptionPlans?.length) {
    this.selectedModuleDetails$.next(module);
    return;
  }

  const planRequests = module.subscriptionPlans.map((plan: any) =>
    this.subscriptionService.getPlanLimits(plan.id).pipe(
      map(limit => ({ ...plan, limit })),
      catchError(() => [{ ...plan, limit: null }])
    )
  );

  forkJoin(planRequests).subscribe({
    next: enrichedPlans => {
      this.selectedModuleDetails$.next({
        ...module,
        subscriptionPlans: enrichedPlans
      });
    },
    error: err => console.error(err)
  });

  console.log(this.selectedModuleDetails$)
}


  async unlockModule() {
    const key = '123456';
     this.loading = true
  
    if (this.key !== key) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: "Invalid Key.",
        key: 'tf',
        life: 3000
      });
     this.loading = false
      return;
    }
  
    const newApp = {
      id: 0,
      name: this.module.code,
      title: this.module.label,
      description: this.module.description,
      shortDescription: this.module.shortDescription
    };
  
    this.marketplaceService.registerApp(newApp).subscribe({
      next: async (data) => {
        console.log('✅ Module registered:', data);
  
        const submenuApps = (this.module.submenu || []).map((item: any) => ({
          id: 0,
          appName: item.label,
          appCode: item.code,
          description: item.code,
          moduleId: data.id
        }));
  
        if (submenuApps.length === 0) {
          await this.completeInstallation();
          return;
        }
  
        const submenuRequests = submenuApps.map((app: any) =>
          this.marketplaceService.registerSubApp(app)
        );
  
        forkJoin(submenuRequests).subscribe({
          next: (results) => {
            console.log('✅ All submenu apps registered:', results);
            this.completeInstallation();
          },
          error: (error) => {
            console.error('❌ Error registering submenu apps:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to install one or more submenu apps.',
              key: 'tf',
              life: 3000
            });
          }
        });
      },
      error: (err) => {
        console.log(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: "Failed to install app.",
          key: 'tf',
          life: 3000
        });
     this.loading = false
     this.visible = false

      }
    });
  }
  
 async completeInstallation() {
  await this.menuService.getRegisterApps()
    this.messageService.add({
      severity: 'success',
      summary: 'Validation successful',
      detail: `${this.module.label} has been installed successfully`,
      key: 'tf',
      life: 3000
    });
    this.loading = false
  
    this.module.locked = false;
    this.visible = false;
    this.module = [];
    this.key = '';
  }
  
   

    getLink(){
      switch(this.module.label){
        case 'Human Resources':
          return 'https://www.optimaxsuites.com/human%20resources';
        case 'POS':
          return 'https://www.optimaxsuites.com/pos';
        case 'Checkout':
          return 'https://www.optimaxsuites.com/pos';
        case 'Office Productivity':
            return 'https://www.optimaxsuites.com/human%20resources';
        default:
          return '';
      }
    }

    proceedToPayment(selectedPlan: any, module: any){
      if (!selectedPlan || !module) return;

        this.router.navigate(
          ['/subscription', module.id],
          { queryParams: { plan: selectedPlan.id } }
        );
    }

    getActionItems(order: any) {
  return [
    { label: 'Renew', icon: 'pi pi-refresh', command: () => this.renew(order) },
    { label: 'Change Plan', icon: 'pi pi-pencil', command: () => this.changePlan(order) }
  ];
  }

  renew(order: any) {
    console.log('Renew clicked for order:', order);
    this.router.navigate(['/subscription', order.module.id], {
      queryParams: { plan: order.plan.id, order: order.id, action: 'renew' }
    });
  }

  changePlan(order: any) {
    console.log('Change Plan clicked for order:', order);
    this.router.navigate(['/subscription', order.module.id], {
      queryParams: {  order: order.id, action: 'change-plan' }
    });
  }

  markModulesWithLockStatus() {
    const unlockedRoutes = (this.appList || []).map((app: { name: string }) => app.name);

    this.modules = (this.modules || []).map(module => ({
      ...module,
      locked: !unlockedRoutes.includes(module.name)
    }));
  }

  formatDate(parts: any): Date | null {
  if (!parts) return null;
  if (Array.isArray(parts)) return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
  if (typeof parts === 'string' || parts instanceof Date) {
    const d = new Date(parts);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}


editModule(module: any) {
    this.editingModule = module;
    this.openAddModule = true;
    this.showDetails = false;
  }

deleteModule(module: any) {
  this.openConfirmDialog = true;
  // Implement delete logic here
  // if (confirm(`Delete ${module.name}?`)) {
  //   // Call delete service
  //   this.marketplaceService.deleteModule(module.id).subscribe(() => {
  //     this.loadModules();
  //     this.showDetails = false;
  //   });
  // }
}

confirmDelete(){
  this.deletingModule =true
  this.marketplaceService.deleteModule(this.selectedModuleDetails$.value.id).subscribe({
    next: () => {
      this.loadModules();
      this.showDetails = false;
      this.openConfirmDialog = false;
      this.deletingModule = false
    },
    error: (err) => {
      console.error('Error deleting module', err);
      this.openConfirmDialog = false;
      this.deletingModule = false

    }
  })
}
// ...existing code...
}
