import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Gender } from 'src/app/ui/shared/service/interface/data';
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
  industries: any[] = [
    {
      "id": 1,
      "name": "Retail",
      "description": "Stores selling goods directly to consumers, such as clothing stores, electronics, furniture, and bookstores."
    },
    {
      "id": 2,
      "name": "Food & Beverage",
      "description": "Restaurants, cafes, food trucks, catering services, and other establishments serving food and drinks."
    },
    {
      "id": 3,
      "name": "Pharmacy & Health",
      "description": "Pharmacies, health and wellness stores, medical equipment shops, and clinics."
    },
    {
      "id": 4,
      "name": "Hospitality",
      "description": "Hotels, resorts, event venues, and other businesses in the travel and accommodation sector."
    },
    {
      "id": 5,
      "name": "Beauty & Personal Care",
      "description": "Salons, spas, barber shops, nail salons, and cosmetic stores."
    },
    {
      "id": 6,
      "name": "Automotive",
      "description": "Car dealerships, auto parts stores, and repair shops."
    },
    {
      "id": 7,
      "name": "Groceries & Food Stores",
      "description": "Supermarkets, organic food shops, convenience stores, and grocery outlets."
    },
    {
      "id": 8,
      "name": "Entertainment & Events",
      "description": "Movie theaters, event venues, concerts, and live shows."
    },
    {
      "id": 9,
      "name": "Health & Fitness",
      "description": "Gyms, yoga studios, fitness equipment stores, and health clubs."
    },
    {
      "id": 10,
      "name": "Fashion",
      "description": "Clothing boutiques, shoe stores, jewelry stores, and accessory shops."
    },
    {
      "id": 11,
      "name": "Electronics & Gadgets",
      "description": "Mobile and tech stores, computer retailers, and home appliance shops."
    },
    {
      "id": 12,
      "name": "Construction & Hardware",
      "description": "Hardware stores, building material suppliers, and equipment rental services."
    },
    {
      "id": 13,
      "name": "Education",
      "description": "Bookstores, educational supplies, tutoring centers, and online learning platforms."
    },
    {
      "id": 14,
      "name": "Home & Garden",
      "description": "Home improvement stores, garden centers, and furniture shops."
    },
    {
      "id": 15,
      "name": "Arts & Crafts",
      "description": "Art supply stores, craft shops, and DIY stores."
    },
    {
      "id": 16,
      "name": "Wholesale Distribution",
      "description": "Wholesale suppliers, B2B retailers, and large-scale distributors."
    }
  ]
  

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

  ngOnInit() { 
    const username = sessionStorage.getItem('username');
    const email = sessionStorage.getItem('email');

    // const storedUsername = sessionStorage.getItem('username');
    // const storedEmail = sessionStorage.getItem('email');

    // Set values to userInfoData
    if (username) {
      this.userInfoData.username = username;
    }
    if (email) {
      this.userInfoData.email = email;
    }

    console.log(username,email)
   }

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
      const userDetails = {
      fullname: this.userInfoData.fullName,
      email: this.userInfoData.email,
      phoneNumber: this.userInfoData.phoneNumber,
      username: this.userInfoData.username,
      city: this.userInfoData.selectedCity,
      state: this.userInfoData.selectedState,
      country: this.userInfoData.selectedCountry,
      address: this.userInfoData.address,
      clientType: this.userInfoData.clientType,
      companyName: this.userInfoData.company,
      industry: this.userInfoData.industry,
      bio: this.userInfoData.bio,
      postalCode: this.userInfoData.postalCode,
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
