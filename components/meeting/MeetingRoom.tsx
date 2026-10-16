'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { IAgoraRTCRemoteUser, ICameraVideoTrack, IRemoteVideoTrack } from 'agora-rtc-sdk-ng';
import { MeetingSession, type MeetingCredentials } from '@/lib/handoff/meetingSession';
import { readScene } from '@/lib/shopping/sceneMemory';
import { sections } from '@/lib/mall/showroomSections';
import { money } from '@/lib/shopping/cart';
interface Info {
    id: string;
    product: {
        name: string;
        listedPrice: number;
    } | null;
    quantity: number;
    reason: string;
    expiresAt: number;
}
function Video({ track, label }: {
    track: ICameraVideoTrack | IRemoteVideoTrack | undefined;
    label: string;
}) { const node = useRef<HTMLDivElement>(null); useEffect(() => { if (track && node.current)
    track.play(node.current); return () => track?.stop(); }, [track]); return <div className="meeting-video"><div ref={node}/><span>{label}</span>{!track && <p className="meeting-placeholder"><span aria-hidden="true">◯</span>Camera off</p>}</div>; }
export default function MeetingRoom({ id }: {
    id: string;
}) {
    const router = useRouter();
    const [background, setBackground] = useState('/showroom/headphones.webp');
    const [info, setInfo] = useState<Info | null>(null), [error, setError] = useState(''), [state, setState] = useState('PREVIEW'), [users, setUsers] = useState<IAgoraRTCRemoteUser[]>([]), [camera, setCamera] = useState<ICameraVideoTrack>(), [micOn, setMicOn] = useState(true), [cameraOn, setCameraOn] = useState(true), [copied, setCopied] = useState(false);
    const session = useRef<MeetingSession | null>(null), key = useRef(''), mounted = useRef(true), starting = useRef(false), exiting = useRef(false);
    const endpoint = `/api/meetings/${id}`;
    useEffect(() => { mounted.current = true; let active = true; fetch(endpoint).then(async (r) => { if (!r.ok)
        throw new Error(); return r.json(); }).then(d => { if (active) {
        setInfo(d);
        const section = sections.find(section => section.id === readScene().zone);
        if (section) setBackground(section.imageSrc);
        } }).catch(() => { if (active)
        setError('This meeting is unavailable or expired. Return to the showroom to request a new one.'); }); const release = () => { void session.current?.dispose(); if (key.current)
        void fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'leave', participantKey: key.current }), keepalive: true }).catch(() => { }); }; window.addEventListener('pagehide', release); return () => { active = false; mounted.current = false; release(); window.removeEventListener('pagehide', release); }; }, [endpoint]);
    const credentials = async (action: string): Promise<MeetingCredentials> => { const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, participantKey: key.current }) }); if (!r.ok)
        throw new Error(); return r.json(); };
    const join = async () => {
        if (starting.current || exiting.current || !mounted.current)
            return;
        starting.current = true;
        setState('CONNECTING');
        setError('');
        key.current ||= crypto.randomUUID();
        try {
            await session.current?.dispose();
            if (exiting.current || !mounted.current) return;
            setUsers([]);
            setMicOn(true);
            setCameraOn(true);
            setCamera(undefined);
            const c = await credentials('join');
            if (!mounted.current || exiting.current) {
                // A late successful join request may have reserved a participant slot.
                await credentials('leave').catch(() => {});
                return;
            }
            const active = () => mounted.current && !exiting.current;
            const s = new MeetingSession(c, {
                users: value => { if (active()) setUsers(value); },
                state: value => { if (active()) {
                    setState(value);
                    if (value === 'DISCONNECTED') { setCamera(undefined); setUsers([]); }
                } },
                error: value => { if (active()) setError(value); },
                local: value => { if (active()) setCamera(value); },
            }, async () => (await credentials('renew')).token);
            session.current = s;
            await s.join();
        }
        catch {
            if (mounted.current && !exiting.current) {
                setState('PREVIEW');
                setError('Could not join this meeting. It may be full or expired.');
            }
        }
        finally {
            starting.current = false;
        }
    };
    const leave = async () => { if (exiting.current) return; exiting.current = true; await session.current?.dispose(); await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'leave', participantKey: key.current }) }).catch(() => { }); router.push('/mall'); };
    const toggle = async (kind: 'mic' | 'camera') => { if (exiting.current || state !== 'CONNECTED') return; try {
        if (kind === 'mic') {
            await session.current?.setMic(!micOn);
            setMicOn(!micOn);
        }
        else {
            await session.current?.setCamera(!cameraOn);
            setCameraOn(!cameraOn);
        }
    }
    catch {
        setError('Could not change that device. Check permissions or rejoin.');
    } };
    return <main className="commerce-page meeting-page" style={{ backgroundImage: `linear-gradient(#21170f33,#21170f55),url("${background}")` }}><section className="commerce-card meeting-card"><nav className="meeting-topbar" aria-label="Meeting navigation"><a href="/mall" className="meeting-brand">Maya’s <span>✳</span></a><span>YOUR PERSONAL SHOPPING EXPERIENCE</span><button onClick={() => void leave()}>← Back to showroom</button></nav><header className="meeting-heading"><div><span className="eyebrow">PERSONAL ASSISTANCE</span><h1>A conversation, just for you.</h1></div><p>{info?.product ? `${info.product.name} · ${money(info.product.listedPrice)} · Cart quantity ${info.quantity}` : 'Showroom assistance'} · {info?.reason === 'pricing' ? 'Pricing discussion' : 'Human help'}</p></header>
 <p className="meeting-status" role="status">{state === 'CONNECTED' ? (users.length ? 'Another participant is connected.' : 'Waiting for a team member to join…') : state === 'RECONNECTING' ? 'Reconnecting…' : state === 'CONNECTING' ? 'Connecting to the meeting…' : 'Join when you’re ready. Camera and microphone access will be requested.'}</p>
 <div className="meeting-grid">{users.map(u => <Video key={String(u.uid)} track={u.videoTrack} label={`Participant ${u.uid}`}/>)}{!users.length && <div className="meeting-video meeting-waiting"><div className="meeting-welcome"><span className="meeting-person" aria-hidden="true">◯</span><h2>A little help, face to face.</h2><p>No representative is connected yet.<br />You can stay in this waiting room or return to the showroom.</p></div><span>Your product specialist</span></div>}<Video track={cameraOn ? camera : undefined} label="You"/></div>
 {error && <p role="alert">{error}</p>}
 <div className="shopping-actions meeting-toolbar" role="group" aria-label="Call controls">{state === 'PREVIEW' || state === 'DISCONNECTED' ? <button className="meeting-join" disabled={!info} onClick={() => void join()}>Join meeting</button> : <><button aria-pressed={!micOn} disabled={state !== 'CONNECTED'} onClick={() => void toggle('mic')}>{micOn ? 'Mute' : 'Unmute'}</button><button aria-pressed={!cameraOn} disabled={state !== 'CONNECTED'} onClick={() => void toggle('camera')}>{cameraOn ? 'Camera off' : 'Camera on'}</button><button disabled={state !== 'CONNECTED'} onClick={() => session.current?.resumeAudio()}>Enable audio</button></>}
 <button className="meeting-end" onClick={() => void leave()}>{state === 'PREVIEW' ? 'Return to showroom' : 'End call'}</button>
 <button onClick={() => { void navigator.clipboard.writeText(window.location.href).then(() => setCopied(true)).catch(() => setError('Copy the meeting URL from your address bar.')); }}>{copied ? 'Link copied' : 'Copy meeting link'}</button></div>
 <small>Demo meeting · anyone with this link may join · no automatic representative dispatch. Your conversation is not recorded.</small>
 </section></main>;
}
