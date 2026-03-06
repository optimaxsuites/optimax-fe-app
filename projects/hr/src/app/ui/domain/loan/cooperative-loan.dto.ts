import { employeeDTO } from '../employee.dto';

export interface userDTO {
  [key: string]: any;
}

export interface departmentDTO {
  [key: string]: any;
}

export type CooperativeLoanStatusDTO =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'DEFAULTED';

export type CooperativeLoanModeOfPaymentDTO = 'monthly' | 'one_off';

export interface CooperativeLoanDTO {
  id: number;
  user: userDTO;
  employeeID: employeeDTO;
  department: departmentDTO;
  memberID: string;
  productID: string;
  amount: number;
  purpose: string;
  interestRate: number;
  repaymentAmount: number;
  requestDate: Date;
  modeOfPayment: CooperativeLoanModeOfPaymentDTO;
  repaymentTime: number;
  status: CooperativeLoanStatusDTO;
  adminComment: string;
  useSharesAsCollateral?: boolean;
  pledgedSharesAmount?: number;
}

export interface CooperativeLoanApprovalDTO {
  loanId: number;
  approvedBy: userDTO;
  status: Exclude<CooperativeLoanStatusDTO, 'PENDING'>;
  adminComment?: string;
}

export interface CooperativeLoanRepaymentDTO {
  loanId: number;
  amount: number;
  paymentDate: Date;
  modeOfPayment: CooperativeLoanModeOfPaymentDTO;
  recordedBy: userDTO;
  referenceNumber?: string;
}
