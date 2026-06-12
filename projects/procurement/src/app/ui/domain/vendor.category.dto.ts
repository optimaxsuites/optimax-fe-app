export interface VendorCategoryDto {
  id: string;
  name: string;
  description?: string;
}

export interface VendorCategoryGroupDto {
  groupName: string;
  categories: VendorCategoryDto[];
}
