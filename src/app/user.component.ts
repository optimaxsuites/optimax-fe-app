import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { RegisterService } from './ui/pos/service/register.service';


@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrl: './user.component.scss'
})
export class UserComponent {

  sidebarHidden: boolean = true;
  register: string = "open"
  amount: string = '';
  
  constructor(private registerService: RegisterService) {}
  ngOnInit() {
    this.registerService.closeRegister$.subscribe(() => this.closeRegister());
  }


  toggleSidebar() {
    this.sidebarHidden = !this.sidebarHidden;
  }

  closeRegister(){
    this.register = "close"
  }
}
