import type {
  ConversationController,
  ConversationSink,
} from "@/types/conversation";
import type { MallProduct } from "@/types/mall";
export const GREETING =
  "Hi! I’m Maya. Welcome to the shop! Tap any product and I’ll tell you about it.";
export class MockConversationController implements ConversationController {
  private timers: ReturnType<typeof setTimeout>[] = [];
  private disposed = false;
  private generation = 0;
  private serial = 0;
  private greeted = false;
  constructor(private sink: ConversationSink) {}
  async initialize() {
    if (this.greeted || this.disposed) return;
    this.greeted = true;
    this.sink.state("ready", "greeting");
    this.timers.push(setTimeout(() => this.sink.state("ready", "idle"), 1000));
  }
  private message(role: "maya" | "user", text: string, product: MallProduct) {
    this.sink.message({
      id: `mock-${++this.serial}`,
      role,
      text,
      productId: product.id,
    });
  }
  cancel() {
    this.generation++;
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
  private respond(product: MallProduct, text: string) {
    this.cancel();
    const generation = this.generation;
    this.sink.state("thinking", "thinking");
    this.timers.push(
      setTimeout(() => {
        if (generation !== this.generation) return;
        this.message("maya", text, product);
        this.sink.state("speaking", "speaking");
      }, 450),
    );
    this.timers.push(
      setTimeout(() => {
        if (generation === this.generation) this.sink.state("ready", "idle");
      }, 1900),
    );
  }
  selectProduct(product: MallProduct) {
    this.respond(
      product,
      `This is our ${product.name}. ${product.description} You’ll find ${product.features
        .slice(0, 2)
        .map((s) => s.toLowerCase())
        .join(" and ")}. What would you like to know?`,
    );
  }
  ask(question: string, product: MallProduct) {
    this.message("user", question, product);
    this.respond(
      product,
      product.answers[question] ?? `Here’s what I know: ${product.description}`,
    );
  }
  dispose() {
    this.disposed = true;
    this.cancel();
  }
}
