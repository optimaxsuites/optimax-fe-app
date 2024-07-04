import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Gender } from 'src/app/interface/data';


interface UserInfo {
  firstName: string;
  lastName: string;
  username: string;
  gender: string[];
  email: string;
  phoneNumber: string;
  address: string;
  selectedCity: string;
  selectedState: string;
  selectedCountry: string;
  postalCode: string;
  occupation: string;
  company: string;
  bio: string;
}

interface Country {
  name: string;
  states: State[];
}

interface State {
  name: string;
  cities: City[];
}

interface City {
  name: string;
}

@Component({
  selector: 'app-user-reg',
  templateUrl: './user-reg.component.html',
  styleUrl: './user-reg.component.scss',
  providers: [MessageService]
})
export class UserRegComponent {
  userInfoData: UserInfo = {
    firstName: '',
    lastName: '',
    username: '',
    gender: [],
    email: '',
    phoneNumber: '',
    address: '',
    selectedCity: '',
    selectedState: '',
    selectedCountry: '',
    postalCode: '',
    occupation: '',
    company: '',
    bio: ''
  };
  items: any;
  isOpen1 = false;
  isOpen2 = false; 
  isOpen3 = false;

  visible: boolean = false;

  showDialog() {
      this.visible = true;
  }

  constructor(private messageService: MessageService){
    this.items = [
      {
          label: 'Update',
          command: () => {
              this.update();
          }
      },
      {
          label: 'Delete',
          command: () => {
              this.delete();
          }
      },
    ];
  }

  genders: Gender[] | undefined;

  selectedGender: Gender | undefined;



  ngOnInit() {
    this.isOpen1 = true; // Ensure panel 1 is open by default

    this.genders = [
      { gender: 'Male',},
      { gender: 'Female',},
      { gender: 'Both',},
    ];
  }

  togglePanel1() {
    this.isOpen1 = true;
    this.isOpen2 = false;
    this.isOpen3 = false;

  }
  togglePanel2() {
    this.isOpen2 = true;
    this.isOpen1 = false;
    this.isOpen3 = false;
  }
  togglePanel3() {
    this.isOpen3 = true;
    this.isOpen2 = false;
    this.isOpen1 = false;
  }




  save(severity: string) {
    this.messageService.add({ severity: severity, summary: 'Success', detail: 'Data Saved' });
  }

  update() {
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Data Updated' });
  }

  delete() {
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Data Deleted' });
  }




  // address: string;
  // selectedCity: string;
  // state: string;
  // country: string;



