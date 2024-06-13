export interface HeirarchyUnitsData{
    heirarchyunitid: number;
        heirarchyid: number;
        parentid: number;
        population: number;
        areasqm: number;
        levelname: string;
        name: string
        shortname: string;
        altname: string;
        code: string;
        geoCode: string
        featureType: string;
        coordinates: string;
        url: string;
        description: string;
        address: string;
        phone_number: string;
        active: boolean;
        openingdate: number;
        closeddate: number;
        created_by: number;
        created_date: number;
}

export class hpak{
    heirarchyunitid: number;
        heirarchyid: number;
        parentid: number;
        population: number;
        areasqm: number;
        levelname: string;
        name: string
        shortname: string;
        altname: string;
        code: string;
        geoCode: string
        featureType: string;
        coordinates: string;
        url: string;
        description: string;
        address: string;
        phone_number: string;
        active: string;
        openingdate: number;
        closeddate: number;
        created_by: Date;
}