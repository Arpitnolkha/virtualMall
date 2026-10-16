import { body, failure, reply, sameOrigin } from '@/lib/server/http';
import { handoffRepository, publicMeeting, requestKey } from '@/lib/handoff/repository';
import { tokenFor } from '@/lib/server/sessionRegistry';
import { requireConfiguration } from '@/lib/server/config';
export const runtime = 'nodejs';
type Context = {
    params: Promise<{
        meetingId: string;
    }>;
};
export async function GET(_request: Request, { params }: Context) { try {
    return reply(publicMeeting(handoffRepository.get((await params).meetingId)));
}
catch (e) {
    return failure(e);
} }
export async function POST(request: Request, { params }: Context) { try {
    sameOrigin(request);
    const d = await body(request);
    const id = (await params).meetingId;
    const key = requestKey(d.participantKey);
    if (d.action === 'leave') {
        handoffRepository.release(id, key);
        return reply({ ok: true });
    }
    if (d.action !== 'join' && d.action !== 'renew')
        throw new Error('BAD_REQUEST');
    const { m, uid } = handoffRepository.participant(id, key);
    return reply({ appId: requireConfiguration().appId, channel: m.channel, uid, token: tokenFor({ channel: m.channel, uid }), expiresAt: m.expiresAt });
}
catch (e) {
    return failure(e);
} }
