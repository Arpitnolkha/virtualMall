import 'server-only';
import { randomUUID } from 'node:crypto';
import { products } from '@/lib/mall/products';
import { scheduleInstant, type ScheduleDraft } from '@/lib/shopping/schedule';
export interface Meeting {
    id: string;
    channel: string;
    createdAt: number;
    expiresAt: number;
    status: 'waiting' | 'active' | 'completed';
    product: {
        id: string;
        name: string;
        listedPrice: number;
        currency: string;
    } | null;
    quantity: number;
    reason: 'pricing' | 'human-help';
    participants: Map<string, number>;
}
export interface CallbackRequest extends ScheduleDraft {
    id: string;
    productId: string | null;
    reason: 'pricing' | 'human-help';
    requestedAt: number;
    scheduledFor: number;
    status: 'requested';
}
export interface HandoffSchedulingService {
    request(key: string, draft: ScheduleDraft, productId: string | null, reason: 'pricing' | 'human-help'): CallbackRequest;
}
/** Single-process demo repository. No calendar, CRM delivery or durable storage is implied. */
export class DemoHandoffRepository implements HandoffSchedulingService {
    meetings = new Map<string, Meeting>();
    callbacks = new Map<string, CallbackRequest>();
    private requests = new Map<string, {
        signature: string;
        id: string;
    }>();
    private prune() { for (const [id, m] of this.meetings)
        if (m.expiresAt < Date.now())
            this.meetings.delete(id); for (const [key, v] of this.requests)
        if (!this.meetings.has(v.id) && ![...this.callbacks.values()].some(c => c.id === v.id))
            this.requests.delete(key); }
    private product(id: string | null) { const p = id ? products.find(p => p.id === id) : null; if (id && !p)
        throw new Error('INVALID_PRODUCT'); return p ?? null; }
    create(key: string, productId: string | null, quantity: number, reason: 'pricing' | 'human-help') {
        this.prune();
        const signature = JSON.stringify([productId, quantity, reason]);
        const old = this.requests.get('meeting:' + key);
        if (old) {
            if (old.signature !== signature)
                throw new Error('BAD_REQUEST');
            return this.meetings.get(old.id)!;
        }
        if (this.meetings.size >= 100)
            throw new Error('CAPACITY');
        const p = this.product(productId);
        const id = randomUUID();
        const m: Meeting = { id, channel: `human_${id.replaceAll('-', '')}`, createdAt: Date.now(), expiresAt: Date.now() + 2 * 3600000, status: 'waiting', product: p ? { id: p.id, name: p.name, listedPrice: p.details!.price.amount, currency: p.details!.price.currency } : null, quantity, reason, participants: new Map() };
        this.meetings.set(id, m);
        this.requests.set('meeting:' + key, { signature, id });
        return m;
    }
    get(id: string) { this.prune(); const m = this.meetings.get(id); if (!m)
        throw new Error('SESSION_EXPIRED'); return m; }
    participant(id: string, key: string) { const m = this.get(id); let uid = m.participants.get(key); if (!uid) {
        if (m.participants.size >= 2)
            throw new Error('CAPACITY');
        uid = [1001, 1002].find(candidate => ![...m.participants.values()].includes(candidate))!;
        m.participants.set(key, uid);
    } return { m, uid }; }
    release(id: string, key: string) { this.get(id).participants.delete(key); }
    request(key: string, draft: ScheduleDraft, productId: string | null, reason: 'pricing' | 'human-help') {
        this.product(productId);
        const signature = JSON.stringify([draft, productId, reason]);
        const old = this.requests.get('callback:' + key);
        if (old) {
            if (old.signature !== signature)
                throw new Error('BAD_REQUEST');
            return this.callbacks.get(old.id)!;
        }
        if (this.callbacks.size >= 500)
            throw new Error('CAPACITY');
        const c: CallbackRequest = { ...draft, id: randomUUID(), productId, reason, status: 'requested', requestedAt: Date.now(), scheduledFor: scheduleInstant(draft) };
        this.callbacks.set(c.id, c);
        this.requests.set('callback:' + key, { signature, id: c.id });
        return c;
    }
}
const globalStore = globalThis as typeof globalThis & {
    mayaHandoffRepository?: DemoHandoffRepository;
};
export const handoffRepository = globalStore.mayaHandoffRepository ??= new DemoHandoffRepository();
export function publicMeeting(m: Meeting) { return { id: m.id, createdAt: m.createdAt, expiresAt: m.expiresAt, product: m.product, quantity: m.quantity, reason: m.reason, status: m.status, joinUrl: `/meeting/${m.id}` }; }
export function requestKey(value: unknown) { if (typeof value !== 'string' || !/^[-\w:.]{8,180}$/.test(value))
    throw new Error('BAD_REQUEST'); return value; }
export function productId(value: unknown) { if (value === null || value === undefined)
    return null; if (typeof value !== 'string')
    throw new Error('BAD_REQUEST'); return value; }
export function handoffReason(value: unknown) { if (value !== 'pricing' && value !== 'human-help')
    throw new Error('BAD_REQUEST'); return value; }
