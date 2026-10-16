import { body, failure, reply, sameOrigin } from '@/lib/server/http';
import { handoffRepository, requestKey, productId, handoffReason } from '@/lib/handoff/repository';
import { products } from '@/lib/mall/products';
import { scheduleInstant } from '@/lib/shopping/schedule';
export const runtime = 'nodejs';
export async function POST(request: Request) { try {
    sameOrigin(request);
    const d = await body(request);
    if (d.confirmed !== true || typeof d.date !== 'string' || typeof d.time !== 'string' || typeof d.timezone !== 'string')
        throw new Error('BAD_REQUEST');
    const draft = { date: d.date, time: d.time, timezone: d.timezone };
    try {
        scheduleInstant(draft);
    }
    catch {
        return reply({ error: 'Please confirm a valid future date, time and timezone.' }, 400);
    }
    const saved = handoffRepository.request(requestKey(d.actionId), draft, productId(d.productId), handoffReason(d.reason));
    return reply({ id: saved.id, status: saved.status, date: saved.date, time: saved.time, timezone: saved.timezone, productName: products.find(p => p.id === saved.productId)?.name ?? null, demo: true });
}
catch (e) {
    return failure(e);
} }
