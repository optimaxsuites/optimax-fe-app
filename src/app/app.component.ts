import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from './ui/sharedComponent/service/auth-service/authentication.service';
import { IndustryDataService } from './ui/service/industry-data.service';
import { MetadataService } from './ui/service/metadata.service';
import { RegisterService } from './ui/service/register.service';
import { firstValueFrom } from 'rxjs';
import { CheckoutService } from './ui/service/checkout.service';
import { OfflineService } from './ui/service/offline.service';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit{
  title = 'erp-pos';

  showCloseRegisterModal = false;
  openingAmount: number = 0;
  closingAmount: number | null = null;
  finalizedRegisterData: any = null;

  constructor(
    private authenticationService: AuthenticationService,
    private industryDataService: IndustryDataService,
    private metadataService: MetadataService,
    private registerService: RegisterService,
    private checkoutService: CheckoutService,
    private offlineService: OfflineService
  ) {
    this.userLoginAction();
  }

  ngOnInit(): void {
    // this.metadataService.fetchMetaData()
    this.registerService.closeRegister$.subscribe(() => {
      // Always fetch the latest openingAmount from localStorage before opening the modal
      const storedOpeningAmount = localStorage.getItem('openingAmount');
      this.openingAmount = storedOpeningAmount ? Number(storedOpeningAmount) : 0;
      this.showCloseRegisterModal = true;
    });
    window.addEventListener("online", () => this.syncOfflinePayments())

 
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

  async userLoginAction(): Promise<void> {
    console.log("logginging in...");
    const loginDetails = {
      username: 'ayaobasheba',
      password: '123456',
      project: 'ERP',
      apiKey: 'ApiKey b784e00442334be0497f434d2a4cbefd',
    };

    // if (!loginDetails.username || !loginDetails.password) {
    //   this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Username and password are required' });
    //   return;
    // }

    try {
      const data = await this.authenticationService
        .userLogin(loginDetails)
        .toPromise();
      this.loadInitParam(data);

      console.log(data)

      if (data) {
        this.authenticationService.getUserPrimaryInfoById(data.id).subscribe(
          (data) => {
            console.log(data);

            // for some reason, it defaults to "information technology" as of 03-03-2025. FIXED. It depends on the user's login
            //FIXME - Instead of "Pharmacy", the number 3 is returned >~<
            this.industryDataService.businessType =
              data.industry == 3 ? 'Pharmacy' : data.industry;
          },
          (error) => {
            console.error('Error fetching user info:', error);
          }
        );
      }
    } catch (error) {
      console.log(error);
    }
  }

  loadInitParam(data: any) {
    sessionStorage.setItem('role', data.roles);
    sessionStorage.setItem('username', data.username);
    sessionStorage.setItem('fullname', data.fullname);
    sessionStorage.setItem('email', data.email);
    sessionStorage.setItem('userid', data.id);
    const tokenStartIndex = data.accessToken.indexOf('=') + 1;
    const token = data.accessToken.substring(
      tokenStartIndex,
      data.accessToken.indexOf(';')
    );
    sessionStorage.setItem('Token', token);
    localStorage.setItem('Token2', token);
    sessionStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('accessToken2', data.accessToken);
    sessionStorage['userRegData'] = JSON.stringify(data);

    this.getUserBranchInfo(data);


//  this.authenticationService.getUserApplicationRole(data.id).subscribe({
//   next: (response) => {
//     console.log("User application role:", response);
//     // sessionStorage.setItem("userApplicationRole", JSON.stringify(response));
//     if (Array.isArray(data.roles) && data.roles.includes("ROLE_ADMIN")) {
//     console.log("Super user detected");
//     sessionStorage.setItem(
//       "userApplicationRole",
//       JSON.stringify(response)
//     );
//   } else {
//     sessionStorage.setItem(
//       "userApplicationRole",
//       JSON.stringify(response)
//     );
//   }

//   },
//   error: (error) => {
//     console.error("Error fetching user application role:", error);
//      const storedRole = sessionStorage.getItem("userApplicationRole");
//       if (storedRole) {
//         console.log("Removing invalid userApplicationRole from sessionStorage");
//         sessionStorage.removeItem("userApplicationRole");
//       }
//   }
// })
  }

  getUserBranchInfo(data: any) {
    const userId = sessionStorage.getItem('userid');
      if (!userId) {
        return;
      }

    this.authenticationService.getUserBranchInfoById(userId).subscribe(
      data => {
        sessionStorage["userBranchInfoRegData"] = JSON.stringify(data);
      },
      error => {
        console.error('Error fetching user branch info:', error);
      }
    );
  }

  onFinalizeRegister(data: any) {
    // Save finalized register data to localStorage
    localStorage.setItem('registerFinalized', 'true');
    localStorage.setItem('registerFinalizedData', JSON.stringify(data));
    localStorage.setItem('registerState', 'false');
    localStorage.setItem('closingAmount', String(data.closeAmount));
    this.finalizedRegisterData = data;
    this.showCloseRegisterModal = false;
  }

  onCloseRegisterModal() {
    this.showCloseRegisterModal = false;
  }
}
