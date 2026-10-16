'use client';
import { useEffect, useRef } from 'react';
import { products } from '@/lib/mall/products';
import type { ShoppingController } from '@/lib/shopping/useShopping';
export default function ShoppingControls({ shop }: {
    shop: ShoppingController;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    const scheduling = shop.flow.handoff === 'SCHEDULE_REQUESTED';
    const saved = shop.flow.handoff === 'SCHEDULED' && Boolean(shop.callback);
    useEffect(() => {
        const node = dialog.current;
        if (scheduling && node && !node.open) node.showModal();
        return () => { if (node?.open) node.close(); };
    }, [scheduling]);
    const handoff = ['AWAITING_TIMING_CHOICE', 'FAILED'].includes(shop.flow.handoff);
    return <section className="shopping-controls" aria-label="Shopping assistance">
  {shop.notice && <p role="status">{shop.notice}</p>}
  {shop.error && <p role="alert">{shop.error}</p>}
  {shop.flow.handoff === 'NONE' && shop.flow.phase === 'PRODUCT_EXPLORATION' && <div className="shopping-actions"><button onClick={() => void shop.handle('Add this to my cart')}>Add to cart</button><button onClick={() => void shop.handle('I need a human')}>Human help</button><button onClick={() => void shop.handle('Schedule a call later')}>Schedule a call</button></div>}
  {shop.flow.phase === 'AWAITING_QUANTITY' && <form onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); void shop.handle(String(data.get('quantity'))); }}><label>Quantity <input name="quantity" type="number" min="1" max="99" step="1" required defaultValue="1"/></label><button>Add to cart</button></form>}
  {shop.flow.phase === 'AWAITING_NEXT_ACTION' && <div className="shopping-actions"><button onClick={() => void shop.handle('checkout')}>Checkout</button><button onClick={() => void shop.handle('continue exploring')}>Continue exploring</button></div>}
  {handoff && <div className="shopping-actions"><button disabled={shop.busy} onClick={() => void shop.handle('Connect me to a human now')}>Talk to a person now</button><button onClick={() => void shop.handle('Schedule a call with a human later')}>Schedule for later</button></div>}
  {shop.flow.handoff === 'CONNECTING' && <p role="status">{shop.meeting ? 'Waiting room ready' : 'Creating your meeting…'}</p>}
  {shop.meeting && <button onClick={() => void shop.joinMeeting()}>Join waiting room</button>}
  {scheduling && <dialog ref={dialog} className="schedule-confirm-dialog" aria-labelledby="schedule-confirm-title" onCancel={e => { e.preventDefault(); if (!shop.busy) shop.cancel(); }}>
    <h2 id="schedule-confirm-title">Confirm your callback request</h2>
    <p>Review the time you shared before saving.</p>
    <p><strong>Product:</strong> {products.find(p => p.id === shop.flow.productId)?.name ?? 'General showroom assistance'}</p>
    {shop.error && <p role="alert">{shop.error}</p>}
    <form onSubmit={e => { e.preventDefault(); void shop.schedule(); }}>
    <label>Date<input disabled={shop.busy} aria-label="Callback date" type="date" required value={shop.draft.date} onChange={e => shop.editDraft({ ...shop.draft, date: e.target.value })}/></label>
    <label>Time<input disabled={shop.busy} aria-label="Callback time" type="time" required value={shop.draft.time} onChange={e => shop.editDraft({ ...shop.draft, time: e.target.value })}/></label>
    <label>Timezone<input disabled={shop.busy} aria-label="Callback timezone" required value={shop.draft.timezone} onChange={e => shop.editDraft({ ...shop.draft, timezone: e.target.value })}/></label>
    <small>Demo request only. No calendar booking or automatic callback delivery.</small>
    <button disabled={shop.busy}>{shop.busy ? 'Saving…' : 'Okay, confirm'}</button>
    <button type="button" disabled={shop.busy} onClick={shop.cancel}>Cancel</button>
  </form></dialog>}
  {saved && shop.callback && <section className="callback-confirmation" role="status" aria-label="Saved demo callback request">
    <h3>Demo callback request saved</h3>
    <p>Demo request—not a confirmed appointment.</p>
    <dl>
      <div><dt>Date</dt><dd>{shop.callback.date}</dd></div>
      <div><dt>Time</dt><dd>{shop.callback.time}</dd></div>
      <div><dt>Timezone</dt><dd>{shop.callback.timezone}</dd></div>
      <div><dt>Product</dt><dd>{shop.callback.productName ?? 'General showroom assistance'}</dd></div>
    </dl>
    <small>No automatic call, reminder or calendar booking. This demo request is lost if the server restarts.</small>
    <button onClick={shop.explore}>Continue exploring</button>
  </section>}
  {(shop.flow.handoff !== 'NONE' && shop.flow.handoff !== 'SCHEDULED' || shop.flow.phase === 'AWAITING_QUANTITY') && <button disabled={shop.busy} onClick={shop.cancel}>Cancel request</button>}
 </section>;
}
