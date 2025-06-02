import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-bookingform',
  templateUrl: './bookingform.component.html',
  styleUrls: ['./bookingform.component.scss'],
})
export class BookingformComponent {
  @Input() roomName: string = 'Deluxe Suite';
  @Input() roomType: string = 'Double Bed, Ocean View';
  @Input() roomPrice: string = '$299';
  @Input() roomImage: string =
    'https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=500&q=80';

  // You can add form handling logic here
  // For example:
  // bookingForm: FormGroup;

  // constructor(private fb: FormBuilder) {
  //   this.bookingForm = this.fb.group({
  //     firstName: ['', Validators.required],
  //     lastName: ['', Validators.required],
  //     // ... other form controls
  //   });
  // }

  // onSubmit() {
  //   if (this.bookingForm.valid) {
  //     // Process booking
  //   }
  // }
}
