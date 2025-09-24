import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { RegisterService } from './ui/pos/service/register.service';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { OfflineService } from 'projects/POS/src/app/ui/service/offline.service';
import { CheckoutService } from 'projects/POS/src/app/ui/service/checkout.service';


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

  constructor(private registerService: RegisterService, private router: Router, private offlineService: OfflineService, private checkoutService: CheckoutService) {
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
    // window.addEventListener("online", () => this.syncOfflinePayments())

  }

  private async syncOfflinePayments() {
      console.log("🌐 You are now online, preparing to sync...");
    
      await new Promise((resolve) => setTimeout(resolve, 3000));
    
      const pendingPayments = await firstValueFrom(this.offlineService.getPendingPayments());
      if (!pendingPayments.length) return;
    
      console.log("🔄 Syncing offline payments:", pendingPayments);
    
      for (const payment of pendingPayments) {
        const now = new Date().toISOString();
        const onlinePaymentPayload = {
          id: payment.id,
          totalAmount: payment.totalAmount,
          transactionDate: payment.transactionDate,
          status: payment.status,
        };
    
        this.checkoutService.makePayment(onlinePaymentPayload).subscribe({
          next: (paymentId) => {
            let breakdownCount = 0;
    
            for (const breakdown of payment.breakdowns) {
              breakdown.paymentId = paymentId;
              this.checkoutService.savePaymentBreakdown(breakdown).subscribe({
                next: () => {
                  breakdownCount++;
                  if (breakdownCount === payment.breakdowns.length) {
                    payment.order.paymentId = paymentId;
                    this.checkoutService.saveOrder(payment.order).subscribe({
                      next: async () => {
                        console.log("✅ Offline payment synced:", payment);
    
                        await this.offlineService.removePendingPayment(payment.id);
    
                       
                      },
                      error: (err) =>
                        console.error("❌ Failed to sync order:", err),
                    });
                  }
                },
                error: (err) =>
                  console.error("❌ Failed to sync payment breakdown:", err),
              });
            }
          },
          error: (err) => console.error("❌ Failed to sync payment:", err),
        });
      }
    
      this.offlineService.clearPendingPayments()
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
