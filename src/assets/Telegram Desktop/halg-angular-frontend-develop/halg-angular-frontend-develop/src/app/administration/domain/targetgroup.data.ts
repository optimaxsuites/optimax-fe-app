export interface TargetGroupData{
    target_group_id: number;
    name: string;
    code: string;
    description: string;
    created_by: number;
    created_date: Date;


}

export interface CareEntryPointData{
  name: string;
  code: string;
  description: string;
  created_by: number;
  created_date: Date;
  care_entry_point_id: number;

}


export interface RefferedfromData{
  referred_from_id: number;
  name: string;
  code: string;
  description: string;
  created_by: number;
  created_date: Date;

}

export interface DisabilityData{
  name: string;
  code: string;
  disability_id: number;
  description: string;
  created_by: number;
  created_date: Date;

}




