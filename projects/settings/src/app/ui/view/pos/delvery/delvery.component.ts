import { ChangeDetectorRef, Component } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DataService } from '../../../service/data.service';
import { forkJoin } from 'rxjs';
import { Time } from '@angular/common';


interface BranchDTO {
  id?: number;
  name: string;
  description: string;
  address: string;
  phoneNo: string;
  baseFee: 0,
  perKmRate: 0,
  maxFee: 0,
  minFee: 0,
  expressFee: 0,
  estimatedDays: 0,
  sameDayDeliveryCutoffTime: Time,
  logisticsPartner: string,
  isActive: true,
  isEditing?: boolean;
  deliveryNoteId?: number
}

@Component({
  selector: 'app-delvery',
  templateUrl: './delvery.component.html',
  styleUrl: './delvery.component.scss'
})
export class DelveryComponent {

  branches: BranchDTO[] = [];
  newBranch: BranchDTO = {
    id: 0,
    name: '',
    description: '',
    address: '',
    phoneNo: '',
    baseFee: 0,
    perKmRate: 0,
    maxFee: 0,
    minFee: 0,
    expressFee: 0,
    estimatedDays: 0,
    sameDayDeliveryCutoffTime: 0 as unknown as Time,
    logisticsPartner: '',
    isActive: true,
  };

  allBranch:  BranchDTO = {
    id: 0,
    name: '',
    description: '',
    address: '',
    phoneNo: '',
    baseFee: 0,
    perKmRate: 0,
    maxFee: 0,
    minFee: 0,
    expressFee: 0,
    estimatedDays: 0,
    sameDayDeliveryCutoffTime: 0 as unknown as Time,
    logisticsPartner: '',
    isActive: true,
  };

    showAddForm: boolean = false;
    branchLimit = 0
    loading:boolean = false
  
    constructor(
      private confirmationService: ConfirmationService,
      private messageService: MessageService,
      private dataService: DataService,
      private cdr: ChangeDetectorRef
      // private subscriptionService: SubscriptionService
    ) {}

      ngOnInit() {
        this.loadBranches();
    
      }
    
