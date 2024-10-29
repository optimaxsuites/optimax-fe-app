import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-cart-item-card',
  templateUrl: './cart-item-card.component.html',
  styleUrl: './cart-item-card.component.scss'
})
export class CartItemCardComponent {
  @Input() item: any ;
  @Input() showDelete: boolean = true;
  @Output() delete = new EventEmitter<void>();
  @Output() countChange = new EventEmitter<number>();
  @Output() updateItem = new EventEmitter<number>();


  // count: number = this.item.count

  decreaseCount() {
    if(this.item.count> 0){
      this.item.count--

    }
  this.emitCountChange();
 }
 increaseCount() {

  this.item.count ++
  this.emitCountChange();
 }

 private emitCountChange() {
  this.countChange.emit( this.item.count );
}


 onDelete() {
  this.delete.emit();
}
onCountChange(newCount: number) {
  this.countChange.emit( newCount ); 
}

onClick(){
  this.updateItem.emit( this.item.id );
}
}
