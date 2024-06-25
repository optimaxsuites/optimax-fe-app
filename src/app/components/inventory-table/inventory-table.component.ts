import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryService } from '../../services/inventory/inventory.service';
import { Observable } from 'rxjs';
import { DropdownService } from '../../services/dropdown/dropdown.service';
import { InventoryItem } from '../../interface/data';

@Component({
  selector: 'app-inventory-table',
  templateUrl: './inventory-table.component.html',
  styleUrl: './inventory-table.component.scss'
})
export class InventoryTableComponent implements OnInit{


  // sidebarVisible2: boolean = false;
  // // selectedItem: any; // Holds the selected item for displaying details in the sidebar
  // // inventory: any[] = [];
  // selectedCurrency$: Observable<string | null>;
  // items: InventoryItem[] = [];

  // constructor(
  //   private router: Router,
  //   private inventoryService: InventoryService,
  //   private dropdownService: DropdownService
    
  // ) {
  //   this.selectedCurrency$ = this.dropdownService.getSelectedItem$('currency');
  // }

  // // ngOnInit() {
  // //   this.inventoryService.getItem().subscribe(data => {
  // //     this.items = data;
  // //     // this.items = [
  // //     //   {
  // //     //     id: "NLJEYduajI",
  // //     //     itemName: "ONeTLyjObcjpaXo",
  // //     //     partNo: "RNaTnbTq",
  // //     //     taxRate: 15.95,
  // //     //     description: "mnycpLmAcwStjWZYnmYHFwwSseENHgOfQWuDDFQACRfyCRYfFx",
  // //     //     images: [
  // //     //       "https://example.com/image72.jpg",
  // //     //       "https://example.com/image56.jpg",
  // //     //       "https://example.com/image11.jpg",
  // //     //       "https://example.com/image70.jpg",
  // //     //       "https://example.com/image54.jpg"
  // //     //     ],
  // //     //     buyingPrice: 420.35,
  // //     //     sellingPrice: 278.93,
  // //     //     initialStock: 452,
  // //     //     totalSoldQuantity: 931,
  // //     //     totalPurchaseQuantity: 121
  // //     //   },
  // //     //   {
  // //     //     id: "NOTxFkTHyY",
  // //     //     itemName: "EEjrYbOYlACBlkl",
  // //     //     partNo: "DfzaZdqU",
  // //     //     taxRate: 4.32,
  // //     //     description: "mPXTUeEURJlWEtlxmukqHkPHCgtOFOmmNQMaUwqowNUQgiYivU",
  // //     //     images: [
  // //     //       "https://example.com/image81.jpg",
  // //     //       "https://example.com/image9.jpg",
  // //     //       "https://example.com/image98.jpg",
  // //     //       "https://example.com/image57.jpg",
  // //     //       "https://example.com/image40.jpg"
  // //     //     ],
  // //     //     buyingPrice: 274.2,
  // //     //     sellingPrice: 389.36,
  // //     //     initialStock: 475,
  // //     //     totalSoldQuantity: 38,
  // //     //     totalPurchaseQuantity: 269
  // //     //   },
  // //     //   {
  // //     //     id: "TDNRqRQqAp",
  // //     //     itemName: "eslXMmjLWhFZFvk",
  // //     //     partNo: "VGCdbKeY",
  // //     //     taxRate: 4.25,
  // //     //     description: "VmRaylUltJUwqZCfXNhkuBefWNEabRGJrnKdDWKqisqJozkezd",
  // //     //     images: [
  // //     //       "https://example.com/image33.jpg",
  // //     //       "https://example.com/image60.jpg",
  // //     //       "https://example.com/image37.jpg",
  // //     //       "https://example.com/image31.jpg",
  // //     //       "https://example.com/image41.jpg"
  // //     //     ],
  // //     //     buyingPrice: 359.89,
  // //     //     sellingPrice: 130.1,
  // //     //     initialStock: 358,
  // //     //     totalSoldQuantity: 739,
  // //     //     totalPurchaseQuantity: 382
  // //     //   },
  // //     //   {
  // //     //     id: "PMQosMqezo",
  // //     //     itemName: "YYVYefASoRouuFR",
  // //     //     partNo: "PeCduJwT",
  // //     //     taxRate: 19.0,
  // //     //     description: "lQgzyOLaYHtGUgoHAFhRcQYrzFJzRMsJMSYebxOTGhMHkoqOwN",
  // //     //     images: [
  // //     //       "https://example.com/image21.jpg",
  // //     //       "https://example.com/image9.jpg",
  // //     //       "https://example.com/image97.jpg",
  // //     //       "https://example.com/image45.jpg",
  // //     //       "https://example.com/image36.jpg"
  // //     //     ],
  // //     //     buyingPrice: 189.56,
  // //     //     sellingPrice: 404.03,
  // //     //     initialStock: 41,
  // //     //     totalSoldQuantity: 151,
  // //     //     totalPurchaseQuantity: 988
  // //     //   },
  // //     //   {
  // //     //     id: "oVLejHeqGb",
  // //     //     itemName: "zbZCjHFDhDUFlkE",
  // //     //     partNo: "qQIdERze",
  // //     //     taxRate: 18.9,
  // //     //     description: "HRkRNgwTLFhXCMOKLxwpJOtbffoCVpDJbkZwxKyYwIQCzPrzMI",
  // //     //     images: [
  // //     //       "https://example.com/image7.jpg",
  // //     //       "https://example.com/image12.jpg",
  // //     //       "https://example.com/image18.jpg",
  // //     //       "https://example.com/image1.jpg",
  // //     //       "https://example.com/image25.jpg"
  // //     //     ],
  // //     //     buyingPrice: 158.89,
  // //     //     sellingPrice: 165.1,
  // //     //     initialStock: 616,
  // //     //     totalSoldQuantity: 689,
  // //     //     totalPurchaseQuantity: 489
  // //     //   },
  // //     //   {
  // //     //     id: "xqnsPouIYY",
  // //     //     itemName: "fLKqIhFNVQPgbeT",
  // //     //     partNo: "tQkmsICz",
  // //     //     taxRate: 1.23,
  // //     //     description: "apMDFZYqiZqOqscahNlUYycCEqaZHkEnfgKaSraPFYbtyJZaJF",
  // //     //     images: [
  // //     //       "https://example.com/image34.jpg",
  // //     //       "https://example.com/image63.jpg",
  // //     //       "https://example.com/image35.jpg",
  // //     //       "https://example.com/image54.jpg",
  // //     //       "https://example.com/image32.jpg"
  // //     //     ],
  // //     //     buyingPrice: 371.18,
  // //     //     sellingPrice: 497.54,
  // //     //     initialStock: 198,
  // //     //     totalSoldQuantity: 222,
  // //     //     totalPurchaseQuantity: 76
  // //     //   },
  // //     //   {
  // //     //     id: "hOLWKwHelS",
  // //     //     itemName: "NgqvVNRNBkNHQyB",
  // //     //     partNo: "PJrsMUFD",
  // //     //     taxRate: 19.28,
  // //     //     description: "eRnziArjaSEUqzkMGyAUeFOVWVQxUkNyoWpcUolvGnmMgcWLeY",
  // //     //     images: [
  // //     //       "https://example.com/image34.jpg",
  // //     //       "https://example.com/image22.jpg",
  // //     //       "https://example.com/image25.jpg",
  // //     //       "https://example.com/image71.jpg",
  // //     //       "https://example.com/image48.jpg"
  // //     //     ],
  // //     //     buyingPrice: 141.41,
  // //     //     sellingPrice: 125.23,
  // //     //     initialStock: 226,
  // //     //     totalSoldQuantity: 175,
  // //     //     totalPurchaseQuantity: 962
  // //     //   },
  // //     //   {
  // //     //     id: "yxVAtfuAxk",
  // //     //     itemName: "yoAEogGmXhBwFlh",
  // //     //     partNo: "WdzAmhLZ",
  // //     //     taxRate: 6.67,
  // //     //     description: "xQyzVhTnoHQaQLrfXvxhJUlGpMvrNvjZINeHqnwHWltHJlVgVC",
  // //     //     images: [
  // //     //       "https://example.com/image86.jpg",
  // //     //       "https://example.com/image27.jpg",
  // //     //       "https://example.com/image39.jpg",
  // //     //       "https://example.com/image100.jpg",
  // //     //       "https://example.com/image3.jpg"
  // //     //     ],
  // //     //     buyingPrice: 268.66,
  // //     //     sellingPrice: 49.89,
  // //     //     initialStock: 946,
  // //     //     totalSoldQuantity: 250,
  // //     //     totalPurchaseQuantity: 258
  // //     //   },
  // //     //   {
  // //     //     id: "ExqdAivhkh",
  // //     //     itemName: "NswzTwnBFvxFXID",
  // //     //     partNo: "RwOocdwW",
  // //     //     taxRate: 14.48,
  // //     //     description: "mWqWiVfOcPbLnbIDySGrBpkUQWYANwezSpwnoUdiTxDFyBlCvs",
  // //     //     images: [
  // //     //       "https://example.com/image62.jpg",
  // //     //       "https://example.com/image61.jpg",
  // //     //       "https://example.com/image85.jpg",
  // //     //       "https://example.com/image30.jpg",
  // //     //       "https://example.com/image87.jpg"
  // //     //     ],
  // //     //     buyingPrice: 172.93,
  // //     //     sellingPrice: 128.18,
  // //     //     initialStock: 944,
  // //     //     totalSoldQuantity: 213,
  // //     //     totalPurchaseQuantity: 769
  // //     //   },
  // //     //   {
  // //     //     id: "yYztVCNEUI",
  // //     //     itemName: "zFezOTjqgVjOigK",
  // //     //     partNo: "IpjOkKlB",
  // //     //     taxRate: 18.64,
  // //     //     description: "cxIQYdHeVufayZUgSIXmnEghsKfGlhNsAaYpFoCZdWMTvFDZyN",
  // //     //     images: [
  // //     //       "https://example.com/image52.jpg",
  // //     //       "https://example.com/image63.jpg",
  // //     //       "https://example.com/image98.jpg",
  // //     //       "https://example.com/image71.jpg",
  // //     //       "https://example.com/image79.jpg"
  // //     //     ],
  // //     //     buyingPrice: 208.62,
  // //     //     sellingPrice: 286.59,
  // //     //     initialStock: 657,
  // //     //     totalSoldQuantity: 210,
  // //     //     totalPurchaseQuantity: 679
  // //     //   },
  // //     //   {
  // //     //     id: "mEWHMTCNmY",
  // //     //     itemName: "hKnhBvFSiFOvVcP",
  // //     //     partNo: "GGjltdIY",
  // //     //     taxRate: 1.84,
  // //     //     description: "dXHyAHkXuodnZmHIMwDYpfmbUHVfctEnBWUySMViyocwQvHEGm",
  // //     //     images: [
  // //     //       "https://example.com/image45.jpg",
  // //     //       "https://example.com/image24.jpg",
  // //     //       "https://example.com/image29.jpg",
  // //     //       "https://example.com/image78.jpg",
  // //     //       "https://example.com/image14.jpg"
  // //     //     ],
  // //     //     buyingPrice: 384.73,
  // //     //     sellingPrice: 182.62,
  // //     //     initialStock: 421,
  // //     //     totalSoldQuantity: 545,
  // //     //     totalPurchaseQuantity: 333
  // //     //   },
  // //     //   {
  // //     //     id: "ptEocnsadV",
  // //     //     itemName: "KmjPKuIFSYjDyQR",
  // //     //     partNo: "mImXBIkE",
  // //     //     taxRate: 18.15,
  // //     //     description: "rWLoEkDlFQffmseMYlziMbqAZadxnHBNWboEXFnxrMrxFdoRey",
  // //     //     images: [
  // //     //       "https://example.com/image96.jpg",
  // //     //       "https://example.com/image71.jpg",
  // //     //       "https://example.com/image52.jpg",
  // //     //       "https://example.com/image13.jpg",
  // //     //       "https://example.com/image23.jpg"
  // //     //     ],
  // //     //     buyingPrice: 47.77,
  // //     //     sellingPrice: 85.7,
  // //     //     initialStock: 860,
  // //     //     totalSoldQuantity: 425,
  // //     //     totalPurchaseQuantity: 990
  // //     //   },
  // //     //   {
  // //     //     id: "fbdmUgyCQs",
  // //     //     itemName: "HqvHHxfUSmEuvrJ",
  // //     //     partNo: "mftNoDCV",
  // //     //     taxRate: 4.16,
  // //     //     description: "KhsVvLscRSzANaRLpiRJuwPxUpDdrGcZnsEutHzqRSxCjMDKnE",
  // //     //     images: [
  // //     //       "https://example.com/image76.jpg",
  // //     //       "https://example.com/image75.jpg",
  // //     //       "https://example.com/image25.jpg",
  // //     //       "https://example.com/image78.jpg",
  // //     //       "https://example.com/image55.jpg"
  // //     //     ],
  // //     //     buyingPrice: 117.89,
  // //     //     sellingPrice: 409.31,
  // //     //     initialStock: 153,
  // //     //     totalSoldQuantity: 720,
  // //     //     totalPurchaseQuantity: 708
  // //     //   },
  // //     //   {
  // //     //     id: "OtkQQApgtK",
  // //     //     itemName: "SEwzUvVCcDdqmuR",
  // //     //     partNo: "MZPfekHK",
  // //     //     taxRate: 3.65,
  // //     //     description: "FsxLCmbdARFWUFEahucOpBQBeUlmXyRmcCtGMeYaHyrBAWEQyG",
  // //     //     images: [
  // //     //       "https://example.com/image15.jpg",
  // //     //       "https://example.com/image10.jpg",
  // //     //       "https://example.com/image82.jpg",
  // //     //       "https://example.com/image92.jpg",
  // //     //       "https://example.com/image47.jpg"
  // //     //     ],
  // //     //     buyingPrice: 282.33,
  // //     //     sellingPrice: 348.27,
  // //     //     initialStock: 843,
  // //     //     totalSoldQuantity: 794,
  // //     //     totalPurchaseQuantity: 187
  // //     //   },
  // //     //   {
  // //     //     id: "HywPLQUFTg",
  // //     //     itemName: "oknGhLpdATbvDbx",
  // //     //     partNo: "jMHWwUbg",
  // //     //     taxRate: 8.11,
  // //     //     description: "HTRXiylfYWURrnppbVbfSOWnIJkNyweXhUvMEqeyXgPYjPyRuL",
  // //     //     images: [
  // //     //       "https://example.com/image92.jpg",
  // //     //       "https://example.com/image63.jpg",
  // //     //       "https://example.com/image21.jpg",
  // //     //       "https://example.com/image49.jpg",
  // //     //       "https://example.com/image5.jpg"
  // //     //     ],
  // //     //     buyingPrice: 90.21,
  // //     //     sellingPrice: 346.44,
  // //     //     initialStock: 45,
  // //     //     totalSoldQuantity: 199,
  // //     //     totalPurchaseQuantity: 164
  // //     //   },
  // //     //   {
  // //     //     id: "EqNxAJSBoQ",
  // //     //     itemName: "BfSVEkkakdUHsmi",
  // //     //     partNo: "VVWaRRHe",
  // //     //     taxRate: 4.24,
  // //     //     description: "IaHyTbCFlNTqhbWxBpsXZOGbXKJmnebtXJgnKRLFFJGYYgkEZd",
  // //     //     images: [
  // //     //       "https://example.com/image36.jpg",
  // //     //       "https://example.com/image24.jpg",
  // //     //       "https://example.com/image65.jpg",
  // //     //       "https://example.com/image88.jpg",
  // //     //       "https://example.com/image5.jpg"
  // //     //     ],
  // //     //     buyingPrice: 381.64,
  // //     //     sellingPrice: 29.15,
  // //     //     initialStock: 438,
  // //     //     totalSoldQuantity: 725,
  // //     //     totalPurchaseQuantity: 464
  // //     //   },
  // //     //   {
  // //     //     id: "LfMtfDpcPx",
  // //     //     itemName: "hWyDqwCxvQLhJkX",
  // //     //     partNo: "KXBoAjoV",
  // //     //     taxRate: 0.61,
  // //     //     description: "SzptFZqRDFAqxZZVrQYIkOVcPCCgPAfQuwImfXUEyazVsIDGgP",
  // //     //     images: [
  // //     //       "https://example.com/image34.jpg",
  // //     //       "https://example.com/image41.jpg",
  // //     //       "https://example.com/image80.jpg",
  // //     //       "https://example.com/image83.jpg",
  // //     //       "https://example.com/image9.jpg"
  // //     //     ],
  // //     //     buyingPrice: 248.52,
  // //     //     sellingPrice: 66.99,
  // //     //     initialStock: 769,
  // //     //     totalSoldQuantity: 780,
  // //     //     totalPurchaseQuantity: 943
  // //     //   },
  // //     //   {
  // //     //     id: "mFfmsQUWTX",
  // //     //     itemName: "BSBJeVEtrMWGjAV",
  // //     //     partNo: "UQHmvMpi",
  // //     //     taxRate: 2.45,
  // //     //     description: "tfvAWCnYXaVIqZkwIXLSqvgHJvwcEkbSCmLoHLsGrDgeozgQUU",
  // //     //     images: [
  // //     //       "https://example.com/image10.jpg",
  // //     //       "https://example.com/image92.jpg",
  // //     //       "https://example.com/image49.jpg",
  // //     //       "https://example.com/image94.jpg",
  // //     //       "https://example.com/image1.jpg"
  // //     //     ],
  // //     //     buyingPrice: 83.94,
  // //     //     sellingPrice: 108.65,
  // //     //     initialStock: 429,
  // //     //     totalSoldQuantity: 890,
  // //     //     totalPurchaseQuantity: 917
  // //     //   },
  // //     //   {
  // //     //     id: "Tovbdtwsgd",
  // //     //     itemName: "yiUbrRaTHuFSFrI",
  // //     //     partNo: "tOqjAgUg",
  // //     //     taxRate: 18.61,
  // //     //     description: "fTjqYjYOIsBctKIFhMwMpfMVLOaFvAnGZBeDGmCixgnPYNCiNw",
  // //     //     images: [
  // //     //       "https://example.com/image94.jpg",
  // //     //       "https://example.com/image4.jpg",
  // //     //       "https://example.com/image25.jpg",
  // //     //       "https://example.com/image8.jpg",
  // //     //       "https://example.com/image91.jpg"
  // //     //     ],
  // //     //     buyingPrice: 246.83,
  // //     //     sellingPrice: 253.72,
  // //     //     initialStock: 201,
  // //     //     totalSoldQuantity: 858,
  // //     //     totalPurchaseQuantity: 432
  // //     //   },
  // //     //   {
  // //     //     id: "IYRWXDKDsm",
  // //     //     itemName: "zicEKgnEjBGrCIY",
  // //     //     partNo: "LVNvCXYU",
  // //     //     taxRate: 5.98,
  // //     //     description: "twWnUGPKbMDxyPgdVTXJwdYbkBPlaGfKkRNrmkZZcTNWiyUjDf",
  // //     //     images: [
  // //     //       "https://example.com/image3.jpg",
  // //     //       "https://example.com/image20.jpg",
  // //     //       "https://example.com/image38.jpg",
  // //     //       "https://example.com/image89.jpg",
  // //     //       "https://example.com/image21.jpg"
  // //     //     ],
  // //     //     buyingPrice: 474.79,
  // //     //     sellingPrice: 453.36,
  // //     //     initialStock: 348,
  // //     //     totalSoldQuantity: 228,
  // //     //     totalPurchaseQuantity: 442
  // //     //   }
  // //     // ];
      

