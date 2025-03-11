import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { MenuItem } from 'src/app/ui/shared/domain/menuItem.dto';
import { MenuItemsService } from 'src/app/ui/shared/service/menue-items/menu-items.service';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';
import { MarketplaceService } from '../../service/marketplace.service'
@Component({
  selector: 'app-marketplace',
  templateUrl: './marketplace.component.html',
  styleUrl: './marketplace.component.scss'
})
export class MarketplaceComponent {
  role: string|null = ''
  modules: MenuItem[] = [];
  visible: boolean = false;
  label: string = ''
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

    showDialog(label: string) {
      this.visible = true;
      this.label = label;
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
      this.menuService.unlockModule(this.label)
      const newApp = {
        appName: this.label,
        appCode: this.label,
        description: this.label
      }
      this.marketplaceService.registerApp(newApp).subscribe(
        data => {
          console.log(data)
          this.messageService.add({
            severity: 'success',
            summary: 'Validation successful',
            detail:   `${this.label} has been installed successfully`,
            key: 'tf',
            life: 3000
          });
    
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
      this.label = ''
      this.key = ''
    }

    getLink(){
      switch(this.label){
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
