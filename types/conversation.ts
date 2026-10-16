import type { MallProduct } from "./mall";
import type { AvatarState } from "@/lib/avatar/shopkeeperAvatar";
export type ConversationState =
  | "idle"
  | "connecting"
  | "ready"
  | "listening"
  | "thinking"
  | "speaking"
  | "error";
export interface TranscriptMessage {
  id: string;
  role: "maya" | "user";
  text: string;
  productId?: string;
  final?: boolean;
  conversationId?: string;
  timestamp?: number;
}
export interface ConversationSink {
  message: (message: TranscriptMessage) => void;
  state: (conversation: ConversationState, avatar: AvatarState) => void;
}
export interface ConversationController {
  initialize(): Promise<void>;
  selectProduct(product: MallProduct): void;
  ask(question: string, product: MallProduct): void;
  cancel(): void;
  dispose(): void;
}
