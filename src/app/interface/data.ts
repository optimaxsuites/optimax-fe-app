export interface Data {
}

export interface InventoryItem {
    [key: string]: any;
    id: string;
    itemName?: string;
    partNo?: number;
    images?: string[];
    description: string;
    buyingPrice?: number;
    sellingPrice?: number;
    initialStock?: number;
    // purchaseLedger?: string;
    // salesLedger?: string;
    // inventoryLedger?: string;
    taxRate?: number;
    // currentStock?: number;
    totalSoldQuantity?: number;
    totalPurchaseQuantity?: number;
    currency?: string;
    // hsn?: string;
    // tag?: string;
  }
