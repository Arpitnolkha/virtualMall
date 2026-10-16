import data from "./showroomSections.json";
export interface ProductHotspot {
  id: string;
  productId: string;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
}
export interface ShowroomSection {
  id: string;
  name: string;
  note: string;
  imageSrc: string;
  neighbors: { targetId: string; direction: string; label: string }[];
  productHotspots: ProductHotspot[];
}
export type SectionId = string;
export const sections: ShowroomSection[] = data;