  // //   });
    
  // // }


  // ngOnInit() {
  //   const savedItems = sessionStorage.getItem('items');
  //   if (savedItems) {
  //     this.items = JSON.parse(savedItems);
  //   } else {
  //     this.inventoryService.getItem().subscribe(data => {
  //       this.items = data;
  //       sessionStorage.setItem('items', JSON.stringify(this.items));
  //     });
  //   }
  // }

  // extractCurrencyCode(currency: string | null | undefined): string {
  //   if (!currency) return '';
  //   const match = currency.match(/\(([^)]+)\)/);
  //   return match ? match[1] : '';
  // }

  // navigateToForm() {
  //   this.router.navigate(['/inventory/inventory-form']);
  // }

  // editItem(id: string) {
  //   this.router.navigate(['/inventory/inventory-form', id]);
  // }

  // deleteItem(id: string) {
  //   this.inventoryService.deleteItem(id);
  // }
  // viewItem(item: any) {
  //   this.showDialog(item, 'right');
  // }
  
  
  
  // visible: boolean = false;
  // selectedItem: InventoryItem | null = null;
  // position: any = '';

  // showDialog(item: InventoryItem, position: string = 'right'): void {
  //   this.selectedItem = item;
  //   this.position = position;
  //   this.visible = true;
  // }





























