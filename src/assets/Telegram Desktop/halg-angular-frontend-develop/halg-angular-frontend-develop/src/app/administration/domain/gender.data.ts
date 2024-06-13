import { Time } from '@angular/common';

export interface GenderData{
    name: string;
    description: string;
    code: string;
    url: string;
    gender_id:number;
    created_by: number;
    created_date: number;

}


export interface MaritalStatusData{
    name: string;
    description: string;
    code: string;
    url: string;
    marital_status_id:number;
    created_by: number;
    created_date: Date;


}

export interface RelationshipData{
    name: string;
    description: string;
    code: string;
    url: string;
    relationship_id:number;
    created_by: number;
    created_date: Date;

}


export interface LanguageData{
    name: string;
    code: string;
    url: string;
    description: string;
    language_id: number;
    created_by: number;
    created_date: number;

}

export interface ReligionData{
  name: string;
    description: string;
    code: string;
    religion_id:number;
    created_by: number;
    created_date: Date;

}


