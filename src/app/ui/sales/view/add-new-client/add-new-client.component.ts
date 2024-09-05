import { Component, OnInit } from '@angular/core';
import {countriesData} from '../../../shared/service/country-data';
import { City, Country, State } from 'src/app/ui/shared/domain/country-data.model';
import { CustomerDTO, QuotationDTO } from '../../domain/quotation.dto';
import { QuotationService } from '../../service/quotation/quotation.service';


@Component({
  selector: 'app-add-new-client',
  templateUrl: './add-new-client.component.html',
  styleUrl: './add-new-client.component.scss'
})
export class AddNewClientComponent implements OnInit{

  customerData: CustomerDTO = {};

  countries: Country[] = countriesData;
  states: State[] = [];
  cities: City[] = [];
  
  selectedCountry?: string;
  selectedState?: string;
  selectedCity?: string;

  constructor(
    private quotationService: QuotationService
  ){}

  ngOnInit() {
  }

  customerTypes = [
    { label: 'Company', value: 'COMPANY' },
    { label: 'Individual', value: 'INDIVIDUAL' }
  ];



  onCountrySelect(selectedCountry: Country) {
    console.log('Selected Country:', selectedCountry);

    this.selectedCountry = selectedCountry.name;  // Capture the country name

    if (selectedCountry && selectedCountry.states) {
      this.states = selectedCountry.states;
      this.selectedState;  // Reset state and city when a new country is selected
      this.selectedCity;
      this.cities = [];
    } else {
      this.states = [];
      this.cities = [];
    }
  }

  onStateSelect(selectedState: State) {
    console.log('Selected State:', selectedState);

    this.selectedState = selectedState.name;  // Capture the state name

    if (selectedState && selectedState.cities) {
      this.cities = selectedState.cities;
      this.selectedCity;  // Reset city when a new state is selected
    } else {
      this.cities = [];
    }
  }

  onCitySelect(selectedCity: City) {
    console.log('Selected City:', selectedCity);

    this.selectedCity = selectedCity.name;  // Capture the city name
  }

  getFinalSelection() {
    console.log('Final Selection:');
    console.log('Country:', this.selectedCountry);
    console.log('State:', this.selectedState);
    console.log('City:', this.selectedCity);
  }


  onSubmit(){
    // this.getFinalSelection();
    console.log("cus info", this.customerData)

    this.quotationService.createCustomer(this.customerData).subscribe(
      (response) => {
        console.log('Customer created successfully:', response);
        // Handle success, maybe navigate to another page or display a success message
      },
      (error) => {
        console.error('Error creating customer:', error);
        // Handle the error, maybe display an error message to the user
      }
    );
  }

}
