//import {TesttypeData} from 'src/app/administration/domain/testtype.data'

export interface LaboratoryTestData{
    laboratory_test_id: number;
    laboratory_test_type_id: number;
    name: string;
    code: string;
    description: string;
    created_by: number;
    created_date: Date;

}


export interface LaboratoryTesttypeData {
    laboratory_test_type_id: number;
    name: string;
    code: string;
    description: string;
    created_by: number;
    created_date: Date;
    laboratorytests:LaboratoryTestData[];


}



