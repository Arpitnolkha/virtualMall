import { configuration } from "@/lib/server/config";
import { reply } from "@/lib/server/http";
export const runtime = "nodejs";
export async function GET() {
  return reply(configuration());
}
