import { Pipe, PipeTransform } from '@angular/core';
import { Order } from '../models/interface';

@Pipe({
  name: 'orderFilter'
})
export class OrderFilterPipe implements PipeTransform {

  transform(orders: Order[], searchText: string, statusFilter: string): Order[] {
    if (!orders) return [];
    
    let filteredOrders = orders;
    
    // Filter by status
    if (statusFilter && statusFilter !== 'ALL') {
      filteredOrders = filteredOrders.filter(order => order.orderStatus === statusFilter);
    }
    
    // Filter by search text
    if (searchText) {
      searchText = searchText.toLowerCase();
      filteredOrders = filteredOrders.filter(order => 
        order.orderNumber.toLowerCase().includes(searchText) || 
        order.customer.name.toLowerCase().includes(searchText)
      );
    }
    
    return filteredOrders;
  }
}
