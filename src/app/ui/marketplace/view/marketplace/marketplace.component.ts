import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { MenuItem } from 'src/app/ui/shared/domain/menuItem.dto';
// import { MenuItemsService } from 'src/app/ui/shared/service/menue-items/menu-items.service';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';
import { MarketplaceService } from '../../service/marketplace.service'
import { MenuItemsService } from 'projects/settings/src/app/ui/sharedComponents/service/menue-items/menu-items.service';
@Component({
  selector: 'app-marketplace',
  templateUrl: './marketplace.component.html',
  styleUrl: './marketplace.component.scss'
})
export class MarketplaceComponent {
  role: string|null = ''
  modules: MenuItem[] = [];
  visible: boolean = false;
  module: any = {}
  code: string = ''
  key: string = ''
  constructor(private menuService: MenuItemsService, private messageService: MessageService,
   private navigationLink: NavigationLinksService, private marketplaceService: MarketplaceService) {}

   ngOnInit(): void {
      this.role = sessionStorage.getItem('role'); 
      console.log("role = ", this.role)
      if (this.role) {
        this.modules = this.menuService.getAllModules().sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0));
      }
 
    }

    showDialog(module: any, ) {
      this.visible = true;
      this.module = module;
   }

    unlockModule() {
      const key = '123456'
      if(this.key !== key){
        this.messageService.add({
          severity: 'error',
          summary: 'Validation Error',
          detail: "Invalid Key.",
          key: 'tf',
          life: 3000
        });
        return
      }
      // this.menuService.unlockModule(this.label)
      const newApp = {
        appName: this.module.code,
        appCode: this.module.code,
        description: this.module.label
      }
      this.marketplaceService.registerApp(newApp).subscribe(
        data => {
          console.log(data)
          this.messageService.add({
            severity: 'success',
            summary: 'Validation successful',
            detail:   `${this.module.label} has been installed successfully`,
            key: 'tf',
            life: 3000
          });
          this.module.locked = false;
        },
        error => {
          console.log(error)
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: "Failed to install app.",
            key: 'tf',
            life: 3000
          });
        }
      )
    

      this.visible = false;
      this.module = []
      this.key = ''
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
}
