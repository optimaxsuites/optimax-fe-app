import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DataService } from '../../../service/data.service';
import { MetadataService } from '../../../../../../../POS/src/app/ui/service/metadata.service';

import * as L from 'leaflet';
import 'leaflet-control-geocoder';




interface BranchDTO {
  id?: number;
  name: string;
  description: string;
  address: string;
  phoneNo: string;
  isEditing?: boolean;
  latitude: number | null,
  longitude: number | null
  whatsappPhoneNumber: string

}

@Component({
  selector: 'app-branches',
  templateUrl: './branches.component.html',
  styleUrls: ['./branches.component.scss'],
  providers: [ConfirmationService, MessageService], 
})
export class BranchesComponent implements OnInit {
  branches: BranchDTO[] = [];
  newBranch: BranchDTO = {
  
    name: '',
    description: '',
    address: '',
    phoneNo: '',
    latitude: null,
    longitude: null,
    whatsappPhoneNumber: ""
  
  };
  sameAsPhone: boolean = false;
  mapVisible = false;
  map!: L.Map;
  showAddForm: boolean = false;
  branchLimit = 0
    selectedLocation: { lat: number; lng: number; address?: string } | null = null; 

  constructor(
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private dataService: DataService,
    private cdr: ChangeDetectorRef,
    private metadataService: MetadataService, 

    // private subscriptionService: SubscriptionService
  ) {}

  ngOnInit() {
    this.loadBranches();
     this.branchLimit = getLimitsForModule('optimaXPOS').branches || 0;
    console.log(this.branchLimit)
  }


    onLocationSelected(location: { lat: number; lng: number; address?: string }) {
      this.selectedLocation = location;
      this.mapVisible = false;
      this.newBranch.latitude = location.lat;
      this.newBranch.longitude = location.lng;
      this.newBranch.address = location.address || '';
    }


  // Load branches from localStorage
  loadBranches() {
    this.metadataService.branches$.subscribe({
      next: (data: any) => {
        console.log(data)
        const formattedData = data.map((branch: any) => ({
          ...branch,
          isEditing: false
        }));
  
        this.branches = formattedData;
    this.cdr.detectChanges();

      },
      error: (error: any) => {
        console.log(error)
      },
    })
  }

openMapModal() {
  this.mapVisible = true;

  setTimeout(() => {
    this.loadMap();
  }, 200);
}

loadMap() {
  if (this.map) this.map.remove();

  this.map = L.map('branchMap').setView([9.082, 8.6753], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(this.map);

  // Add draggable marker
  const marker = L.marker([9.082, 8.6753], { draggable: true }).addTo(this.map);

  marker.on('dragend', (event) => {
    const position = (event.target as L.Marker).getLatLng();
    this.newBranch.latitude = position.lat;
    this.newBranch.longitude = position.lng;
  });

  // Add geocoder/search control
  const geocoder = (L.Control as any).geocoder({
    defaultMarkGeocode: false
  })
    .on('markgeocode', (e: any) => {
      const latlng = e.geocode.center;
      marker.setLatLng(latlng);       // Move marker to search result
      this.map.setView(latlng, 15);   // Zoom in
      this.newBranch.latitude = latlng.lat;
      this.newBranch.longitude = latlng.lng;
    })
    .addTo(this.map);
}


  // Save branches to localStorage
  saveBranchesToLocalStorage() {
    localStorage.setItem('branches', JSON.stringify(this.branches));
  }

  toggleForm() {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.resetForm();
    }
  }

  resetForm() {
    this.newBranch = {
      id: 0,
      name: '',
      description: '',
      address: '',
      phoneNo: '',
      latitude: null,
      longitude: null,
      whatsappPhoneNumber: ''
    };
  }

  submitBranch() {
    if (this.newBranch.name.trim() === '') {
      return;
    }

    this.dataService.addBranch(this.newBranch).subscribe({
      next: (data: any) => {
        console.log(data)
        this.branches.push(data);
        this.metadataService.addBranchToState(data);
        
        this.messageService.add({
          severity:'success',
          summary: 'Success',
          detail: 'Branch added successfully!',
        });
        this.toggleForm();
        this.resetForm();
      },
      error: (error: any) => {

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to add branch, please try again.',
        });
      },
    })
   
  }

  editBranch(branch: BranchDTO, event: Event) {
    event.stopPropagation();
    branch.isEditing = !branch.isEditing;
this.newBranch= branch
    if (!branch.isEditing) {
    //   this.saveBranchesToLocalStorage();

    //   this.messageService.add({
    //     severity: 'success',
    //     summary: 'Success',
    //     detail: 'Branch updated successfully!',
    //   });
    // }
    const data: BranchDTO = {
      id: branch.id,
      ...this.newBranch
    }
    this.dataService.addBranch(data).subscribe({
      next: (data: any) => {
        // this.branches.push(data);

        this.messageService.add({
          severity:'success',
          summary: 'Success',
          detail: 'Branch updated successfully!',
        });
        // this.toggleForm();
        this.resetForm();
      },
      error: (error: any) => {

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update branch, please try again.',
        });
      },
    })
  }
  }

  confirmBranchDelete(branch: BranchDTO, event: Event) {
    event.stopPropagation();

    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: `Are you sure you want to delete the branch "${branch.name}"?`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
      this.dataService.deleteBranch(branch.id || 0).subscribe({
        next: (data: any) => {
          // this.branches.push(data);
        this.branches = this.branches.filter((b) => b.id !== branch.id);

  
          this.messageService.add({
            severity:'success',
            summary: 'Success',
            detail: 'Branch deleted successfully!',
          });
          // this.toggleForm();
          this.resetForm();
        },
        error: (error: any) => {
  
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete branch, please try again.',
          });
        },
      })
       
      },
      reject: () => {
      
        this.messageService.add({
          severity: 'info',
          summary: 'Cancelled',
          detail: 'Branch deletion cancelled.'
        });
      },
    });
  }
}
export function getLimitsForModule(moduleName: string) {
  const cached = localStorage.getItem('plan_limits_map');
  const mapObj = cached ? JSON.parse(cached) : null
  return mapObj?.[moduleName][0] || null;
}

