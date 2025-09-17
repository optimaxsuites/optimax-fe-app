import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../sharedComponents/service/environments/environment.prod';
import { AllowanceDTO, AllowanceTypeDTO, BonusDTO, BonusTypeDTO, DeductionsDTO, DeductionsTypeDTO, OvertimeDTO, OvertimeTypeDTO, SalaryDTO } from '../domain/salary.dto';

@Injectable({
  providedIn: 'root'
})
export class SalaryService {

  constructor(private http: HttpClient, ) { }
  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
  getAllSalaries(){
    return this.http
    .get<any>(this.getBaseApiUrl() + "/x/api/v2/hr/salaries")
    .pipe(catchError(this.handleError));
  }

  getAllSalaryById(id: number){
    return this.http
    .get<any>(this.getBaseApiUrl() + `/x/api/v2/hr/salaries/${id}`)
    .pipe(catchError(this.handleError));
  }


  updateSalary(id: number, data: SalaryDTO){
    return this.http
    .put<any>(this.getBaseApiUrl() + `/x/api/v2/hr/salaries/${id}`, data)
    .pipe(catchError(this.handleError));
  }

  addSalary(data: SalaryDTO){
    return this.http
    .post<any>(this.getBaseApiUrl() + `/x/api/v2/hr/salaries`, data)
    .pipe(catchError(this.handleError));
  }

  deleteSalry(id: number|undefined){
    return this.http
    .delete<any>(this.getBaseApiUrl() + `/x/api/v2/hr/salaries/${id}`)
    .pipe(catchError(this.handleError));
  }

  getAllAllowance(){
    return this.http
    .get<any>(this.getBaseApiUrl() + "/x/api/v2/hr/allowances")
    .pipe(catchError(this.handleError));
  }

  getAllBonus(){
    return this.http
    .get<any>(this.getBaseApiUrl() + "/x/api/v2/hr/bonuses")
    .pipe(catchError(this.handleError));
  }
  getAllDeductions(){
    return this.http
    .get<any>(this.getBaseApiUrl() + "/x/api/v2/hr/deductions")
    .pipe(catchError(this.handleError));
  }
  getAllOverTime(){
    return this.http
    .get<any>(this.getBaseApiUrl() + "/x/api/v2/hr/overtimes")
    .pipe(catchError(this.handleError));
  }

  addAllowance(data: AllowanceDTO){
    return this.http
    .post<any>(this.getBaseApiUrl() + "/x/api/v2/hr/allowances", data)
    .pipe(catchError(this.handleError));
  }
  

 addBonus(data: BonusDTO){
    return this.http
    .post<any>(this.getBaseApiUrl() + "/x/api/v2/hr/bonuses", data)
    .pipe(catchError(this.handleError));
  }
  addDeductions(data: DeductionsDTO){
    return this.http
    .post<any>(this.getBaseApiUrl() + "/x/api/v2/hr/deductions", data)
    .pipe(catchError(this.handleError));
  }

  addOverTime(data: OvertimeDTO){
    return this.http
    .post<any>(this.getBaseApiUrl() + "/x/api/v2/hr/overtimes", data)
    .pipe(catchError(this.handleError));
  }
  getAllAllowanceTypes(){
    return this.http
    .get<any>(this.getBaseApiUrl() + "/x/api/v2/hr/allowanceTypes?page=1&size=50")
    .pipe(catchError(this.handleError));
  }

  getAllBonusTypes(){
    return this.http
    .get<any>(this.getBaseApiUrl() + "/x/api/v2/hr/bonusTypes")
    .pipe(catchError(this.handleError));
  }
  getAllDeductionsTypes(){
    return this.http
    .get<any>(this.getBaseApiUrl() + "/x/api/v2/hr/deductionsTypes")
    .pipe(catchError(this.handleError));
  }
  getAllOverTimeTypes(){
    return this.http
    .get<any>(this.getBaseApiUrl() + "/x/api/v2/hr/overtimeTypes")
    .pipe(catchError(this.handleError));
  }

