import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, Observable, throwError } from 'rxjs';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';
import { environment } from 'src/environments/environment.prod';
import { AddressDTO, BanksDTO, CompanyDTO, CustomerDTO, DiscountAndChargesDTO, IndustryDTO, ItemsDTO, QuotationDTO } from '../../domain/quotation.dto';

@Injectable({
  providedIn: 'root'
})
export class QuotationService {

  constructor(private http: HttpClient, private navigationLink: NavigationLinksService, private router: Router) {  }


// quotation==============================================================================================================================
  createQuotation(data: any): Observable<any> {
    console.log((this.getBaseApiUrl() + "/x/api/v2/sales/quotation"+"---"+JSON.stringify(data)))

    return this.http
        .post<any>(this.getBaseApiUrl() + "/x/api/v2/sales/quotation", data)
        .pipe(catchError(this.handleError));
  }

  getQuotation(data: string): Observable<any> {
    console.log((this.getBaseApiUrl() + "/x/api/v2/sales/quotation"+"---"+JSON.stringify(data)))

    return this.http
        .get<any>( this.getBaseApiUrl() + "/x/api/v2/sales/quotation" )
        .pipe(catchError(this.handleError));
  }

  getQuotationById (id: string): Observable<any> {
    console.log((this.getBaseApiUrl() + "/x/api/v2/sales/quotation"+"---"+JSON.stringify(id)))

    return this.http
        .get<any>( this.getBaseApiUrl() + `/x/api/v2/sales/quotation/${id}`)
        .pipe(catchError(this.handleError));
  }

  deleteQuotationById (id: string): Observable<any> {
    return this.http
    .delete<any>( this.getBaseApiUrl() + `/x/api/v2/sales/quotation/${id}` )
    .pipe(catchError(this.handleError));
  }

