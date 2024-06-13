export interface AllergiesData{
    allergy_id: number;
    name: string;
    code: string;
    description: string;
    created_by: number;
    created_date: number;

}

export interface AllergensData{
    allergen_id: number;
    name: string;
    code: string;
    description: string;
    created_by: number;
    created_date: Date;

}

export interface SeverityData{
    severity_id: number;
    name: string;
    code: string;
    description: string;
    created_by: number;
    created_date: Date;

}

export interface PriorityData{
  priority_id: number;
  name: string;
  code: string;
  description: string;
  created_by: number;
  created_date: Date;

}