      // Load branches from localStorage
      loadBranches() {
        this.dataService.getBranches().subscribe({
          next: (data: any) => {
            console.log(data)
            this.dataService.getDeliveryNote().subscribe((key) => {
              // next: (key: any) => {
                const formattedData = data.map((branch: BranchDTO) => ({
              ...branch,
              isEditing: false,
              deliveryNoteId: key.find((k: any) => k.branchId === branch.id)?.id || 0,
              perKmRate: key.find((k: any) => k.branchId === branch.id)?.perKmRate || 0,
              maxFee: key.find((k: any) => k.branchId === branch.id)?.maxFee || 0,
              baseFee: key.find((k: any) => k.branchId === branch.id)?.baseFee || 0,
              minFee: key.find((k: any) => k.branchId === branch.id)?.minFee || 0,
              expressFee: key.find((k: any) => k.branchId === branch.id)?.expressFee || 0,
              estimatedDays: key.find((k: any) => k.branchId === branch.id)?.estimatedDays || 0,
              sameDayDeliveryCutoffTime: key.find((k: any) => k.branchId === branch.id)?.sameDayDeliveryCutoffTime || 'N/A',
              logisticsPartner: key.find((k: any) => k.branchId === branch.id)?.logisticsPartner || 'N/A',
              isActive: key.find((k: any) => k.branchId === branch.id)?.isActive || 0,
            }));
            this.branches = formattedData;
              
              // }
    
          this.cdr.detectChanges();
    
            })
            // const formattedData = data.map((branch: any) => ({
            //   ...branch,
            //   isEditing: false
            // }));
      
          },
          error: (error: any) => {
            console.log(error)
          }
    
    
        })
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
             baseFee: 0,
            perKmRate: 0,
            maxFee: 0,
            minFee: 0,
            expressFee: 0,
            estimatedDays: 0,
            sameDayDeliveryCutoffTime: 0 as unknown as Time,
            logisticsPartner: '',
            isActive: true,
          };
        }
      
      
      
        editBranch(branch: BranchDTO, event: Event) {
          event.stopPropagation();
            
          branch.isEditing = !branch.isEditing;
      
          if(branch.isEditing) {
             this.newBranch.baseFee = branch.baseFee;
              this.newBranch.perKmRate = branch.perKmRate;
              this.newBranch.maxFee = branch.maxFee;
              this.newBranch.minFee = branch.minFee;
              this.newBranch.expressFee = branch.expressFee;
              this.newBranch.estimatedDays = branch.estimatedDays;
              this.newBranch.sameDayDeliveryCutoffTime = branch.sameDayDeliveryCutoffTime;
              this.newBranch.logisticsPartner = branch.logisticsPartner;
              this.newBranch.isActive = branch.isActive;
          }
      
           if (this.newBranch.baseFee === 0 || this.newBranch.perKmRate === 0) {
            return;
          }
      // this.newBranch= branch
          if (!branch.isEditing) {
      
          //   this.saveBranchesToLocalStorage();
      
          //   this.messageService.add({
          //     severity: 'success',
          //     summary: 'Success',
          //     detail: 'Branch updated successfully!',
          //   });
          // }
          const data: any = {
            id: branch.deliveryNoteId,
            branchId: branch.id,
            baseFee: this.newBranch.baseFee,
            perKmRate: this.newBranch.perKmRate,
            maxFee: this.newBranch.maxFee,
            minFee: this.newBranch.minFee,
            expressFee: this.newBranch.expressFee,
            estimatedDays: this.newBranch.estimatedDays,
            sameDayDeliveryCutoffTime: this.newBranch.sameDayDeliveryCutoffTime,
            logisticsPartner: this.newBranch.logisticsPartner,
            isActive: this.newBranch.isActive,
          }
      
          console.log("key: ", data)
          this.dataService.addDeliveryNote(data).subscribe({
            next: (data: any) => {
              // this.branches.push(data);
              branch.baseFee = data.baseFee;
              branch.perKmRate = data.perKmRate;
              branch.maxFee = data.maxFee;
              branch.minFee = data.minFee;
              branch.expressFee = data.expressFee;
              branch.estimatedDays = data.estimatedDays;
              branch.sameDayDeliveryCutoffTime = data.sameDayDeliveryCutoffTime;
              branch.logisticsPartner = data.logisticsPartner;
              branch.isActive = data.isActive;
              console.log(branch)
              this.messageService.add({
                severity:'success',
                summary: 'Success',
                detail: `Payment key set up for ${branch.name} successfully!`,
                key: 'tl'
              });
      
            this.cdr.detectChanges();
      
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
      
      
      
      
      applyKeyToAll() {
        this.loading = true
        const requests = this.branches.map(branch => {
          const data = {
            id: branch.deliveryNoteId,
            branchId: branch.id,
             baseFee: this.allBranch.baseFee,
            perKmRate: this.allBranch.perKmRate,
            maxFee: this.allBranch.maxFee,
            minFee: this.allBranch.minFee,
            expressFee: this.allBranch.expressFee,
            estimatedDays: this.allBranch.estimatedDays,
            sameDayDeliveryCutoffTime: this.allBranch.sameDayDeliveryCutoffTime,
            logisticsPartner: this.allBranch.logisticsPartner,
            isActive: this.allBranch.isActive,
          };
      
          return this.dataService.addDeliveryNote(data);
        });
      
        forkJoin(requests).subscribe({
          next: (results: any[]) => {
            results.forEach((res, i) => {
              this.branches[i].baseFee = res.baseFee;
              this.branches[i].perKmRate = res.perKmRate;
              this.branches[i].maxFee = res.maxFee;
              this.branches[i].minFee = res.minFee;
              this.branches[i].expressFee = res.expressFee;
              this.branches[i].estimatedDays = res.estimatedDays;
              this.branches[i].sameDayDeliveryCutoffTime = res.sameDayDeliveryCutoffTime;
              this.branches[i].logisticsPartner = res.logisticsPartner;
              this.branches[i].isActive = res.isActive;
            });
      
            this.resetForm()
        this.loading = false
      
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: `Payment key applied to all branches successfully!`,
              key: 'tl'
            });
          },
          error: () => {
        this.loading = false
      
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to update all branches, please try again.'
            });
          }
        });
      }
      
}
