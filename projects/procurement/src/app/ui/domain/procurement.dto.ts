export interface RfqDTO{
    id?: number;
    rfqNo?: number;
    date?: string;
    dueDate?: string;
    projectTitle?: string;
    preparedBy?: string;
    items?: RfqItemDTO[];
}

export interface RfqItemDTO{
    id?: number;
    name?: string;
    partNo?: string;
    unit?: number;
    budget?: number;
    description?: string;
}

export enum QuotationStage {
    Pending = 'Pending',
    Converted = 'Converted',

}