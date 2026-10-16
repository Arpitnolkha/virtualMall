export interface ScheduleDraft {
    date: string;
    time: string;
    timezone: string;
}
export function localDate(now: Date, timezone: string) { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now); return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}-${parts.find(p => p.type === 'day')!.value}`; }
export function parseSchedule(text: string, current: ScheduleDraft, now = new Date()): ScheduleDraft {
    const next = { ...current };
    const t = text.toLowerCase().replace(/[०-९]/g, c => String(c.charCodeAt(0) - 2406));
    // Resolve explicit timezone before relative dates such as tomorrow.
    if (/\bindia(?:n)? standard time\b|\bist\b|\basia\/kolkata\b|भारतीय मानक समय/u.test(t)) next.timezone = 'Asia/Kolkata';
    else if (/\b(?:utc|gmt)\b/u.test(t)) next.timezone = 'UTC';
    const zone = text.match(/\b[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?\b/);
    if (zone) {
        try { new Intl.DateTimeFormat('en', { timeZone: zone[0] }); next.timezone = zone[0]; }
        catch { throw new Error('Choose a valid timezone.'); }
    }
    const date = t.match(/\b\d{4}-\d{2}-\d{2}\b/);
    if (date)
        next.date = date[0];
    else if (/tomorrow|कल|\bkal\b/.test(t)) {
        const d = new Date(`${localDate(now, next.timezone)}T12:00:00Z`);
        d.setUTCDate(d.getUTCDate() + (/day after tomorrow/.test(t) ? 2 : 1));
        next.date = d.toISOString().slice(0, 10);
    }
    else if (/today|आज|\baaj\b/.test(t))
        next.date = localDate(now, next.timezone);
    else {
        const weekdays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
        const day = weekdays.findIndex(day => new RegExp(`\\b${day}\\b`).test(t));
        if (day >= 0) {
            const d = new Date(`${localDate(now, next.timezone)}T12:00:00Z`);
            d.setUTCDate(d.getUTCDate() + ((day - d.getUTCDay() + 7) % 7 || 7));
            next.date = d.toISOString().slice(0, 10);
        } else if (/\b(next week|next month)\b/.test(t)) next.date = '';
    }
    if (/\b(morning|afternoon|evening|tonight)\b|शाम/u.test(t)) next.time = '';
    const time = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/) ?? t.match(/\b(\d{1,2}):(\d{2})\b/);
    if (!time && /\bat\s+\d{1,2}\b/.test(t)) next.time = '';
    if (time) {
        let h = Number(time[1]);
        const m = Number(time[2] ?? 0);
        if (time[3]) {
            if (h < 1 || h > 12)
                throw new Error('Choose a valid time between 1 and 12 with AM or PM.');
            h = h % 12 + (time[3] === 'pm' ? 12 : 0);
        }
        if (h >= 24 || m >= 60) throw new Error('Choose a valid time.');
        next.time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return next;
}
export function scheduleInstant(draft: ScheduleDraft, now = Date.now()): number {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time))
        throw new Error('Choose an exact date and time.');
    const desired = `${draft.date}T${draft.time}`;
    let instant = Date.parse(`${desired}:00Z`);
    if (!Number.isFinite(instant))
        throw new Error('Choose a valid date.');
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: draft.timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const local = (ms: number) => { const p = formatter.formatToParts(new Date(ms)); const get = (name: string) => p.find(x => x.type === name)!.value; return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`; };
    for (let i = 0; i < 3; i++)
        instant += Date.parse(`${desired}:00Z`) - Date.parse(`${local(instant)}:00Z`);
    if (local(instant) !== desired)
        throw new Error('This local time does not exist. Choose another time.');
    if (local(instant - 3600000) === desired || local(instant + 3600000) === desired)
        throw new Error('This time is ambiguous due to daylight saving. Choose another time.');
    if (instant <= now || instant > now + 366 * 86400000)
        throw new Error('Choose a future time within the next year.');
    return instant;
}
