import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { RegisterService } from './ui/pos/service/register.service';
import { BehaviorSubject, Observable } from 'rxjs';


@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrl: './user.component.scss'
})
export class UserComponent {



  sidebarHidden: boolean = true;
  register: string = "" 
  openingAmount: string = ''
  inputValue: string = '';
  private _isOffline = new BehaviorSubject<boolean>(!navigator.onLine);
  isOffline$: Observable<boolean> = this._isOffline.asObservable();

  constructor(private registerService: RegisterService, private router: Router) {
     window.addEventListener('online', () => this._isOffline.next(false));
    window.addEventListener('offline', () => this._isOffline.next(true));
  }

  ngOnInit() {
      const openingAmount =  localStorage.getItem('openingAmount')
      if(!openingAmount){
        this.register = 'open'
      }else{
      this.openingAmount = JSON.parse( JSON.stringify(openingAmount))
      }
    this.registerService.closeRegister$.subscribe(() => this.closeRegister());
  }

  registerButton() {
    if(this.register === "open"){
      const openingAmount =  localStorage.getItem('openingAmount')
      if(openingAmount && openingAmount?.length > 0){
        this.register = ''
      }
      return
    }
    this.register = ''
  }


  handleRegister() {
    if(this.register === 'open' && this.inputValue.length > 0){

      localStorage.setItem('openingAmount', this.inputValue)
      const openingAmount = JSON.stringify( localStorage.getItem('openingAmount'))
      this.openingAmount = JSON.parse( openingAmount)


    }else if(this.register === 'close' && this.inputValue.length > 0){
       localStorage.setItem('closingAmount', this.inputValue)
       this.logout()
    }

    this.inputValue.length> 0 ? this.register = '' : this.register = this.register
    this.inputValue = ''

  }

   logout(): void {
    sessionStorage.removeItem("username");
    sessionStorage.removeItem("token");

    //added by yomi
    sessionStorage.removeItem("userInfoRegData");
    sessionStorage.removeItem("userRegData");
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("userid");
    this.router.navigate([''])
}

  closeRegister(){
    this.register = "close"
  }
}
