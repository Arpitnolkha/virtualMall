export type AvatarState =
  | "loading"
  | "idle"
  | "greeting"
  | "listening"
  | "thinking"
  | "speaking"
  | "error";
// Internal app contract. A future Enum adapter translates this to its own API.
export interface ShopkeeperAvatarController {
  initialize(): Promise<void>;
  setState(state: AvatarState): void;
  speak?(payload?: unknown): Promise<void>;
  stopSpeaking(): void;
  dispose(): void;
}
export class PlaceholderShopkeeper implements ShopkeeperAvatarController {
  private disposed = false;
  constructor(private onState: (state: AvatarState) => void) {}
  async initialize() {
    this.disposed = false;
    this.setState("idle");
  }
  setState(state: AvatarState) {
    if (!this.disposed) this.onState(state);
  }
  stopSpeaking() {
    this.setState("idle");
  }
  dispose() {
    this.disposed = true;
  }
}