  sidebarVisible2: boolean = false;
  selectedCurrency$: Observable<string | null>;
  items: InventoryItem[] = [];
  selectedItems!: InventoryItem;
  visible: boolean = false;
  selectedItem: InventoryItem | null = null;
  position: any = '';

  constructor(
    private router: Router,
    private inventoryService: InventoryService,
    private dropdownService: DropdownService
  ) {
    this.selectedCurrency$ = this.dropdownService.getSelectedItem$('currency');
  }

  ngOnInit() {
    this.inventoryService.getItem().subscribe(data => {
      this.items = data;
    });

  }

  extractCurrencyCode(currency: string | null | undefined): string {
    if (!currency) return '';
    const match = currency.match(/\(([^)]+)\)/);
    return match ? match[1] : '';
  }

  navigateToForm() {
    this.router.navigate(['/inventory/inventory-form']);
  }

  editItem(id: string) {
    this.router.navigate(['/inventory/inventory-form', id]);
  }
  deleteItem(id: string) {
    this.inventoryService.deleteItem(id);
  }


  // deleteItem(id: string) {
  //   this.inventoryService.deleteItem(id).subscribe(() => {
  //     this.items = this.items.filter(item => item.id !== id);
  //     this.saveItemsToSession();
  //   });
  // }

  viewItem(item: any) {
    this.showDialog(item, 'right');
  }

  showDialog(item: InventoryItem, position: string = 'right'): void {
    this.selectedItem = item;
    this.position = position;
    this.visible = true;
  }

}
