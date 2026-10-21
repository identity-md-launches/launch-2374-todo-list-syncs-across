import { useSyncExternalStore } from 'react';
import { isTask, type Task } from './model';
import { store } from './store';

type Phase = 'idle' | 'preparing' | 'waiting' | 'connecting' | 'connected' | 'disconnected' | 'error';
type PeerState = { phase: Phase; code: string; role: 'offer' | 'answer' | null; error: string; lastSync: string };
const INITIAL: PeerState = { phase: 'idle', code: '', role: null, error: '', lastSync: '' };

export function parseCode(raw: string, type: 'offer' | 'answer'): RTCSessionDescriptionInit {
  try {
    const clean = raw.trim().replace(/\s/g, '');
    if (!clean.startsWith('tandem1.') || clean.length > 50000) throw new Error();
    const data = JSON.parse(atob(clean.slice(8)));
    if (data.type !== type || typeof data.sdp !== 'string' || !data.sdp.startsWith('v=0') || data.sdp.length > 35000) throw new Error();
    return { type, sdp: data.sdp };
  } catch { throw new Error(`Paste the complete ${type === 'offer' ? 'pairing' : 'reply'} code from the other device.`); }
}

class PeerSync {
  private state: PeerState = INITIAL;
  private listeners = new Set<() => void>();
  private pc: RTCPeerConnection | null = null;
  private channel: RTCDataChannel | null = null;
  private timeout: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;
  private queue = new Map<string, Task>();
  private sent = new Map<string, Task>();

  constructor() {
    store.subscribe(() => { if (this.channel?.readyState === 'open') this.enqueue(); });
  }
  getState = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(update: Partial<PeerState>) { this.state = { ...this.state, ...update }; this.listeners.forEach(l => l()); }

  reset() {
    this.generation++;
    clearTimeout(this.timeout);
    if (this.channel) { this.channel.onclose = null; this.channel.onerror = null; this.channel.onmessage = null; this.channel.close(); }
    if (this.pc) { this.pc.onconnectionstatechange = null; this.pc.close(); }
    this.pc = null; this.channel = null; this.queue.clear(); this.sent.clear();
    this.set({ ...INITIAL });
  }

  private fail(message: string) { this.reset(); this.set({ phase: 'error', error: message }); }

  private create(acrossNetworks: boolean) {
    this.reset();
    if (!('RTCPeerConnection' in window)) throw new Error('This browser does not support device pairing. Try a current Chrome, Firefox, or Safari browser.');
    const pc = new RTCPeerConnection({ iceServers: acrossNetworks ? [{ urls: 'stun:stun.l.google.com:19302' }] : [] });
    this.pc = pc;
    pc.onconnectionstatechange = () => {
      if (pc !== this.pc) return;
      if (pc.connectionState === 'failed') this.fail('The devices could not connect. Try the same Wi-Fi network, turn off a VPN, and create a new code.');
      if (pc.connectionState === 'disconnected') this.set({ phase: 'disconnected', error: 'Connection interrupted. Keep both pages open. If it does not recover, pair again.' });
      if (pc.connectionState === 'connected' && this.channel?.readyState === 'open') this.set({ phase: 'connected', error: '' });
    };
    return pc;
  }

