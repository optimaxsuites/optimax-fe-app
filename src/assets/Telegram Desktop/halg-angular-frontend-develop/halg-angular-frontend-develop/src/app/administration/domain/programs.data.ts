import { FormBuilderData } from "./formbuilder.data";

export interface ProgramsData{
  name: string;
  code: string;
  icon: string;
  program_id: number;
  description: string;
  created_by: number;
  created_date: number;
  programstages: ProgramStageData[];

}

export interface ProgramStageData{
  program_stage_id: number;
  program_id: number;
  name: string;
  code: string;
  form_stage_db_identifier: string;
  description: string;
  created_by: number;
  created_date: number;
  programstageform:   FormBuilderData
  
}

export interface ColumnDef{
  field: string;
  header: string;
  hide: boolean;
}

export interface ColumnAttrDef{
  attrname: string;
  dataType: string;

}


