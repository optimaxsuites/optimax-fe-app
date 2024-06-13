export interface Product {
    id?: string;
    code?: string;
    name?: string;
    description?: string;
    price?: number;
    quantity?: number;
    inventoryStatus?: string;
    category?: string;
    image?: string;
    rating?: number;
}

export interface KPClinicalRegistrationPVT {
    gender: string;
    religion: string;
    language: string;
    occupation: string;
    qualification: string;
    maritalstatus: string;
    disability: string;
    targetgroup: string;
    lga:string;
    facility:string;
    careentrypoint:string;
    hospitalNum: string;
    dateofbirth: Date;
    dateofregistration: Date;
}