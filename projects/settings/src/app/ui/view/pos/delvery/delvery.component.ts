import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DataService } from '../../../service/data.service';
import { forkJoin } from 'rxjs';
import { Time } from '@angular/common';
import { LogisticsService } from '../../../service/logistics.service';


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
  estimatedValue: string
  estimatedUnit: "days" | "hours" | "minutes" | undefined
}

@Component({
  selector: 'app-delvery',
  templateUrl: './delvery.component.html',
  styleUrl: './delvery.component.scss'
})
export class DelveryComponent implements OnInit {

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
    estimatedValue: '',
    estimatedUnit: 'days'
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
    estimatedValue: '',
    estimatedUnit: 'days'
  };

    showAddForm: boolean = false;
    branchLimit = 0
    loading:boolean = false
    logistics: any[] = [];
    selectedLogistics: number[] = []; // store selected logistic ids
    showLogisticModal = false;

    constructor(
      private confirmationService: ConfirmationService,
      private messageService: MessageService,
      private dataService: DataService,
      private cdr: ChangeDetectorRef,
      private logisticsService: LogisticsService
      // private subscriptionService: SubscriptionService
    ) {}

      ngOnInit() {
        this.loadBranches();
        this.loadLogistics();
    
      }
    
      // Load branches from localStorage
      loadBranches() {
        this.dataService.getBranches().subscribe({
          next: (data: any) => {
            console.log(data)
            this.dataService.getDeliveryNote().subscribe((key) => {

              console.log(key)
              // next: (key: any) => {
               // 1. Pre-process the 'key' array into a Map for instant lookups
              const branchConfigMap = new Map(key.map((k: any) => [k.branchId, k]));

              const formattedData = data.map((branch: BranchDTO) => {
                // 2. Look up the config once per branch
                const config: any = branchConfigMap.get(branch.id);

                return {
                  ...branch,
                  isEditing: false,
                  // 3. Assign values using the single config object
                  deliveryNoteId: config?.id || 0,
                  perKmRate: config?.perKmRate || 0,
                  maxFee: config?.maxFee || 0,
                  baseFee: config?.baseFee || 0,
                  minFee: config?.minFee || 0,
                  expressFee: config?.expressFee || 0,
                  estimatedDays: config?.estimatedDays || 0,
                  sameDayDeliveryCutoffTime: config?.sameDayDeliveryCutoffTime || 'N/A',
                  logisticsPartner: config?.logisticsPartner || 'N/A',
                  isActive: config?.isActive || 0,
                };
              });

              this.branches = formattedData;
              console.log(this.branches);
              
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

      loadLogistics() {
        this.logisticsService.getLogistics().subscribe({
          next: (res) => (this.logistics = Array.isArray(res) ? res : []),
          error: (err) => {
            console.error('Failed to load logistics', err);
            this.logistics = [];
          }
        });
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
            estimatedValue: '',
            estimatedUnit: 'days'
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
            
          // console.log("key: ", data)
          const unitMultipliers: Record<string, number> = {
            minutes: 1,
            hours: 60,
            days: 1440 
          };

          // 2. Perform the conversion
          const unit = this.newBranch.estimatedUnit?.toLowerCase() || 'minutes';
          const value: any = +this.newBranch.estimatedValue;
          const totalValue = value * (unitMultipliers[unit] || 1)

          const data: any = {
            id: branch.deliveryNoteId,
            branchId: branch.id,
            baseFee: this.newBranch.baseFee,
            perKmRate: this.newBranch.perKmRate,
            maxFee: this.newBranch.maxFee,
            minFee: this.newBranch.minFee,
            expressFee: this.newBranch.expressFee,
            estimatedDays: totalValue,
            sameDayDeliveryCutoffTime: this.newBranch.sameDayDeliveryCutoffTime,
            logisticsPartner: this.newBranch.logisticsPartner,
            isActive: this.newBranch.isActive,
          }
    
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
      
      
      
      
      openCreateLogistic() {
        this.showLogisticModal = true;
      }
    
      closeCreateLogistic() {
        this.showLogisticModal = false;
      }
    
      onLogisticCreated(newItem: any) {
        // add to list and select it
        this.logistics = [newItem, ...this.logistics];
        this.selectedLogistics = [ ...(this.selectedLogistics || []), newItem.id ];
        this.showLogisticModal = false;
      }
      
      applyKeyToAll() {
        this.loading = true
         const unitMultipliers: Record<string, number> = {
            minutes: 1,
            hours: 60,
            days: 1440 
          };

          const unit = this.allBranch.estimatedUnit?.toLowerCase() || 'minutes';
          const value: any = +this.allBranch.estimatedValue;
          const totalValue = value * (unitMultipliers[unit] || 1)
        const requests = this.branches.map(branch => {
          const data = {
            id: branch.deliveryNoteId,
            branchId: branch.id,
             baseFee: this.allBranch.baseFee,
            perKmRate: this.allBranch.perKmRate,
            maxFee: this.allBranch.maxFee,
            minFee: this.allBranch.minFee,
            expressFee: this.allBranch.expressFee,
            estimatedDays: totalValue,
            // sameDayDeliveryCutoffTime: this.allBranch.sameDayDeliveryCutoffTime.toISOdate(),
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
