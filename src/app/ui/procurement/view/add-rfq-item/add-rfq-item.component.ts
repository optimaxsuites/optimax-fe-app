import { Component } from '@angular/core';
import { RfqFormComponent } from '../rfq-form/rfq-form.component';
import { RfqItemDTO } from '../../domain/procurement.dto';

@Component({
  selector: 'app-add-rfq-item',
  templateUrl: './add-rfq-item.component.html',
  styleUrl: './add-rfq-item.component.scss'
})
export class AddRfqItemComponent {
  itemsData: RfqItemDTO = {};


  constructor(
    public rfqFormComponent: RfqFormComponent
  ){}

  onSubmit() {
  }
  
}
