export interface Data {
}

export interface InventoryItem {
  id: string;
  itemName: string;
  partNo: string;
  taxRate: number;
  description: string;
  images: string[];
  buyingPrice: number;
  sellingPrice: number;
  initialStock: number;
  totalSoldQuantity: number;
  totalPurchaseQuantity: number;
}
