import type { MallProduct } from "@/types/mall";
export type ZoneId =
  "entrance" | "lifestyle" | "travel" | "technology" | "play";
export const zones: {
  id: ZoneId;
  name: string;
  note: string;
  position: [number, number, number];
  target: [number, number, number];
}[] = [
  {
    id: "entrance",
    name: "Entrance",
    note: "A world of everyday discoveries",
    position: [0, 1.85, 8],
    target: [0, 1.5, -2],
  },
  {
    id: "lifestyle",
    name: "Lifestyle",
    note: "Comfort for your everyday",
    position: [-4.8, 1.8, 0.9],
    target: [-5, 1.4, -2.5],
  },
  {
    id: "travel",
    name: "Travel & outdoor",
    note: "Ready for your next chapter",
    position: [4.8, 1.8, 0.9],
    target: [5, 1.4, -2.5],
  },
  {
    id: "technology",
    name: "Focus & sound",
    note: "A little time for yourself",
    position: [0, 1.8, -1.6],
    target: [0, 1.4, -5],
  },
  {
    id: "play",
    name: "Play",
    note: "Make room for a little fun",
    position: [0, 1.8, 5.4],
    target: [0, 1.45, 2],
  },
];
export const displays = [
  {
    zone: "lifestyle",
    center: [-5, 0, -2.5],
    products: ["running-shoes", "lunch-box"],
  },
  {
    zone: "travel",
    center: [5, 0, -2.5],
    products: ["school-backpack", "water-bottle"],
  },
  { zone: "technology", center: [0, 0, -5], products: ["headphones", "book"] },
  { zone: "play", center: [0, 0, 2], products: ["toy-car", "football"] },
] as const;
export function showroomProduct(product: MallProduct): MallProduct {
  const display = displays.find((d) =>
    d.products.some((id) => id === product.id),
  );
  if (!display) return product;
  const index = display.products.findIndex((id) => id === product.id);
  return {
    ...product,
    position: [
      display.center[0] + (index ? 0.85 : -0.85),
      1.185,
      display.center[2],
    ],
    rotation: [0, 0, 0],
    scale:
      (
        {
          "school-backpack": 0.55,
          "running-shoes": 0.55,
          "water-bottle": 0.46,
          book: 0.48,
          "toy-car": 0.4,
          football: 0.46,
          headphones: 0.48,
          "lunch-box": 0.52,
        } as Record<string, number>
      )[product.id] ?? 0.55,
  };
}
export function productPrice(product: MallProduct) {
  return product.details
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: product.details.price.currency,
        maximumFractionDigits: 0,
      }).format(product.details.price.amount)
    : "Price available on request";
}
