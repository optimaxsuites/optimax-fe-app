import { employeeDTO } from '../employee.dto';

export interface userDTO {
  [key: string]: any;
}

export interface departmentDTO {
  [key: string]: any;
}

export interface AdvanceLoanDTO {
  id: number;
  user: userDTO;
  purpose: string;
  employeeID: employeeDTO;
  department: departmentDTO;
  amount: number;
  interestRate: number;
  repaymentAmount: number;
  requestDate: Date;
  modeOfPayment: 'monthly' | 'one_off';
  repaymentTime: number; // in months
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED';
  adminComment: string;
}