  countries: Country[] = [
    {
      name: 'Nigeria',
      states: [
        {
          name: 'Lagos',
          cities: [
            { name: 'Lagos Island' },
            { name: 'Ikeja' },
            { name: 'Ikorodu' },
            { name: 'Epe' },
            { name: 'Badagry' },
            { name: 'Surulere' },
            { name: 'Victoria Island' },
            { name: 'Lekki' },
            { name: 'Ajah' },
            { name: 'Apapa' }
          ]
        },
        {
          name: 'FCT',
          cities: [
            { name: 'Central Business District' },
            { name: 'Garki' },
            { name: 'Wuse' },
            { name: 'Maitama' },
            { name: 'Asokoro' },
            { name: 'Gwarinpa' },
            { name: 'Jabi' },
            { name: 'Utako' },
            { name: 'Lugbe' },
            { name: 'Kubwa' }
          ]
        },
        {
          name: 'Kano',
          cities: [
            { name: 'Kano' },
            { name: 'Wudil' },
            { name: 'Gaya' },
            { name: 'Rano' },
            { name: 'Bichi' },
            { name: 'Gwarzo' },
            { name: 'Karaye' },
            { name: 'Danbatta' },
            { name: 'Tudun Wada' },
            { name: 'Gezawa' }
          ]
        },
        {
          name: 'Rivers',
          cities: [
            { name: 'Port Harcourt' },
            { name: 'Bonny' },
            { name: 'Degema' },
            { name: 'Eleme' },
            { name: 'Okrika' },
            { name: 'Omoku' },
            { name: 'Ahoada' },
            { name: 'Bori' },
            { name: 'Opobo' },
            { name: 'Abonnema' }
          ]
        },
        {
          name: 'Oyo',
          cities: [
            { name: 'Ibadan' },
            { name: 'Oyo' },
            { name: 'Ogbomosho' },
            { name: 'Iseyin' },
            { name: 'Eruwa' },
            { name: 'Saki' },
            { name: 'Igboho' },
            { name: 'Kisi' },
            { name: 'Igbo Ora' },
            { name: 'Lalupon' }
          ]
        },
        {
          name: 'Edo',
          cities: [
            { name: 'Benin City' },
            { name: 'Auchi' },
            { name: 'Ekpoma' },
            { name: 'Uromi' },
            { name: 'Ubiaja' },
            { name: 'Igarra' },
            { name: 'Agenebode' },
            { name: 'Fugar' },
            { name: 'Sabongida Ora' },
            { name: 'Igueben' }
          ]
        },
        {
          name: 'Borno',
          cities: [
            { name: 'Maiduguri' },
            { name: 'Biu' },
            { name: 'Bama' },
            { name: 'Ngala' },
            { name: 'Gwoza' },
            { name: 'Dikwa' },
            { name: 'Damboa' },
            { name: 'Monguno' },
            { name: 'Kukawa' },
            { name: 'Chibok' }
          ]
        },
        {
          name: 'Kaduna',
          cities: [
            { name: 'Zaria' },
            { name: 'Kaduna' },
            { name: 'Kafanchan' },
            { name: 'Kagoro' },
            { name: 'Zonkwa' },
            { name: 'Saminaka' },
            { name: 'Soba' },
            { name: 'Giwa' },
            { name: 'Hunkuyi' },
            { name: 'Birnin Gwari' }
          ]
        },
        {
          name: 'Abia',
          cities: [
            { name: 'Aba' },
            { name: 'Umuahia' },
            { name: 'Ohafia' },
            { name: 'Arochukwu' },
            { name: 'Bende' },
            { name: 'Isuikwuato' },
            { name: 'Nkporo' },
            { name: 'Uturu' },
            { name: 'Ozuitem' },
            { name: 'Ikwuano' }
          ]
        },
        {
          name: 'Plateau',
          cities: [
            { name: 'Jos' },
            { name: 'Bukuru' },
            { name: 'Pankshin' },
            { name: 'Shendam' },
            { name: 'Langtang' },
            { name: 'Barkin Ladi' },
            { name: 'Riyom' },
            { name: 'Bokkos' },
            { name: 'Mangu' },
            { name: 'Bassa' }
          ]
        },
        {
          name: 'Enugu',
          cities: [
            { name: 'Enugu' },
            { name: 'Nsukka' },
            { name: 'Agbani' },
            { name: 'Awgu' },
            { name: 'Udi' },
            { name: 'Oji River' },
            { name: 'Eha-Amufu' },
            { name: 'Nkanu' },
            { name: 'Ngwo' },
            { name: 'Nike' }
          ]
        },
        {
          name: 'Kwara',
          cities: [
            { name: 'Ilorin' },
            { name: 'Offa' },
            { name: 'Omu-Aran' },
            { name: 'Patigi' },
            { name: 'Kaiama' },
            { name: 'Lafiagi' },
            { name: 'Jebba' },
            { name: 'Bode Saadu' },
            { name: 'Erin-Ile' },
            { name: 'Esie' }
          ]
        },
        {
          name: 'Ogun',
          cities: [
            { name: 'Abeokuta' },
            { name: 'Ijebu-Ode' },
            { name: 'Sagamu' },
            { name: 'Ilaro' },
            { name: 'Ota' },
            { name: 'Ikenne' },
            { name: 'Ijebu-Igbo' },
            { name: 'Ago-Iwoye' },
            { name: 'Ewekoro' },
            { name: 'Idiroko' }
          ]
        },
        {
          name: 'Anambra',
          cities: [
            { name: 'Onitsha' },
            { name: 'Awka' },
            { name: 'Nnewi' },
            { name: 'Ekwulobia' },
            { name: 'Agulu' },
            { name: 'Ihiala' },
            { name: 'Oko' },
            { name: 'Ozubulu' },
            { name: 'Umunze' },
            { name: 'Umuleri' }
          ]
        },
        {
          name: 'Delta',
          cities: [
            { name: 'Warri' },
            { name: 'Asaba' },
            { name: 'Sapele' },
            { name: 'Ughelli' },
            { name: 'Agbor' },
            { name: 'Ozoro' },
            { name: 'Abraka' },
            { name: 'Oghara' },
            { name: 'Kwale' },
            { name: 'Ogwashi-Uku' }
          ]
        },
        {
          name: 'Sokoto',
          cities: [
            { name: 'Sokoto' },
            { name: 'Tambuwal' },
            { name: 'Wurno' },
            { name: 'Gwadabawa' },
            { name: 'Goronyo' },
            { name: 'Bodinga' },
            { name: 'Binji' },
            { name: 'Dange-Shuni' },
            { name: 'Gada' },
            { name: 'Gudu' }
          ]
        },
        {
          name: 'Cross River',
          cities: [
            { name: 'Calabar' },
            { name: 'Ugep' },
            { name: 'Ikom' },
            { name: 'Ogoja' },
            { name: 'Obudu' },
            { name: 'Akamkpa' },
            { name: 'Obubra' },
            { name: 'Etung' },
            { name: 'Bekwarra' },
            { name: 'Biase' }
          ]
        },
        {
          name: 'Ondo',
          cities: [
            { name: 'Akure' },
            { name: 'Ondo' },
            { name: 'Owo' },
            { name: 'Ikare' },
            { name: 'Okitipupa' },
            { name: 'Igbokoda' },
            { name: 'Idanre' },
            { name: 'Ifon' },
            { name: 'Irele' },
            { name: 'Owena' }
          ]
        },
        {
          name: 'Bayelsa',
          cities: [
            { name: 'Yenagoa' },
            { name: 'Ogbia' },
            { name: 'Sagbama' },
            { name: 'Brass' },
            { name: 'Nembe' },
            { name: 'Ekeremor' },
            { name: 'Twon-Brass' },
            { name: 'Kaiama' },
            { name: 'Odi' },
            { name: 'Amassoma' }
          ]
        },
        {
          name: 'Akwa Ibom',
          cities: [
            { name: 'Uyo' },
            { name: 'Eket' },
            { name: 'Ikot Ekpene' },
            { name: 'Oron' },
            { name: 'Abak' },
            { name: 'Itu' },
            { name: 'Mkpat Enin' },
            { name: 'Etinan' },
            { name: 'Essien Udim' },
            { name: 'Ikot Abasi' }
          ]
        },
        {
          name: 'Benue',
          cities: [
            { name: 'Makurdi' },
            { name: 'Gboko' },
            { name: 'Otukpo' },
            { name: 'Katsina-Ala' },
            { name: 'Adikpo' },
            { name: 'Okpoga' },
            { name: 'Vandeikya' },
            { name: 'Aliade' },
            { name: 'Zaki-Biam' },
            { name: 'Ugba' }
          ]
        },
        {
          name: 'Kebbi',
          cities: [
            { name: 'Birnin Kebbi' },
            { name: 'Argungu' },
            { name: 'Yauri' },
            { name: 'Zuru' },
            { name: 'Jega' },
            { name: 'Bagudo' },
            { name: 'Koko' },
            { name: 'Suru' },
            { name: 'Maiyama' },
            { name: 'Shanga' }
          ]
        },
        {
          name: 'Niger',
          cities: [
            { name: 'Minna' },
            { name: 'Bida' },
            { name: 'Kontagora' },
            { name: 'Suleja' },
            { name: 'Mokwa' },
            { name: 'Wushishi' },
            { name: 'Lapai' },
            { name: 'Agaie' },
            { name: 'Kagara' },
            { name: 'Rijau' }
          ]
        },
        {
          name: 'Ekiti',
          cities: [
            { name: 'Ado-Ekiti' },
            { name: 'Ikere-Ekiti' },
            { name: 'Ijero-Ekiti' },
            { name: 'Omuo-Ekiti' },
            { name: 'Aramoko-Ekiti' },
            { name: 'Igede-Ekiti' },
            { name: 'Ikole-Ekiti' },
            { name: 'Ise-Ekiti' },
            { name: 'Oye-Ekiti' },
            { name: 'Ilawe-Ekiti' }
          ]
        },
        {
          name: 'Taraba',
          cities: [
            { name: 'Jalingo' },
            { name: 'Wukari' },
            { name: 'Gembu' },
            { name: 'Bali' },
            { name: 'Serti' },
            { name: 'Mutum Biyu' },
            { name: 'Takum' },
            { name: 'Ibi' },
            { name: 'Zing' },
            { name: 'Donga' }
          ]
        },
        {
          name: 'Jigawa',
          cities: [
            { name: 'Dutse' },
            { name: 'Hadejia' },
            { name: 'Gumel' },
            { name: 'Kazaure' },
            { name: 'Birnin Kudu' },
            { name: 'Babura' },
            { name: 'Ringim' },
            { name: 'Gwaram' },
            { name: 'Kaugama' },
            { name: 'Miga' }
          ]
        },
        {
          name: 'Zamfara',
          cities: [
            { name: 'Gusau' },
            { name: 'Kaura Namoda' },
            { name: 'Talata Mafara' },
            { name: 'Anka' },
            { name: 'Bungudu' },
            { name: 'Bukkuyum' },
            { name: 'Gummi' },
            { name: 'Shinkafi' },
            { name: 'Tsafe' },
            { name: 'Zurmi' }
          ]
        },
        {
          name: 'Imo',
          cities: [
            { name: 'Owerri' },
            { name: 'Orlu' },
            { name: 'Okigwe' },
            { name: 'Mbaise' },
            { name: 'Oguta' },
            { name: 'Nkwerre' },
            { name: 'Ideato' },
            { name: 'Ohaji' },
            { name: 'Egbema' },
            { name: 'Isiala Mbano' }
          ]
        },
        {
          name: 'Bauchi',
          cities: [
            { name: 'Bauchi' },
            { name: 'Azare' },
            { name: 'Misau' },
            { name: 'Ningi' },
            { name: 'Jama\'are' },
            { name: 'Dass' },
            { name: 'Toro' },
            { name: 'Bogoro' },
            { name: 'Katagum' },
            { name: 'Tafawa Balewa' }
          ]
        },
        {
          name: 'Gombe',
          cities: [
            { name: 'Gombe' },
            { name: 'Kumo' },
            { name: 'Billiri' },
            { name: 'Kaltungo' },
            { name: 'Dukku' },
            { name: 'Deba' },
            { name: 'Nafada' },
            { name: 'Bajoga' },
            { name: 'Pindiga' },
            { name: 'Boh' }
          ]
        },
        {
          name: 'Adamawa',
          cities: [
            { name: 'Yola' },
            { name: 'Mubi' },
            { name: 'Jimeta' },
            { name: 'Numan' },
            { name: 'Gombi' },
            { name: 'Michika' },
            { name: 'Mayo-Belwa' },
            { name: 'Ganye' },
            { name: 'Fufore' },
            { name: 'Jada' }
          ]
        }
      ]
    }
  ];


selectedCountry: Country | null = null;
selectedState: State | null = null;
states: State[] = [];
cities: City[] = [];

onCountryChange() {
  const selectedCountry = this.countries.find(country => country.name === this.userInfoData.selectedCountry);
  this.states = selectedCountry ? selectedCountry.states : [];
  this.cities = [];
  this.userInfoData.selectedState = '';
  this.userInfoData.selectedCity = '';
}

onStateChange() {
  const selectedState = this.states.find(state => state.name === this.userInfoData.selectedState);
  this.cities = selectedState ? selectedState.cities : [];
  this.userInfoData.selectedCity = '';
}


}
