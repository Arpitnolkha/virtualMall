export type MallEvent =
  | { type: "PRODUCT_SELECTED"; productId: string }
  | { type: "PRODUCT_DESELECTED" }
  | { type: "HUMAN_HANDOFF_REQUESTED" }
  | { type: "HUMAN_HANDOFF_CONNECTED"; uid: number };
