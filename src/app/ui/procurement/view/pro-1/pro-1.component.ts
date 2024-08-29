import { Component, ComponentRef, ViewChild, ViewContainerRef } from '@angular/core';
import { AddProComponent } from '../add-pro/add-pro.component';
export interface Item {
  id: number;
  name: string;
}
@Component({
  selector: 'app-pro-1',
  templateUrl: './pro-1.component.html',
  styleUrl: './pro-1.component.scss'
})
export class Pro1Component {
  @ViewChild('container', { read: ViewContainerRef }) container!: ViewContainerRef;
  componentRef!: ComponentRef<AddProComponent>;

  showPro1: boolean = true;

  addPro() {
    this.showPro1 = false
    this.container.clear();  // Optionally clear the container if you want only one component at a time.
    this.componentRef = this.container.createComponent(AddProComponent);
    this.componentRef.instance.back.subscribe(() => this.showpro1Again());
    this.componentRef.instance.isEdit = false;
    this.componentRef.instance.addItem.subscribe((item: Item) => this.addItem(item));
  }

  showpro1Again(){
    this.showPro1 = true;
    this.container.clear(); 
  }

  items: Item[] = [];

  addItem(item: Item) {
    this.items.push(item);
  }

  editItem(item: Item) {
    this.showPro1 = false;
    this.container.clear();
    this.componentRef = this.container.createComponent(AddProComponent);
    this.componentRef.instance.isEdit = true; // Editing item
    this.componentRef.instance.newItem = { ...item }; // Pass the item to edit
    this.componentRef.instance.back.subscribe(() => this.showpro1Again());
    this.componentRef.instance.addItem.subscribe((updatedItem: Item) => this.updateItem(updatedItem));
  }
  updateItem(updatedItem: Item) {
    const index = this.items.findIndex(item => item.id === updatedItem.id);
    if (index !== -1) {
      this.items[index] = updatedItem;
    }
  }


  deleteItem(item: Item) {
    this.items = this.items.filter(i => i.id !== item.id);
  }

  viewItem(item: Item) {
    // Implement your view logic here
    console.log('View item:', item);
  }
}
