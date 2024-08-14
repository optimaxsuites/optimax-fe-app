export interface QuotationDTO {
    id: number;
    quotationNo: string; // maxLength: 100, minLength: 0
    quotationDate: string; // format: date-time
    quotationDueDate: string; // format: date-time
    termsAndConditions: string; // maxLength: 500, minLength: 0
    quotationNote: string; // maxLength: 500, minLength: 0
    logo: string;
    signature: string; // maxLength: 255, minLength: 0
    attachment: string; // maxLength: 255, minLength: 0
    createdBy: number;
    saveStatus: 'DRAFT' | 'SAVED';
    project: number;
    customer: number;
    field: FieldDTO[]; // Optional, if FieldDTO is part of QuotationDTO
  }

  export interface FieldDTO{
    id: number;
    title: string;
    description: string;
  }
  
  export interface ProjectDTO {
    id: number;
    name: string; // maxLength: 255, minLength: 0
    code: string; // maxLength: 15, minLength: 0
    description: string; // maxLength: 255, minLength: 0
  }
  
  export interface ItemsDTO {
    id?: number;
    name: string; // maxLength: 255, minLength: 0
    businessSalesType?: 'REQUEST_FOR_QUOTATION' | 'QUOTATION';
    taxRate: number; // format: double
    qty: number; // format: int32
    rate: number; // format: double
    amount: number; 
    total: number;// format: double
    tax: number; // format: double
    createdBy?: number;
    quotation?: number;
    description: string;
    showDescriptionBox: false;
  }
  
  export interface IndustryDTO {
    id: number;
    name: string; // maxLength: 100, minLength: 0
    code: string; // maxLength: 10, minLength: 0
    description: string; // maxLength: 255, minLength: 0
  }
  
  export interface DiscountAndChargesDTO {
    id: number;
    itemId: number;
    discountValue: number; // format: double
    discountMetric: number; // format: double
    additionalChargesValue: number; // format: double
    additionalChargesMetric: number; // format: double
    createdBy: number;
    items: number;
  }
  
  export interface CustomerDTO {
    id: number;
    name: string; // maxLength: 100, minLength: 0
    // lastname: string; // maxLength: 100, minLength: 0
    customerType: 'COMPANY' | 'INDIVIDUAL';
    email: string; // maxLength: 100, minLength: 0
    phoneNumber: string; // maxLength: 20, minLength: 0
    industry: number;
    address: number[],
  }
  
  export interface CompanyDTO {
    id: number;
    name: string; // maxLength: 255, minLength: 0
    companySize: number; // format: int32
    yearOfRegistration: string; // maxLength: 4, minLength: 0
    companyRegistrationNumber: string; // maxLength: 50, minLength: 0
    companyClassification: 'BUSINESS_NAME' | 'PRIVATE_LIMITED_COMPANY';
    industryId: number;
    companyGenNo: string; // maxLength: 255, minLength: 0
    idType: 'BVN' | 'SALESFORCE';
    assignedId: string; // maxLength: 255, minLength: 0
    createdBy: number;
    companyType: 'COMPANY' | 'INDIVIDUAL';
    companyAttr: 'PARENT' | 'BRANCH';
    customer: number;
    address: number[];
    email: string;
    phoneNumber: number;
  }
  
  export interface BanksDTO {
    id: number;
    name: string; // maxLength: 255, minLength: 0
    createdBy: string; // maxLength: 255, minLength: 0
    customer: number;
  }
  
  export interface AddressDTO {
    id: number;
    streetName: string; // maxLength: 255, minLength: 0
    officeNo: string; // maxLength: 10, minLength: 0
    landmark: string; // maxLength: 255, minLength: 0
    addressType: 'OFFICE' | 'WAREHOUSE' | 'SHIPPING';
    city: string; // maxLength: 255, minLength: 0
    state: string; // maxLength: 255, minLength: 0
    country: string; // maxLength: 255, minLength: 0
    createdBy: string; // maxLength: 255, minLength: 0
    email: string; // maxLength: 100, minLength: 0
    phoneNumber: string; // maxLength: 20, minLength: 0
    contactName: string; // maxLength: 50, minLength: 0
    longitude: string; // maxLength: 50, minLength: 0
    latitude: string; // maxLength: 50, minLength: 0
    customer: number;
    banks: number;
  }

  export interface ShippingDTO {
    id: number;
    companyId: number;
    addressId: number;
    quotation: number;
  }
  