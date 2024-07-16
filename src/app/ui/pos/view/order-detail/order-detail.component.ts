import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';
import { NavigationState } from '../../models/interface';

@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.component.html',
  styleUrl: './order-detail.component.scss'
})
export class OrderDetailComponent {

  navigationState: NavigationState;
  constructor(
    private router: Router, 
     public navigationLink: NavigationLinksService,
    //  private messageService: MessageService
     ) {
  
       const navigation = this.router.getCurrentNavigation();
        this.navigationState = navigation?.extras.state as NavigationState;
        if (!this.navigationState) {
          const viewedState = localStorage.getItem('viewedState');
          if (viewedState) {
            this.navigationState = JSON.parse(viewedState);
          }
        } else {
          localStorage.setItem('viewedState', JSON.stringify(this.navigationState));
        }
    
        }


        reOpenCart() {
          throw new Error('Method not implemented.');
          }

}
