// dashboard.models.ts
export interface BranchDto {
  id: number;
  name: string;
  description?: string;
  address?: string;
}

export interface TopSellingProductDto {
  productId: number;
  productName: string;
  quantitySold: number;
  revenue: number;
}

export interface SalesPerBranchDto {
  branch: BranchDto;
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
}

export interface SalesBreakdownDto {
  date: string; // ISO
  branch?: BranchDto;
  cashier?: number;
  paymentMethod?: string;
  transactions: number;
  revenue: number;
  discounts?: number;
}

export interface SalesPerformanceResponse {
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
  totalDiscounts?: number;
  totalSalesPerBranch: SalesPerBranchDto[];
  topSellingProducts: TopSellingProductDto[];
  paymentMethodBreakdown?: { paymentMethod: string; revenue: number; transactions: number }[];
  breakdown?: SalesBreakdownDto[];
}
