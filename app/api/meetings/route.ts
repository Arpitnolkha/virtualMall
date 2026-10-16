import { body, failure, reply, sameOrigin } from '@/lib/server/http';
import { handoffRepository, publicMeeting, requestKey, productId, handoffReason } from '@/lib/handoff/repository';
export const runtime = 'nodejs';
export async function POST(request: Request) { try {
    sameOrigin(request);
    const d = await body(request);
    if (d.choice !== 'now' || typeof d.quantity !== 'number' || !Number.isInteger(d.quantity) || d.quantity < 0 || d.quantity > 99)
        throw new Error('BAD_REQUEST');
    const m = handoffRepository.create(requestKey(d.actionId), productId(d.productId), d.quantity, handoffReason(d.reason));
    return reply({ ...publicMeeting(m), meetingId: m.id });
}
catch (e) {
    return failure(e);
} }
