import { Component, HostListener } from '@angular/core';
import { TabConfig } from './ui/shared-component/service/interface/data';
import { RecruitmentListComponent } from './ui/view/recruitment/recruitment-list/recruitment-list.component';
import { CandidateComponent } from './ui/view/recruitment/candidate/candidate.component';
import { ScheduledInterviewComponent } from './ui/view/recruitment/scheduled-interview/scheduled-interview.component';
import { MessageService } from 'primeng/api';
import { AuthenticationService } from './ui/shared-component/service/auth-service/authentication.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  providers: [MessageService, ]
})
export class AppHrComponent {
  messageService: any;
  navigationLink: any;
  router: any;
  sidebarHidden: boolean = true;
constructor(
  private authenticationService: AuthenticationService 
){
this.userLoginAction()

}



ngOnInit(): void {
}
  async userLoginAction(): Promise<void> {
  
    const loginDetails = {
      username: "Ayaobasheba",
      password: 123456,
      project: 'ERP',
      apiKey: 'ApiKey 8e2da356563ef460e52d56e83d73b8ee'
    };
  
    if (!loginDetails.username || !loginDetails.password) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Username and password are required' });
      return;
    }
  
    try {
      const data = await this.authenticationService.userLogin(loginDetails).toPromise();
      this.loadInitParam(data);
  
      if (!data) {
        this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Invalid username or password. Please check credentials and try again.' });
      } 
    } catch (error) {
      
      } 
  }
  loadInitParam(data: any) {
    sessionStorage.setItem("role", data.roles)
    sessionStorage.setItem("username", data.username);
    sessionStorage.setItem("fullname", data.fullname);
    sessionStorage.setItem("email", data.email);
    sessionStorage.setItem("userid", data.id);
    const tokenStartIndex = data.accessToken.indexOf('=') + 1;
    const token = data.accessToken.substring(tokenStartIndex, data.accessToken.indexOf(';'));
    sessionStorage.setItem("Token", token);
    localStorage.setItem("Token2", token);
    sessionStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("accessToken2", data.accessToken);
    sessionStorage["userRegData"] = JSON.stringify(data);
  }
  
  toggleSidebar() {
    this.sidebarHidden = !this.sidebarHidden;  // Toggle sidebar visibility
  }
}

