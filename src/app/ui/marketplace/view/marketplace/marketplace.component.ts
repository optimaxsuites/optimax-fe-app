import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { MenuItem } from 'src/app/ui/shared/domain/menuItem.dto';
// import { MenuItemsService } from 'src/app/ui/shared/service/menue-items/menu-items.service';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';
import { MarketplaceService } from '../../service/marketplace.service'
import { MenuItemsService } from 'projects/settings/src/app/ui/sharedComponents/service/menue-items/menu-items.service';
import { forkJoin } from 'rxjs';
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
  constructor(private menuService: MenuItemsService, private messageService: MessageService,
   private navigationLink: NavigationLinksService, private marketplaceService: MarketplaceService, private router: Router) {}

   ngOnInit(): void {
      this.role = sessionStorage.getItem('role'); 
      console.log("role = ", this.role)
      if (this.role) {
        this.marketplaceService.getApps().subscribe({
          next: (data) => {
            this.modules = data
          },
          error(err) {
            console.error(err)
          },
        })
      }
 
    }

    showDialog(module: any, ) {
      this.visible = true;
      this.module = module;
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
}
