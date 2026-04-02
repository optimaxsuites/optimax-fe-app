import { Component, Input } from '@angular/core';


@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent {
  // Input to receive the notification type
  @Input() notificationType: string = 'info';

  display(message: string) {
    // Logic to display the notification message
    // You can customize styles or classes based on notificationType
    console.log(`${this.notificationType}: ${message}`); // For demonstration
    // You can implement further UI logic to show the notification in the view.
  }
}


