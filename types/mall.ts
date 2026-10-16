import type { AvatarState } from "@/lib/avatar/shopkeeperAvatar";
import type { ConversationState, TranscriptMessage } from "./conversation";
export interface MallProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  features: string[];
  suitableFor?: string;
  details?: {
    catalogStatus: "demo";
    price: { amount: number; currency: "INR"; unit: string };
    materials: string;
    durability: string;
    comfort: string;
    care: string;
    specifications: Record<string, string>;
  };
  suggestedQuestions: string[];
  modelPath?: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  color: string;
  icon: string;
  answers: Record<string, string>;
}
export interface MallContextState {
  activeProduct: MallProduct | null;
  previousProduct: MallProduct | null;
  conversationState: ConversationState;
  avatarState: AvatarState;
  messages: TranscriptMessage[];
}