  addAllowanceType(data: AllowanceTypeDTO){
    return this.http
    .post<any>(this.getBaseApiUrl() + "/x/api/v2/hr/allowanceTypes", data)
    .pipe(catchError(this.handleError));
  }

 addBonusType(data: BonusTypeDTO){
    return this.http
    .post<any>(this.getBaseApiUrl() + "/x/api/v2/hr/bonusTypes", data)
    .pipe(catchError(this.handleError));
  }
  addDeductionsType(data: DeductionsTypeDTO){
    return this.http
    .post<any>(this.getBaseApiUrl() + "/x/api/v2/hr/deductionsTypes", data)
    .pipe(catchError(this.handleError));
  }

  addOverTimeType(data: OvertimeTypeDTO){
    return this.http
    .post<any>(this.getBaseApiUrl() + "/x/api/v2/hr/overtimeTypes", data)
    .pipe(catchError(this.handleError));
  }

  getAllowanceTypeById(id: number){
    return this.http
    .get<any>(this.getBaseApiUrl() + `/x/api/v2/hr/allowanceTypes/${id}`)
    .pipe(catchError(this.handleError));
  }

  getBonusTypesById(id: number){
    return this.http
    
    .get<any>(this.getBaseApiUrl() + `/x/api/v2/hr/bonusTypes/${id}`)
    .pipe(catchError(this.handleError));
  }
  getDeductionsTypesById(id: number){
    return this.http
    .get<any>(this.getBaseApiUrl() + `/x/api/v2/hr/deductionsTypes/${id}`)
    .pipe(catchError(this.handleError));
  }
  getOverTimeTypesById(id: number){
    return this.http
    .get<any>(this.getBaseApiUrl() + `/x/api/v2/hr/overtimeTypes/${id}`)
    .pipe(catchError(this.handleError));
  }

  deleteAllowanceType(id: number){
    return this.http
    .delete<any>(this.getBaseApiUrl() + `/x/api/v2/hr/allowanceTypes/${id}`)
    .pipe(catchError(this.handleError));
  }

  deleteBonusType(id: number){
    return this.http
    .delete<any>(this.getBaseApiUrl() + `/x/api/v2/hr/bonusTypes/${id}`)
    .pipe(catchError(this.handleError));
  }
  deleteDeductionsType(id: number){
    return this.http
    .delete<any>(this.getBaseApiUrl() + `/x/api/v2/hr/deductionsTypes/${id}`)
    .pipe(catchError(this.handleError));
  }
  deleteOverTimeType(id: number){
    return this.http
    .delete<any>(this.getBaseApiUrl() + `/x/api/v2/hr/overtimeTypes/${id}`)
    .pipe(catchError(this.handleError));
  }
 
  deleteAllowance(id: number){
    return this.http
    .delete<any>(this.getBaseApiUrl() + `/x/api/v2/hr/allowances/${id}`)
    .pipe(catchError(this.handleError));
  }

  deleteBonus(id: number){
    return this.http
    .delete<any>(this.getBaseApiUrl() + `/x/api/v2/hr/bonuses/${id}`)
    .pipe(catchError(this.handleError));
  }

  deleteDeduction(id: number){
    return this.http
    .delete<any>(this.getBaseApiUrl() + `/x/api/v2/hr/deductions/${id}`)
    .pipe(catchError(this.handleError));
  }

  deleteOvertime(id: number){
    return this.http
    .delete<any>(this.getBaseApiUrl() + `/x/api/v2/hr/overtimes/${id}`)
    .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Server-side error
        if (error.status === 500) {
          errorMessage = 'Server error: ' + error.error.message || 'Check form details and try again.';
        } else if (error.status === 404) {
          errorMessage = 'Resource not found. Please try again.';
        } else if (error.status === 0) {
          errorMessage = 'Unable to connect to the server. Please check your internet connection.';
        } else {
          errorMessage = error.error.message || 'An unexpected error occurred.';
        }
      }
      return throwError(() => errorMessage);
  }

 
}