  updateQuotationById(data: QuotationDTO): Observable<any> {
    return this.http
    .put<any>( this.getBaseApiUrl() + `/x/api/v2/sales/quotation/${data.id}`, data )
    .pipe(catchError(this.handleError));
  }
// quotation==============================================================================================================================


// Customer==================================================================================================================================
createCustomer(data: any): Observable<any> {
  console.log((this.getBaseApiUrl() + "/x/api/v2/sales/customer"+"---"+JSON.stringify(data)))

  return this.http
      .post<any>(this.getBaseApiUrl() + "/x/api/v2/sales/customer", data)
      .pipe(catchError(this.handleError));
}

getCustomer(): Observable<CustomerDTO[]> {
  // console.log((this.getBaseApiUrl() + "/x/api/v2/sales/customer"+"-GEt info--"+JSON.stringify()))

  return this.http
      .get<CustomerDTO[]>( this.getBaseApiUrl() + "/x/api/v2/sales/customer" )
      .pipe(catchError(this.handleError));
}

getCustomerById (id: any): Observable<CustomerDTO> {
  console.log((this.getBaseApiUrl() + `/x/api/v2/sales/customer/${id}`+"--byID-"+JSON.stringify(id)))

  return this.http
      .get<CustomerDTO>( this.getBaseApiUrl() + `/x/api/v2/sales/customer/${id}`)
      .pipe(catchError(this.handleError));
}

deleteCustomerById (id: string): Observable<any> {
  return this.http
  .delete<any>( this.getBaseApiUrl() + `/x/api/v2/sales/customer/${id}` )
  .pipe(catchError(this.handleError));
}

updateCustomerById(data: CustomerDTO): Observable<any> {
  return this.http
  .put<any>( this.getBaseApiUrl() + `/x/api/v2/sales/customer/${data.id}`, data )
  .pipe(catchError(this.handleError));
}
// Customer==================================================================================================================================


// Company==================================================================================================================================
createCompany(data: any): Observable<any> {
  console.log((this.getBaseApiUrl() + "/x/api/v2/sales/company"+"---"+JSON.stringify(data)))

  return this.http
      .post<any>(this.getBaseApiUrl() + "/x/api/v2/sales/company", data)
      .pipe(catchError(this.handleError));
}

getCompany(data: string): Observable<any> {
  console.log((this.getBaseApiUrl() + "/x/api/v2/sales/company"+"---"+JSON.stringify(data)))

  return this.http
      .get<any>( this.getBaseApiUrl() + "/x/api/v2/sales/company" )
      .pipe(catchError(this.handleError));
}

getCompanyById (id: any): Observable<any> {
  console.log((this.getBaseApiUrl() + "/x/api/v2/sales/company"+"---"+JSON.stringify(id)))

  return this.http
      .get<any>( this.getBaseApiUrl() + `/x/api/v2/sales/company/${id}`)
      .pipe(catchError(this.handleError));
}

deleteCompanyById (id: string): Observable<any> {
  return this.http
  .delete<any>( this.getBaseApiUrl() + `/x/api/v2/sales/company/${id}` )
  .pipe(catchError(this.handleError));
}

updateCompanyById(data: CompanyDTO): Observable<any> {
  return this.http
  .put<any>( this.getBaseApiUrl() + `/x/api/v2/sales/company/${data.id}`, data )
  .pipe(catchError(this.handleError));
}
// Company==================================================================================================================================

// Address==================================================================================================================================
createAddress(data: any): Observable<any> {
  console.log((this.getBaseApiUrl() + "/x/api/v2/sales/address"+"---"+JSON.stringify(data)))

  return this.http
      .post<any>(this.getBaseApiUrl() + "/x/api/v2/sales/address", data)
      .pipe(catchError(this.handleError));
}

getAddress(data: string): Observable<any> {
  console.log((this.getBaseApiUrl() + "/x/api/v2/sales/address"+"---"+JSON.stringify(data)))

  return this.http
      .get<any>( this.getBaseApiUrl() + "/x/api/v2/sales/address" )
      .pipe(catchError(this.handleError));
}

getAddressById (id: string): Observable<any> {
  console.log((this.getBaseApiUrl() + "/x/api/v2/sales/address"+"---"+JSON.stringify(id)))

  return this.http
      .get<any>( this.getBaseApiUrl() + `/x/api/v2/sales/address/${id}`)
      .pipe(catchError(this.handleError));
}

deleteAddressById (id: string): Observable<any> {
  return this.http
  .delete<any>( this.getBaseApiUrl() + `/x/api/v2/sales/address/${id}` )
  .pipe(catchError(this.handleError));
}

updateAddressById(data: AddressDTO): Observable<any> {
  return this.http
  .put<any>( this.getBaseApiUrl() + `/x/api/v2/sales/address/${data.id}`, data )
  .pipe(catchError(this.handleError));
}
// Address==================================================================================================================================



// Bank==================================================================================================================================
createBank(data: any): Observable<any> {
  console.log((this.getBaseApiUrl() + "/x/api/v2/sales/bank"+"---"+JSON.stringify(data)))

  return this.http
      .post<any>(this.getBaseApiUrl() + "/x/api/v2/sales/bank", data)
      .pipe(catchError(this.handleError));
}

getBank(data: string): Observable<any> {
  console.log((this.getBaseApiUrl() + "/x/api/v2/sales/bank"+"---"+JSON.stringify(data)))

  return this.http
      .get<any>( this.getBaseApiUrl() + "/x/api/v2/sales/bank" )
      .pipe(catchError(this.handleError));
}

getBankById (id: string): Observable<any> {
  console.log((this.getBaseApiUrl() + "/x/api/v2/sales/bank"+"---"+JSON.stringify(id)))

  return this.http
      .get<any>( this.getBaseApiUrl() + `/x/api/v2/sales/bank/${id}`)
      .pipe(catchError(this.handleError));
}

deleteBankById (id: string): Observable<any> {
  return this.http
  .delete<any>( this.getBaseApiUrl() + `/x/api/v2/sales/bank/${id}` )
  .pipe(catchError(this.handleError));
}

updateBankById(data: BanksDTO): Observable<any> {
  return this.http
  .put<any>( this.getBaseApiUrl() + `/x/api/v2/sales/bank/${data.id}`, data )
  .pipe(catchError(this.handleError));
}
// Bank==================================================================================================================================

// Discount-&-Charges==================================================================================================================================
createDiscountAndCharges(data: any): Observable<any> {
  console.log((this.getBaseApiUrl() + "/x/api/v2/sales/discountAndCharges"+"---"+JSON.stringify(data)))

  return this.http
      .post<any>(this.getBaseApiUrl() + "/x/api/v2/sales/discountAndCharges", data)
      .pipe(catchError(this.handleError));
}

getDiscountAndCharges(data: string): Observable<any> {
  console.log((this.getBaseApiUrl() + "/x/api/v2/sales/discountAndCharges"+"---"+JSON.stringify(data)))

  return this.http
      .get<any>( this.getBaseApiUrl() + "/x/api/v2/sales/discountAndCharges" )
      .pipe(catchError(this.handleError));
}

getDiscountAndChargesById (id: string): Observable<any> {
  console.log((this.getBaseApiUrl() + "/x/api/v2/sales/discountAndCharges"+"---"+JSON.stringify(id)))

  return this.http
      .get<any>( this.getBaseApiUrl() + `/x/api/v2/sales/discountAndCharges/${id}`)
      .pipe(catchError(this.handleError));
}

deleteDiscountAndChargesById (id: string): Observable<any> {
  return this.http
  .delete<any>( this.getBaseApiUrl() + `/x/api/v2/sales/discountAndCharges/${id}` )
  .pipe(catchError(this.handleError));
}

updateDiscountAndChargesById(data: DiscountAndChargesDTO): Observable<any> {
  return this.http
  .put<any>( this.getBaseApiUrl() + `/x/api/v2/sales/discountAndCharges/${data.id}`, data )
  .pipe(catchError(this.handleError));
}
// Discount-&-Charges==================================================================================================================================

// Industry==================================================================================================================================
createIndustry(data: IndustryDTO): Observable<any> {
  console.log((this.getBaseApiUrl() + "/x/api/v2/sales/industry"+"---"+JSON.stringify(data)))

  return this.http
      .post<any>(this.getBaseApiUrl() + "/x/api/v2/sales/industry", data)
      .pipe(catchError(this.handleError));
}

getIndustry(data: IndustryDTO): Observable<any> {
  console.log((this.getBaseApiUrl() + "/x/api/v2/sales/industry"+"---"+JSON.stringify(data)))

  return this.http
      .get<any>( this.getBaseApiUrl() + "/x/api/v2/sales/industry" )
      .pipe(catchError(this.handleError));
}

getIndustryById (data: IndustryDTO): Observable<any> {
  console.log((this.getBaseApiUrl() + "/x/api/v2/sales/industry"+"---"+JSON.stringify(data.id)))

  return this.http
      .get<any>( this.getBaseApiUrl() + `/x/api/v2/sales/industry/${data.id}`)
      .pipe(catchError(this.handleError));
}

deleteIndustryById (data: IndustryDTO): Observable<any> {
  return this.http
  .delete<any>( this.getBaseApiUrl() + `/x/api/v2/sales/industry/${data.id}` )
  .pipe(catchError(this.handleError));
}

updateIndustryById(data: IndustryDTO): Observable<any> {
  return this.http
  .put<any>( this.getBaseApiUrl() + `/x/api/v2/sales/industry/${data.id}`, data )
  .pipe(catchError(this.handleError));
}
// Bank==================================================================================================================================


// Item==================================================================================================================================
createItem(data: any): Observable<any> {
  console.log((this.getBaseApiUrl() + "/x/api/v2/sales/item"+"---"+JSON.stringify(data)))

  return this.http
      .post<any>(this.getBaseApiUrl() + "/x/api/v2/sales/item", data)
      .pipe(catchError(this.handleError));
}

getItem(data: string): Observable<any> {
  console.log((this.getBaseApiUrl() + "/x/api/v2/sales/item"+"---"+JSON.stringify(data)))

  return this.http
      .get<any>( this.getBaseApiUrl() + "/x/api/v2/sales/item" )
      .pipe(catchError(this.handleError));
}

getItemById (id: string): Observable<any> {
  console.log((this.getBaseApiUrl() + "/x/api/v2/sales/item"+"---"+JSON.stringify(id)))

  return this.http
      .get<any>( this.getBaseApiUrl() + `/x/api/v2/sales/item/${id}`)
      .pipe(catchError(this.handleError));
}

deleteItemById (id: string): Observable<any> {
  return this.http
  .delete<any>( this.getBaseApiUrl() + `/x/api/v2/sales/item/${id}` )
  .pipe(catchError(this.handleError));
}

updateItemById(data: ItemsDTO): Observable<any> {
  return this.http
  .put<any>( this.getBaseApiUrl() + `/x/api/v2/sales/item/${data.id}`, data )
  .pipe(catchError(this.handleError));
}
// Item==================================================================================================================================




















  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
  
  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
        console.error("An error occurred:", error.error.message);
    } else {
        console.error(
            `Backend returned code ${error.status}, ` +
                `body was: ${JSON.stringify(error.error)}`
        );
    }
    return throwError(`${error.status}`);
    // 'Something bad happened; please try again later.');
  }
































  private itemSubject: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);

  getItem1(): Observable<any[]> {
    return this.itemSubject.asObservable();
  }

  addItem(item: any) {
    const currentItem = this.itemSubject.value;
    item.id = Date.now().toString();
    this.itemSubject.next([...currentItem, item]);
  }

  updateItem(item: any) {
    const currentItem = this.itemSubject.value.map(i => (i.id === item.id ? item : i));
    this.itemSubject.next(currentItem);
  }

  deleteItem(id: string) {
    const currentItem = this.itemSubject.value.filter(i => i.id !== id);
    this.itemSubject.next(currentItem);
  }

  getItemById1(id: string): any {
    return this.itemSubject.value.find(i => i.id === id);
  }
}
