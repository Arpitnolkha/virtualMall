import type { IAgoraRTCClient, IAgoraRTCRemoteUser, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { preloadRtcSdk } from '@/lib/agora/rtcSession';
export interface MeetingCredentials {
    appId: string;
    channel: string;
    uid: number;
    token: string;
    expiresAt: number;
}
interface MeetingSink {
    users: (users: IAgoraRTCRemoteUser[]) => void;
    state: (state: string) => void;
    error: (message: string) => void;
    local: (track: ICameraVideoTrack) => void;
}
/** Independent client, only mounted on the human meeting route. No AI or avatar ownership. */
export class MeetingSession {
    private client: IAgoraRTCClient | null = null;
    private mic: IMicrophoneAudioTrack | null = null;
    private camera: ICameraVideoTrack | null = null;
    private disposed = false;
    private pending: Promise<void> | null = null;
    private leaving: Promise<void> | null = null;
    private expiry: ReturnType<typeof setTimeout> | null = null;
    constructor(private credentials: MeetingCredentials, private sink: MeetingSink, private renew: () => Promise<string>, private sdk = preloadRtcSdk) { }
    private users = () => { if (!this.disposed)
        this.sink.users([...(this.client?.remoteUsers ?? [])]); };
    private published = async (user: IAgoraRTCRemoteUser, type: 'audio' | 'video') => { try {
        await this.client?.subscribe(user, type);
        if (this.disposed)
            return;
        if (type === 'audio')
            user.audioTrack?.play();
        this.users();
    }
    catch {
        if (!this.disposed)
            this.sink.error('Remote media could not start. Try enabling audio or rejoining.');
    } };
    private renewal = async () => { try {
        const token = await this.renew();
        if (!this.disposed)
            await this.client?.renewToken(token);
    }
    catch {
        if (!this.disposed) {
            this.sink.error('Your meeting token expired. Leave and rejoin.');
            await this.dispose();
            this.sink.state('DISCONNECTED');
        }
    } };
    async join() { if (this.pending)
        return this.pending; this.pending = this.start(); return this.pending; }
    private async start() {
        try {
            const { default: sdk } = await this.sdk();
            if (this.disposed)
                return;
            sdk.setLogLevel(4);
            sdk.disableLogUpload();
            const client = this.client = sdk.createClient({ mode: 'rtc', codec: 'vp8' });
            client.on('user-joined', this.users);
            client.on('user-left', this.users);
            client.on('user-published', this.published);
            client.on('user-unpublished', this.users);
            client.on('token-privilege-will-expire', this.renewal);
            client.on('token-privilege-did-expire', this.renewal);
            client.on('connection-state-change', state => { if (!this.disposed)
                this.sink.state(state); });
            await client.join(this.credentials.appId, this.credentials.channel, this.credentials.token, this.credentials.uid);
            if (this.disposed) {
                await client.leave();
                return;
            }
            const mic = await sdk.createMicrophoneAudioTrack({ AEC: true, ANS: true, AGC: true });
            if (this.disposed) {
                mic.stop();
                mic.close();
                return;
            }
            this.mic = mic;
            try {
                const camera = await sdk.createCameraVideoTrack({ encoderConfig: '480p_1' });
                if (this.disposed) {
                    camera.stop();
                    camera.close();
                    return;
                }
                this.camera = camera;
                this.sink.local(camera);
            }
            catch {
                if (!this.disposed)
                    this.sink.error('Camera unavailable. You can continue with audio, or leave and retry camera access.');
            }
            if (this.disposed)
                return;
            await client.publish(this.camera ? [mic, this.camera] : [mic]);
            if (this.disposed)
                return;
            this.users();
            this.sink.state('CONNECTED');
            this.expiry = setTimeout(() => { this.sink.error('This demo meeting has expired.'); void this.dispose().then(() => this.sink.state('DISCONNECTED')); }, Math.max(0, this.credentials.expiresAt - Date.now()));
        }
        catch {
            const failed = !this.disposed;
            if (failed)
                this.sink.error('Could not join. Check microphone permissions and try again.');
            await this.dispose();
            if (failed)
                this.sink.state('DISCONNECTED');
        }
    }
    async setMic(enabled: boolean) { if (this.disposed || !this.mic) throw new Error('Microphone unavailable'); await this.mic.setEnabled(enabled); }
    async setCamera(enabled: boolean) { if (this.disposed || !this.camera)
        throw new Error('Camera unavailable'); await this.camera.setEnabled(enabled); }
    resumeAudio() { this.client?.remoteUsers.forEach(u => u.audioTrack?.play()); }
    dispose() {
        if (this.leaving)
            return this.leaving;
        this.disposed = true;
        if (this.expiry)
            clearTimeout(this.expiry);
        this.mic?.stop();
        this.mic?.close();
        this.camera?.stop();
        this.camera?.close();
        this.mic = null;
        this.camera = null;
        this.client?.remoteUsers.forEach(u => { u.audioTrack?.stop(); u.videoTrack?.stop(); });
        this.client?.removeAllListeners();
        this.leaving = (this.client?.leave() ?? Promise.resolve()).catch(() => { });
        return this.leaving;
    }
}
