import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { DropdownService } from '../../services/dropdown/dropdown.service';
import { MatDialogRef } from '@angular/material/dialog';


@Component({
  selector: 'app-configure-tax-popup',
  templateUrl: './configure-tax-popup.component.html',
  styleUrl: './configure-tax-popup.component.scss'
})
export class ConfigureTaxPopupComponent {

  constructor(private dropdownService: DropdownService, public dialogRef: MatDialogRef<ConfigureTaxPopupComponent>){}


  taxList = [
    'TAX',
    'VAT'
   ]
   configureTax = this.taxList;

   isDropdownOpen$(id: string) {
    return this.dropdownService.isDropdownOpen$(id);
  }

  getSelectedItem$(id: string): Observable<string | null> {
    return this.dropdownService.getSelectedItem$(id);
  }

  toggleDropdown(id: string) {
    this.dropdownService.toggleDropdown(id);
  }

  selectItem(id: string, item: string) {
    this.dropdownService.selectItem(id, item);
  }

  saveChanges(): void {
    // Save changes logic
    this.dialogRef.close();
  }
}
