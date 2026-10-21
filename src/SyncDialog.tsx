import { useRef, useState } from 'react';
import { Icon } from './Icons';
import { Modal } from './Modal';
import { peer, usePeer } from './peer';

export function SyncDialog({ onClose }: { onClose: () => void }) {
  const sync = usePeer();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [input, setInput] = useState('');
  const [network, setNetwork] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const busy = sync.phase === 'preparing' || sync.phase === 'connecting';
  const submit = async () => {
    setError('');
    try {
      if (sync.role === 'offer' && sync.code) await peer.finish(input);
      else await peer.join(input, network);
    } catch (e) { setError(e instanceof Error ? e.message : 'The code could not be read. Try again.'); field.current?.focus(); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(sync.code); setCopied(true); }
    catch { setError('Copy is unavailable in this browser. Select the code below and copy it manually.'); }
  };
  const restart = () => { peer.reset(); setInput(''); setError(''); setCopied(false); };
  return <Modal title="Bring your devices together" onClose={onClose} wide>
    <div className="pair-art" aria-hidden="true"><Icon name="laptop" size={42} /><span className="pair-line" /><Icon name="sync" size={24} /><span className="pair-line" /><Icon name="phone" size={34} /></div>
    {sync.phase === 'connected' ? <>
      <div className="connection-success"><Icon name="done" /><h3>Connected to one device</h3></div>
      <p>Tasks, edits, and completions now sync in both directions. Keep both pages open. Each device keeps its own copy.</p>
      <p className="muted small">After closing or reloading either page, pair again. Changes made while apart merge when you reconnect.</p>
      <div className="dialog-actions"><button className="secondary" onClick={restart}>Disconnect device</button><button className="primary" onClick={onClose}>Back to my tasks<Icon name="arrow" /></button></div>
    </> : <>
      <p>Open Tandem on both devices. Exchange codes to sync your lists directly, without an account.</p>
      <div className="sync-notice"><Icon name="help" /><p>Both pages must stay open. Pair again after reloading. Use the same Wi-Fi for the most reliable connection.</p></div>
      {sync.phase === 'idle' || sync.phase === 'error' || sync.phase === 'disconnected' ? <>
        <div className="segmented" aria-label="Pairing method"><button aria-pressed={mode === 'create'} onClick={() => { setMode('create'); setError(''); }}>Create a code</button><button aria-pressed={mode === 'join'} onClick={() => { setMode('join'); setError(''); }}>Enter a code</button></div>
        {mode === 'create' ? <div className="step-copy"><h3>1. Start on this device</h3><p className="small muted">Create a pairing code, then send it privately to your other device.</p></div> : <><label htmlFor="pair-input">Pairing code from your other device</label><textarea ref={field} id="pair-input" rows={3} value={input} onChange={e => setInput(e.target.value)} placeholder="tandem1.…" spellCheck={false} autoComplete="off" aria-invalid={!!error} aria-describedby={error ? 'pair-error' : undefined} /></>}
        <label className="check-label"><input type="checkbox" checked={network} onChange={e => setNetwork(e.target.checked)} />Try connecting across different networks</label>
        {network && <p className="small muted">Uses Google’s public STUN service to discover a connection route. Tasks still travel directly. Some networks cannot connect without a relay; Tandem does not use one.</p>}
        <p className="small muted">Pair only with a device you trust. Pairing merges all tasks and lets either device edit or delete them.</p>
        <button className="primary full" onClick={() => mode === 'create' ? void peer.start(network) : void submit()}>{mode === 'create' ? 'Create pairing code' : 'Create reply code'}<Icon name="arrow" /></button>
      </> : null}
      {sync.code && sync.phase === 'waiting' && <>
        <h3>{sync.role === 'offer' ? '2. Send this code to your other device' : '2. Send this reply back'}</h3>
        <p className="small muted">{sync.role === 'offer' ? 'On that device, open Sync devices → Enter a code. Paste this code to create a reply.' : 'On the first device, paste this reply into the reply field and select Connect devices.'}</p>
        <label htmlFor="output-code">{sync.role === 'offer' ? 'Your pairing code' : 'Your reply code'}</label>
        <textarea id="output-code" className="code-field" readOnly rows={3} value={sync.code} onFocus={e => e.currentTarget.select()} spellCheck={false} />
        <button className="secondary full" onClick={() => void copy()}><Icon name={copied ? 'check' : 'copy'} />{copied ? 'Copied code' : 'Copy code'}</button>
        {sync.role === 'offer' ? <form className="reply-form" onSubmit={e => { e.preventDefault(); void submit(); }}><label htmlFor="pair-input">3. Paste the reply from your other device</label><textarea ref={field} id="pair-input" rows={3} value={input} onChange={e => setInput(e.target.value)} placeholder="tandem1.…" spellCheck={false} autoComplete="off" aria-invalid={!!error} aria-describedby={error ? 'pair-error' : undefined} /><button className="primary full" type="submit">Connect devices<Icon name="sync" /></button></form> : <p className="waiting"><span className="status-dot" />Waiting for the first device to connect…</p>}
      </>}
      {busy && <p className="waiting" role="status"><Icon name="sync" />{sync.phase === 'preparing' ? 'Preparing your code…' : 'Connecting your devices…'}</p>}
      {(error || sync.error) && <p id="pair-error" className="error" role="alert">{error || sync.error}</p>}
      {sync.phase !== 'idle' && <button className="text-button full" onClick={restart}>{busy ? 'Cancel pairing' : 'Start again'}</button>}
    </>}
  </Modal>;
}
