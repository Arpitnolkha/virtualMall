import type { MallProduct } from "@/types/mall";
export type HandoffState = "none" | "requested" | "waiting" | "connected";
export function handoffSummary(product: MallProduct | null) {
  return {
    selectedProduct: product ? { id: product.id, name: product.name } : null,
    summary: product
      ? `The shopper requested help with ${product.name}. Product details are available in the catalog.`
      : "The shopper requested assistance browsing the store.",
  };
}