  private armTimeout() {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      if (this.state.phase !== 'connected') this.fail('Pairing timed out. Keep both pages open on the same Wi-Fi and create a fresh code.');
    }, 35000);
  }

  private attach(channel: RTCDataChannel) {
    this.channel = channel;
    channel.bufferedAmountLowThreshold = 32768;
    channel.onbufferedamountlow = () => this.flush();
    channel.onopen = () => {
      clearTimeout(this.timeout);
      this.set({ phase: 'connected', error: '', code: '' });
      this.enqueue();
      channel.send(JSON.stringify({ kind: 'hello', version: 1 }));
    };
    channel.onmessage = (event) => {
      try {
        if (typeof event.data !== 'string' || event.data.length > 16384) throw new Error();
        const message = JSON.parse(event.data);
        if (message.kind === 'task' && isTask(message.task)) {
          store.merge([message.task]);
          this.set({ lastSync: new Date().toISOString() });
        } else if (message.kind === 'hello' && message.version === 1) {
          this.set({ lastSync: new Date().toISOString() });
        } else throw new Error();
      } catch { this.fail('Sync received unsupported data or reached the task limit. Existing tasks were kept. Export a backup and pair again.'); }
    };
    channel.onclose = () => { if (this.channel === channel) this.set({ phase: 'disconnected', error: 'The other device disconnected. Your tasks are saved here. Pair again to resume syncing.' }); };
    channel.onerror = () => this.fail('Sync was interrupted. Your tasks are kept here. Create a new pairing code to reconnect.');
  }

  private enqueue() {
    for (const task of store.getState().tasks) if (this.sent.get(task.id) !== task) this.queue.set(task.id, task);
    this.flush();
  }
  private flush() {
    const channel = this.channel;
    if (!channel || channel.readyState !== 'open') return;
    try {
      for (const [id, task] of this.queue) {
        if (channel.bufferedAmount > 131072) break;
        channel.send(JSON.stringify({ kind: 'task', task }));
        this.sent.set(id, task); this.queue.delete(id);
      }
    } catch { this.fail('The connection stopped while sending tasks. Pair again to finish syncing.'); }
  }

  private async collect(pc: RTCPeerConnection) {
    if (pc.iceGatheringState !== 'complete') await new Promise<void>(resolve => {
      const finish = () => { clearTimeout(timer); pc.removeEventListener('icegatheringstatechange', check); resolve(); };
      const check = () => { if (pc.iceGatheringState === 'complete') finish(); };
      const timer = setTimeout(finish, 6000);
      pc.addEventListener('icegatheringstatechange', check);
    });
    if (!pc.localDescription?.sdp) throw new Error('A pairing code could not be created. Try again in a current browser.');
    return `tandem1.${btoa(JSON.stringify({ type: pc.localDescription.type, sdp: pc.localDescription.sdp }))}`;
  }

  async start(acrossNetworks: boolean) {
    let generation = this.generation;
    try {
      const pc = this.create(acrossNetworks); generation = this.generation;
      this.set({ phase: 'preparing', role: 'offer' });
      this.attach(pc.createDataChannel('tandem-tasks-v1', { ordered: true }));
      await pc.setLocalDescription(await pc.createOffer());
      const code = await this.collect(pc);
      if (generation === this.generation) this.set({ phase: 'waiting', code });
    } catch (error) { if (generation === this.generation) this.fail(error instanceof Error ? error.message : 'Pairing could not start. Try again.'); }
  }

  async join(raw: string, acrossNetworks: boolean) {
    const description = parseCode(raw, 'offer');
    const pc = this.create(acrossNetworks);
    const generation = this.generation;
    this.set({ phase: 'preparing', role: 'answer' });
    try {
      pc.ondatachannel = e => this.attach(e.channel);
      await pc.setRemoteDescription(description);
      await pc.setLocalDescription(await pc.createAnswer());
      const code = await this.collect(pc);
      if (generation === this.generation) this.set({ phase: 'waiting', code });
    } catch { if (generation === this.generation) this.fail('This pairing code could not be used. Ask the other device to create a fresh code.'); }
  }

  async finish(raw: string) {
    const description = parseCode(raw, 'answer');
    if (!this.pc) throw new Error('Create a new pairing code first.');
    try {
      await this.pc.setRemoteDescription(description);
      this.set({ phase: 'connecting', error: '' }); this.armTimeout();
    } catch { this.fail('This reply does not match the pairing session. Create a new code and try again.'); }
  }
}

export const peer = new PeerSync();
export const usePeer = () => useSyncExternalStore(peer.subscribe, peer.getState);
