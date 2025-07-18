import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { supplierData, ProductData } from '../../../models/interface';
import { PosServiceService } from '../../../service/pos-service.service';

@Component({
  selector: 'app-information',
  templateUrl: './information.component.html',
  styleUrl: './information.component.scss',
})
export class InformationComponent implements OnChanges {
  @Input() productId: number | null = null;
  product: ProductData | null = null;
  supplier: supplierData | null = null;
  @Output() close = new EventEmitter<void>();

  constructor(private posService: PosServiceService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productId'] && this.productId) {
      this.fetchProductAndSupplier();
    }
  }

  fetchProductAndSupplier() {
    this.posService.getProductById(this.productId!).subscribe((product) => {
      this.product = product;
      if (product.supplier && product.supplier.id) {
        this.posService.getSupplier().subscribe((suppliers) => {
          this.supplier =
            suppliers.find((s: supplierData) => s.id === product.supplier.id) ||
            null;
        });
      }
    });
  }

  goBack() {
    this.close.emit();
  }
}
