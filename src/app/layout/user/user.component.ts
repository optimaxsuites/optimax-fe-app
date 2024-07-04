import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';


@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrl: './user.component.scss'
})
export class UserComponent {

  sidebarHidden: boolean = true;
  

  toggleSidebar() {
    this.sidebarHidden = !this.sidebarHidden;
  }

}
