'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMall } from '@/lib/mall/productContext';
import { useCart } from './CartProvider';
import { ActionLedger, decide, observeQuantityPrompt, feedback, initialFlow, type FeedbackCode, type ShoppingFlow } from './flow';
import { parseSchedule, scheduleInstant, type ScheduleDraft } from './schedule';
import { products } from '@/lib/mall/products';
export function useShopping(onExplore: () => void) {
    const mall = useMall(), cart = useCart(), router = useRouter();
    const [flow, setFlow] = useState(initialFlow), [notice, setNotice] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    const [callback, setCallback] = useState<(ScheduleDraft & { id: string; productName: string | null }) | null>(null);
    const [cartVisible, setCartVisible] = useState(false);
    const [sheet, setSheet] = useState<'cart' | 'checkout' | null>(null);
    const [draft, setDraft] = useState<ScheduleDraft>(() => ({ date: '', time: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata' }));
    const [meeting, setMeeting] = useState<{
        id: string;
        joinUrl: string;
    } | null>(null);
    const [afterSpeech, setAfterSpeech] = useState<{
        type: 'explore' | 'meeting';
        heard: boolean;
        url?: string;
    } | null>(null);
    const speechHeard = useRef(false);
    const messageProducts = useRef(new Map<string, string | null>());
    const navigating = useRef(false);
    const inFlight = useRef(false);
    const current = useRef(initialFlow), ledger = useRef(new ActionLedger()), generation = useRef(0), pendingKey = useRef('');
    const snapshot = useRef({ mall, cart, onExplore, draft });
    useEffect(() => { snapshot.current = { mall, cart, onExplore, draft }; }, [mall, cart, onExplore, draft]);
    const update = useCallback((next: ShoppingFlow) => { current.current = next; setFlow(next); }, []);
    const selected = useCallback((id: string) => { generation.current++; inFlight.current = false; setBusy(false); setAfterSpeech(null); setMeeting(null); setCallback(null); setNotice(''); setError(''); pendingKey.current = ''; setDraft(d => ({ ...d, date: '', time: '' })); update({ ...initialFlow, productId: id, language: current.current.language }); }, [update]);
    const say = useCallback(async (code: FeedbackCode, name = '', quantity = 0) => {
        const text = feedback(code, current.current.language, name, quantity);
        setNotice(text);
        if (snapshot.current.mall.voice.phase === 'ready') {
            try {
                await snapshot.current.mall.shoppingFeedback(text);
                return true;
            }
            catch {
                setError('Maya could not speak that update. You can use the controls below.');
            }
        }
        return false;
    }, []);
    const schedule = useCallback(async () => {
        if (inFlight.current || current.current.handoff !== 'SCHEDULE_REQUESTED')
            return;
        const f = current.current;
        const requestDraft = snapshot.current.draft;
        try {
            scheduleInstant(requestDraft);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Check the date and time.');
            return;
        }
        const key = pendingKey.current ||= crypto.randomUUID();
        const version = generation.current;
        inFlight.current = true;
        setBusy(true);
        setError('');
        try {
            const response = await fetch('/api/handoff/schedule', { method: 'POST', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...requestDraft, productId: f.productId, reason: f.reason, actionId: key, confirmed: true }) });
            if (!response.ok)
                throw new Error();
            const saved = await response.json();
            if (version !== generation.current)
                return;
            setCallback({ id: saved.id, date: saved.date, time: saved.time, timezone: saved.timezone, productName: saved.productName });
            update({ ...f, handoff: 'SCHEDULED' });
            pendingKey.current = '';
            // Keep the saved summary visible until the shopper chooses to continue.
            await say('scheduled');
        }
        catch {
            if (version === generation.current) {
                setError('The callback request was not saved. Please retry.');
            }
        }
        finally {
            if (version === generation.current) { inFlight.current = false; setBusy(false); }
        }
    }, [say, update]);
    const handle = useCallback(async (text: string, id = crypto.randomUUID()) => {
        if (!ledger.current.claim(id))
            return;
        const previous = current.current;
        const decision = decide(previous, text);
        const action = decision.action;
        if (!action)
            return;
        if (inFlight.current)
            return;
        const version = ++generation.current;
        setAfterSpeech(null);
        speechHeard.current = false;
        setError('');
        update(decision.flow);
        switch (action.type) {
            case 'FEEDBACK':
                await say(action.code);
                break;
            case 'OFFER_HUMAN_HANDOFF':
                await say(decision.flow.reason === 'pricing' ? 'pricing' : 'offer');
                break;
            case 'ADD_TO_CART':
                try {
                    snapshot.current.cart.add(action.productId, action.quantity, id);
                    setCartVisible(true);
                    await say('added', products.find(p => p.id === action.productId)!.name, action.quantity);
                }
                catch {
                    update({ ...decision.flow, phase: 'AWAITING_QUANTITY' });
                    await say('cartFailed');
                }
                break;
            case 'OPEN_CHECKOUT':
                setSheet('checkout');
                break;
            case 'CONTINUE_EXPLORING':
                if (await say('continue')) {
                    if (version === generation.current)
                        setAfterSpeech({ type: 'explore', heard: false });
                }
                else {
                    snapshot.current.onExplore();
                    update({ ...current.current, phase: 'PRODUCT_EXPLORATION' });
                }
                break;
            case 'START_SCHEDULE_HANDOFF': {
                let next: ScheduleDraft;
                try { next = parseSchedule(action.text, snapshot.current.draft); }
                catch (error) { snapshot.current.draft = { ...snapshot.current.draft, time: '' }; setDraft(snapshot.current.draft); setError(error instanceof Error ? error.message : 'Check the date, time and timezone.'); break; }
                snapshot.current.draft = next;
                setDraft(next);
                pendingKey.current = '';
                await say(next.date && next.time ? 'scheduleConfirm' : 'schedule');
                break;
            }
            case 'CONFIRM_SCHEDULE':
                await schedule();
                break;
            case 'CREATE_INSTANT_HANDOFF': {
                inFlight.current = true;
                setBusy(true);
                update({ ...decision.flow, handoff: 'CONNECTING' });
                const key = pendingKey.current ||= id;
                try {
                    const response = await fetch('/api/meetings', { method: 'POST', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ choice: 'now', actionId: key, productId: decision.flow.productId, quantity: snapshot.current.cart.state.items.find(p => p.productId === decision.flow.productId)?.quantity ?? 0, reason: decision.flow.reason }) });
                    if (!response.ok)
                        throw new Error();
                    const result = await response.json();
                    if (version !== generation.current)
                        return;
                    setMeeting(result);
                    pendingKey.current = '';
                    setNotice('Meeting ready. No representative is connected yet.');
                    const spoken = await say('meeting');
                    if (version !== generation.current) return;
                    if (spoken) setAfterSpeech({ type: 'meeting', url: result.joinUrl, heard: false });
                    else if (!navigating.current) { navigating.current = true; await snapshot.current.mall.disconnectVoice(); router.push(result.joinUrl); }
                }
                catch {
                    if (version === generation.current) {
                        update({ ...decision.flow, handoff: 'FAILED' });
                        await say('failed');
                    }
                }
                finally {
                    if (version === generation.current) { inFlight.current = false; setBusy(false); }
                }
                break;
            }
        }
    }, [say, schedule, update, router]);
    useEffect(() => {
        // Observe finalized messages from the existing external RTC transcript stream.
        for (const message of mall.state.messages) {
            const id = `${message.conversationId ?? 'local'}:${message.id}`;
            if (!messageProducts.current.has(id))
                messageProducts.current.set(id, current.current.productId);
            if (message.final === true) {
                if (messageProducts.current.get(id) !== current.current.productId) {
                    ledger.current.claim(id);
                    continue;
                }
                if (message.role === 'maya') {
                    if (ledger.current.claim(id)) {
                        const next = observeQuantityPrompt(current.current, message.text);
                        if (next !== current.current) update(next);
                    }
                } else {
                    void handle(message.text, id);
                }
            }
        }
    }, [mall.state.messages, handle, update]);
    useEffect(() => {
        if (!afterSpeech)
            return;
        if (mall.voice.agentSpeaking) {
            speechHeard.current = true;
            return;
        }
        if (!speechHeard.current || mall.voice.autoplayBlocked || mall.voice.phase !== 'ready')
            return;
        const timer = setTimeout(() => {
            setAfterSpeech(null);
            if (afterSpeech.type === 'explore') {
                update({ ...current.current, phase: 'PRODUCT_EXPLORATION' });
                snapshot.current.onExplore();
            }
            else if (afterSpeech.url && !navigating.current) {
                navigating.current = true;
                void snapshot.current.mall.disconnectVoice().then(() => { router.push(afterSpeech.url!); });
            }
        }, 1200);
        return () => clearTimeout(timer);
    }, [afterSpeech, mall.voice.agentSpeaking, mall.voice.autoplayBlocked, mall.voice.phase, update, router]);
    const joinMeeting = async () => { if (meeting && !navigating.current) {
        navigating.current = true;
        setAfterSpeech(null);
        await mall.disconnectVoice();
        router.push(meeting.joinUrl);
    } };
    const editDraft = (next: ScheduleDraft) => { pendingKey.current = ''; snapshot.current.draft = next; setDraft(next); };
    const cancel = useCallback(() => { generation.current++; inFlight.current = false; setBusy(false); setAfterSpeech(null); setMeeting(null); snapshot.current.draft = { ...snapshot.current.draft, date: '', time: '' }; setDraft(snapshot.current.draft); update({ ...current.current, handoff: 'NONE', phase: 'PRODUCT_EXPLORATION' }); setNotice(''); setError(''); pendingKey.current = ''; }, [update]);
    return { callback, cartVisible, hideCart: () => setCartVisible(false), flow, notice, error, busy, draft, editDraft, meeting, joinMeeting, handle, selected, schedule, sheet, setSheet, cancel,
        explore: () => { setSheet(null); onExplore(); } };
}
export type ShoppingController = ReturnType<typeof useShopping>;
