
export interface SalaryDTO {
    levelId: number;
	allowance: AllowanceDTO[];
	bonus: BonusDTO[]
	deductions:DeductionsDTO[];
	baseSalary: number;
	overTime?: OvertimeDTO[]
}

export interface AllowanceDTO {
	allowanceId: number;
	type: AllowanceTypeDTO;
	amount: number
}

export interface AllowanceTypeDTO {
    id: number;          
    name: string;       
    description?: string;   
}

export interface BonusDTO {
  bonusId: number;
  type: BonusTypeDTO; 
  amount: number; 
  dateAwarded?: Date; 
}

export interface BonusTypeDTO { 
  id: number; 
  name: string;
  description?: string; 
}

export interface DeductionsDTO { 
  deductionId: number;
  type: DeductionsTypeDTO; 
  amount: number; 
}

export interface DeductionsTypeDTO { 
  id: number; 
  name: string; 
  description?: string; 
  isTax?: boolean; 
}

export interface OvertimeDTO { 
  type: OvertimeTypeDTO;
  maxHours: number; 
  rate: number
}

export interface OvertimeTypeDTO { 
  id: number; 
  name: string; 
  description?: string;
}