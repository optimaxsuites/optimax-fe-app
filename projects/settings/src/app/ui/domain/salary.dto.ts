
export interface SalaryDTO {
  id? :number | undefined
  levelId: number;
	allowance?: AllowanceDTO[];
	bonus?: BonusDTO[]
	deductions?:DeductionsDTO[];
	baseSalary: number;
	overtime?: OvertimeDTO[]
}

export interface AllowanceDTO {
	id?: number | undefined;
	allowanceTypeId: number;
	amount: number
}

export interface AllowanceTypeDTO {
    id?: number | undefined;          
    name: string;    
    code?: string;   
    description?: string;   
}

export interface BonusDTO {
  id?: number | undefined;
  bonusTypeId: number; 
  amount: number; 
  dateAwarded?: Date; 
}

export interface BonusTypeDTO { 
  id?: number | undefined; 
  name: string;
  description?: string; 
}

export interface DeductionsDTO { 
  id?: number | undefined;
  deductionsTypeId: number; 
  amount: number; 
}

export interface DeductionsTypeDTO { 
  id?: number | undefined; 
  name: string; 
  description?: string; 
  isTax?: boolean; 
}

export interface OvertimeDTO { 
  id?: number | undefined;
  overtimeTypeId: number;
  maxHours: number; 
  rate: number
}

export interface OvertimeTypeDTO { 
  id?: number | undefined; 
  name: string; 
  description?: string;
}