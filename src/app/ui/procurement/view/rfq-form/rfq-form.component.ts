import { Component, EventEmitter, Input, Output } from '@angular/core';
// import {Item} from '../rfq-list/rfq-list.component'
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RfqDTO, RfqItemDTO } from '../../domain/procurement.dto';
import { ActivatedRoute } from '@angular/router';
import { RfqServiceService } from '../../service/rfq-service/rfq-service.service';

@Component({
  selector: 'app-rfq-form',
  templateUrl: './rfq-form.component.html',
  styleUrl: './rfq-form.component.scss'
})
export class RfqFormComponent {
  @Output() back = new EventEmitter<void>();

  openAddItem?: boolean;
  rfqData: RfqDTO = {};
  items: RfqItemDTO[] = []
  uuid?: string;

  constructor(
    private route: ActivatedRoute,
    private rfqService: RfqServiceService 
  ) {}

  ngOnInit() {
    this.uuid = this.route.snapshot.paramMap.get('uuid') || '';
    // Now you can use this.uuid to fetch or display the relevant data
    if (this.uuid) {
      this.rfqService.getRfqById(this.uuid).subscribe((data: RfqDTO) => {
        this.rfqData = data;
      });
    }
  }

  goBack() {
    this.back.emit();
  }

  @Output() addItem = new EventEmitter<RfqItemDTO>();
  @Input() isEdit: boolean = false;

 
  submitForm() {
    console.log("quotation into", this.rfqData)

    this.rfqService.updateRfq(this.rfqData).subscribe((response) => {
      // Handle success response
      console.log("Created RFQ successful")
    });
  }


  cancel() {
    this.back.emit();
  }
















}
