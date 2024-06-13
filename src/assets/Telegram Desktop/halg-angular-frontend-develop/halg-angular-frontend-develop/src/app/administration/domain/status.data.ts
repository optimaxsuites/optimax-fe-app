export interface StatusData{
    status_id: number;
    status_type_id: number;
    name: string;
    code: string;
    description: string;
    created_by: number;
    created_date: number;

}

export interface StatusTypeData{
  name: string;
  description: string;
  status_type_id:number;
  code:string;
  created_by: number;
  created_date: Date;
}
