
import {LaboratoryTestData} from "src/app/administration/domain/laboratorytest.data"

export interface TesttypeData {
    laboratory_test_type_id: number;
    name: string;
    code: string;
    description: string;
    created_by: number;
    created_date: Date;
    //testholder: TestData[];

}

