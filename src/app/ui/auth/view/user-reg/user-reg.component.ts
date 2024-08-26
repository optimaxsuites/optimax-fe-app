import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Gender } from 'src/app/ui/shared/domain/interface/data';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';
import { UserInfoService } from '../../service/user-info.service';
import { City, Country, State } from 'src/app/ui/shared/domain/country-data.model';
import { countriesData } from 'src/app/ui/shared/service/country-data';
import { UserInfo} from '../../domain/auth.dto'




@Component({
  selector: 'app-user-reg',
  templateUrl: './user-reg.component.html',
  styleUrl: './user-reg.component.scss',
  providers: [MessageService]
})
export class UserRegComponent {
  userInfoData: UserInfo = {  };
  viewDonorProfile: any = []


  onImageUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.userInfoData.image = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  constructor(
    private messageService: MessageService,
    private router: Router,
    private navigationLink: NavigationLinksService,
    private userInforService: UserInfoService,
  ){  }

  ngOnInit() {  }

  checkForEmptyFields(details: any): boolean {
    return Object.values(details).some(value => typeof value === 'string' && value.trim() === '');
  }


  countries: Country[] = countriesData;
  states: State[] = [];
  cities: City[] = [];

  onCountrySelect(selectedCountry: Country) {
    console.log('Selected Country:', selectedCountry);

    this.userInfoData.selectedCountry = selectedCountry.name;  // Capture the country name

    if (selectedCountry && selectedCountry.states) {
      this.states = selectedCountry.states;
      this.userInfoData.selectedState;  // Reset state and city when a new country is selected
      this.userInfoData.selectedCity;
      this.cities = [];
    } else {
      this.states = [];
      this.cities = [];
    }
  }

  onStateSelect(selectedState: State) {
    console.log('Selected State:', selectedState);

    this.userInfoData.selectedState = selectedState.name;  // Capture the state name

    if (selectedState && selectedState.cities) {
      this.cities = selectedState.cities;
      this.userInfoData.selectedCity;  // Reset city when a new state is selected
    } else {
      this.cities = [];
    }
  }

  onCitySelect(selectedCity: City) {
    console.log('Selected City:', selectedCity);

    this.userInfoData.selectedCity = selectedCity.name;  // Capture the city name
  }




  

  saveUserInfo(){
    // const dashboardLink = this.navigationLink.getLink('dashboardLink');
    // this.router.navigate([dashboardLink]);

      const userDetails = {
      fullname: this.userInfoData.fullName,
      email: this.userInfoData.email,
      phoneNumber: this.userInfoData.phoneNumber,
      username: this.userInfoData.username,
      city: this.userInfoData.selectedCity,
      state: this.userInfoData.selectedState,
      country: this.userInfoData.selectedCountry,
      // profileImage: this.userInfoData.image,
      address: this.userInfoData.address,
      clientType: this.userInfoData.clientType,
      companyName: this.userInfoData.company,
      industry: this.userInfoData.industry,
      bio: this.userInfoData.bio,
      postalCode: this.userInfoData.postalCode,
        // project : `${environment.project}`,
        // apiKey : `${environment.apiKey}`
      };

  if (this.checkForEmptyFields(userDetails)) {
    console.log("all fiellds are required")
      this.messageService.add({ severity: 'error', summary: 'warn', detail: 'All fields are required' , key: 'tl', life: 3000 });
  } else {

          this.userInforService.saveBasicInfo(userDetails).subscribe(
            async (data) => {
          console.log(data)
                  if (!data) {
                      this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Failed, please try again.', key: 'tl', life: 3000  });
                  
                  } else {
                    console.log('reg successful')
                    this.messageService.add({ severity: 'success', summary: 'Authentication Failed', detail: 'Registered successfully.', key: 'tl', life: 3000  });
                      const dashboardLink = this.navigationLink.getLink('dashboardLink');
                      this.router.navigate([dashboardLink]);

                  
                  }
              },
              (error) => {
                if (error.toString() == "500") {
                    this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Check form details and try again.', key: 'tl', life: 3000  });
          
                  } 
                  if (error.toString() == "404") {
                    this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Error, try again.', key: 'tl', life: 3000  });
               
                  }
                  else if (error.toString() == "0") {
                      this.messageService.add({ severity: 'error', summary: 'Server Unreachable', detail: 'Unable to connect to the server. Please check your internet connection.', key: 'tl', life: 3000  });
                
                  }
               
              }
          );


    }
  }
}
