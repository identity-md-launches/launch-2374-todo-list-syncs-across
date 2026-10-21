import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Brand, EmptyArt, Icon, type IconName } from './Icons';
import { Modal } from './Modal';
import { SyncDialog } from './SyncDialog';
import { dateLabel, LISTS, parseSnapshot, snapshot, today, type ListName, type Task, type Values } from './model';
import { usePeer } from './peer';
import { store, useTasks } from './store';

type View = 'all' | 'today' | 'upcoming' | 'important' | 'completed' | ListName;
const VIEWS: { id: View; label: string; icon: IconName }[] = [
  { id: 'all', label: 'My tasks', icon: 'tasks' }, { id: 'today', label: 'Today', icon: 'sun' },
  { id: 'upcoming', label: 'Upcoming', icon: 'calendar' }, { id: 'important', label: 'Important', icon: 'star' },
  { id: 'completed', label: 'Completed', icon: 'done' },
];
const isList = (view: View): view is ListName => LISTS.includes(view as ListName);
function matches(task: Task, view: View, day: string) {
  if (task.deleted) return false;
  if (view === 'completed') return task.done;
  if (task.done) return false;
  if (view === 'today') return !!task.due && task.due <= day;
  if (view === 'upcoming') return task.due > day;
  if (view === 'important') return task.important;
  if (isList(view)) return task.list === view;
  return true;
}

function EditDialog({ task, onClose, onDelete }: { task: Task; onClose: () => void; onDelete: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [list, setList] = useState(task.list);
  const [due, setDue] = useState(task.due);
  const [important, setImportant] = useState(task.important);
  const [error, setError] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) { setError('Give this task a name.'); titleRef.current?.focus(); return; }
    // Only send changed fields, preserving fields edited by another device while this dialog was open.
    const next = { title: title.trim(), notes, list, due, important };
    const changes: Partial<Values> = {};
    for (const key of Object.keys(next) as (keyof typeof next)[]) if (next[key] !== task[key]) Object.assign(changes, { [key]: next[key] });
    store.update(task.id, changes); onClose();
  };
  return <Modal title="Edit task" onClose={onClose}><form onSubmit={save} className="edit-form">
    <label htmlFor="edit-title">Task name</label><input ref={titleRef} id="edit-title" name="title" value={title} maxLength={240} onChange={e => setTitle(e.target.value)} autoFocus aria-invalid={!!error} aria-describedby={error ? 'edit-error' : undefined} />
    {error && <p className="error" id="edit-error">{error}</p>}
    <div className="field-grid"><div><label htmlFor="edit-list">List</label><select id="edit-list" value={list} onChange={e => setList(e.target.value as ListName)}>{LISTS.map(l => <option key={l}>{l}</option>)}</select></div><div><label htmlFor="edit-date">Due date</label><input id="edit-date" type="date" value={due} onChange={e => setDue(e.target.value)} /></div></div>
    <label htmlFor="edit-notes">Notes <span className="muted">(optional)</span></label><textarea id="edit-notes" rows={4} value={notes} onChange={e => setNotes(e.target.value)} maxLength={2000} placeholder="A little context for later…" />
    <label className="check-label"><input type="checkbox" checked={important} onChange={e => setImportant(e.target.checked)} />Mark as important</label>
    <div className="dialog-actions"><button type="button" className="text-button danger" onClick={onDelete}><Icon name="trash" />Delete task</button><button className="primary" type="submit">Save changes<Icon name="check" /></button></div>
  </form></Modal>;
}

function BackupDialog({ onClose, notify }: { onClose: () => void; notify: (message: string) => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const exportTasks = () => {
    const blob = new Blob([JSON.stringify(snapshot(store.getState().tasks), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `tandem-backup-${today()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Backup downloaded. Keep it somewhere safe.');
  };
  return <Modal title="Your tasks, safely kept" onClose={onClose}>
    <p>Tasks are stored in this browser. Download a backup before clearing browser data or moving to another browser.</p>
    <h3>Save a copy</h3><p className="small muted">Your backup contains all tasks, notes, and deletion history. It is a readable file, so store it privately.</p>
    <button className="secondary full" onClick={exportTasks}><Icon name="download" />Download backup</button>
    <div className="import-section"><h3>Restore a backup</h3><p className="small muted">Choose a Tandem JSON file. Tasks merge with this device’s list; newer edits are kept.</p>
      <label htmlFor="backup-file">Backup file</label><input id="backup-file" type="file" accept=".json,application/json" disabled={busy} onChange={async e => {
        const file = e.target.files?.[0]; if (!file) return;
        setBusy(true); setError('');
        try { if (file.size > 25_000_000) throw new Error('Choose a backup smaller than 25 MB.'); const imported = parseSnapshot(await file.text()); store.merge(imported); notify('Backup merged. Your tasks are ready.'); onClose(); }
        catch (err) { setError(err instanceof Error ? err.message : 'This file could not be read. Choose a Tandem JSON backup.'); }
        finally { setBusy(false); }
      }} aria-describedby={error ? 'backup-error' : undefined} aria-invalid={!!error} />
      {busy && <p role="status">Reading backup…</p>}{error && <p id="backup-error" className="error" role="alert">{error}</p>}
    </div>
  </Modal>;
}

function TaskRow({ task, onEdit, onDelete }: { task: Task; onEdit: () => void; onDelete: () => void }) {
  const overdue = task.due && task.due < today() && !task.done;
  return <li className={`task-row ${task.done ? 'task-complete' : ''}`}>
    <label className="task-check"><input type="checkbox" checked={task.done} onChange={e => store.update(task.id, { done: e.target.checked })} aria-label={`${task.done ? 'Mark incomplete' : 'Complete'}: ${task.title}`} /><span className="checkbox-art"><Icon name="check" size={15} /></span></label>
    <div className="task-body"><button className="task-edit" onClick={onEdit} aria-label={`Edit ${task.title}`} aria-describedby={`task-meta-${task.id}`}><span className="task-title" dir="auto">{task.title}</span></button><span className="task-meta" id={`task-meta-${task.id}`}><span className={`list-marker ${task.list.toLowerCase()}`} />{task.list}{task.due && <span className={overdue ? 'overdue' : ''}><Icon name="calendar" size={14} />{overdue ? `${dateLabel(task.due)} · Overdue` : dateLabel(task.due)}</span>}{task.notes && <span className="note-indicator">Has notes</span>}</span></div>
    <button className={`icon-button star-button ${task.important ? 'is-important' : ''}`} aria-label={`${task.important ? 'Unmark' : 'Mark'} important: ${task.title}`} aria-pressed={task.important} onClick={() => store.update(task.id, { important: !task.important })}><Icon name="star" size={19} /></button>
    <button className="icon-button row-delete" aria-label={`Delete ${task.title}`} onClick={onDelete}><Icon name="trash" size={18} /></button>
  </li>;
}

export default function App() {
  const { tasks, storageError } = useTasks();
  const sync = usePeer();
  const [view, setView] = useState<View>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [newTitle, setNewTitle] = useState('');
  const [details, setDetails] = useState(false);
  const [newList, setNewList] = useState<ListName>('Personal');
  const [newDue, setNewDue] = useState('');
  const [newImportant, setNewImportant] = useState(false);
  const [formError, setFormError] = useState('');
  const [dialog, setDialog] = useState<'sync' | 'backup' | 'help' | null>(null);
  const [edit, setEdit] = useState<Task | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);
  const [day, setDay] = useState(today());
  const titleRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { const interval = setInterval(() => setDay(today()), 30000); return () => clearInterval(interval); }, []);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape' && mobileNav) { setMobileNav(false); menuRef.current?.focus(); } };
    window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape);
  }, [mobileNav]);
  const live = useMemo(() => tasks.filter(t => !t.deleted), [tasks]);
  const completed = live.filter(t => t.done).length;
  const remaining = live.length - completed;
  const dueToday = live.filter(t => !t.done && t.due && t.due <= day).length;
  const percent = live.length ? Math.round(completed / live.length * 100) : 0;
  const visible = live.filter(t => matches(t, view, day) && `${t.title} ${t.notes}`.toLowerCase().includes(query.toLowerCase().trim())).sort((a, b) => {
    if (sort === 'due') return (a.due || '9999').localeCompare(b.due || '9999') || a.createdAt.localeCompare(b.createdAt);
    if (sort === 'important') return Number(b.important) - Number(a.important) || b.createdAt.localeCompare(a.createdAt);
    if (sort === 'alphabetical') return a.title.localeCompare(b.title);
    return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
  });
  const title = VIEWS.find(v => v.id === view)?.label || view;
  const notify = (message: string) => setToast({ message });
  const navigate = (next: View) => { setView(next); setQuery(''); setMobileNav(false); setFormError(''); if (isList(next)) setNewList(next); setNewDue(next === 'today' ? day : ''); setNewImportant(next === 'important'); };
  const remove = (task: Task) => { store.update(task.id, { deleted: true }); setEdit(null); setToast({ message: 'Task deleted.', undo: () => { store.update(task.id, { deleted: false }); notify('Task restored.'); } }); };
  const add = (event?: FormEvent, suggestion?: string) => {
    event?.preventDefault();
    const text = (suggestion || newTitle).trim();
    if (!text) { setFormError('What would you like to get done? Add a task name.'); titleRef.current?.focus(); return; }
    try {
      const added = store.add({ title: text, list: isList(view) ? view : newList, due: newDue, important: newImportant });
      setNewTitle(''); setFormError('');
      if (!matches(added, view, day)) setView('all');
      setQuery(''); notify('Task added. One thing less to remember.'); titleRef.current?.focus();
    } catch (error) { setFormError(error instanceof Error ? error.message : 'This task could not be added. Export a backup and try again.'); }
  };
  const nav = <>
    <div className="workspace"><span className="workspace-avatar">P</span><span>Personal space<span className="workspace-sub">A little more together</span></span></div>
    <nav aria-label="Task views" className="main-nav">{VIEWS.map(item => <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} aria-current={view === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><Icon name={item.icon} /><span>{item.label}</span><span className="nav-count">{tasks.filter(t => matches(t, item.id, day)).length}</span></button>)}</nav>
    <div className="list-nav"><h2>My lists</h2><nav aria-label="Lists">{LISTS.map(list => <button key={list} className={`nav-item ${view === list ? 'active' : ''}`} aria-current={view === list ? 'page' : undefined} onClick={() => navigate(list)}><span className={`list-marker ${list.toLowerCase()}`} /><span>{list}</span><span className="nav-count">{tasks.filter(t => matches(t, list, day)).length}</span></button>)}</nav></div>
    <div className="sidebar-bottom"><div className="local-note"><Icon name="leaf" size={20} /><span>Yours to keep<br /><span className="muted">No account needed</span></span></div><button className="nav-item" onClick={() => { setDialog('backup'); setMobileNav(false); }}><Icon name="download" /><span>Backup & restore</span></button><button className="nav-item" onClick={() => { setDialog('help'); setMobileNav(false); }}><Icon name="help" /><span>A little help</span></button></div>
  </>;

  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to tasks</a>
    <aside className="sidebar"><button className="brand-button" onClick={() => navigate('all')} aria-label="Tandem home"><Brand /></button>{nav}</aside>
    <div className="page">
      <header className="topbar"><div className="topbar-leading"><button ref={menuRef} className="icon-button mobile-menu" aria-label={mobileNav ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileNav} aria-controls="mobile-navigation" onClick={() => setMobileNav(!mobileNav)}><Icon name={mobileNav ? 'close' : 'menu'} /></button><span className="mobile-brand"><Brand /></span><span className="breadcrumb">My workspace <Icon name="chevron" size={14} /><span>{title}</span></span></div>
        <div className="header-actions"><span className="save-status"><span className={`status-dot ${storageError ? 'warning' : ''}`} />{storageError ? 'Not saved' : 'Saved on this device'}</span><button className="sync-button" onClick={() => setDialog('sync')}><Icon name="sync" size={17} /><span>{sync.phase === 'connected' ? 'Live sync' : 'Sync devices'}</span>{sync.phase === 'connected' && <span className="status-dot" />}</button></div>
      </header>
      {mobileNav && <div id="mobile-navigation" className="mobile-navigation">{nav}</div>}
      <main id="main" tabIndex={-1}>
        <div className="page-heading"><div><h1>{title}<span className="heading-dot">.</span></h1><p>{view === 'all' ? 'A little more headspace for your day.' : view === 'today' ? 'Today’s tasks and anything that needs catching up.' : view === 'upcoming' ? 'A little planning for what comes next.' : view === 'completed' ? 'Take a moment to see how far you’ve come.' : view === 'important' ? 'Keep what matters close at hand.' : `A place for everything ${title.toLowerCase()}.`}</p></div><div className="date-display"><Icon name="calendar" size={17} /><span>{new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${day}T12:00:00`))}</span></div></div>
        {storageError && <div className="storage-warning" role="alert"><p>{storageError}</p><button className="secondary" onClick={() => setDialog('backup')}>Export backup</button></div>}
        <div className="content-grid"><section className="task-section" aria-label="Your tasks">
          <form className="composer" onSubmit={e => add(e)}>
            <div className="composer-main"><Icon name="plus" /><label className="sr-only" htmlFor="new-task">New task</label><input id="new-task" ref={titleRef} name="task" autoComplete="off" maxLength={240} value={newTitle} onChange={e => { setNewTitle(e.target.value); if (formError) setFormError(''); }} placeholder="What’s on your mind?" aria-invalid={!!formError} aria-describedby={formError ? 'task-error' : undefined} /><button className="primary add-button" type="submit"><span>Add task</span><Icon name="arrow" size={17} /></button></div>
            <div className="composer-bottom"><button className="details-button" type="button" aria-expanded={details} aria-controls="task-options" onClick={() => setDetails(!details)}><Icon name="settings" size={16} />{details ? 'Hide details' : 'Add details'}<span aria-hidden="true">{details ? '−' : '+'}</span></button><span className="enter-hint">or press Enter</span></div>
            {details && <div id="task-options" className="task-options"><div><label htmlFor="new-list">List</label><select id="new-list" value={isList(view) ? view : newList} onChange={e => { setNewList(e.target.value as ListName); if (isList(view)) setView(e.target.value as ListName); }}>{LISTS.map(l => <option key={l}>{l}</option>)}</select></div><div><label htmlFor="new-due">Due date</label><input id="new-due" type="date" value={newDue} onChange={e => setNewDue(e.target.value)} /></div><label className="check-label"><input type="checkbox" checked={newImportant} onChange={e => setNewImportant(e.target.checked)} />Important</label></div>}
            {formError && <p className="error" id="task-error" role="alert">{formError}</p>}
          </form>
    {toast && <div className="toast" role="region" aria-label="Task notification"><Icon name="check" size={19} /><span>{toast.message}</span>{toast.undo && <button className="text-button" onClick={toast.undo}>Undo</button>}<button className="icon-button" aria-label="Dismiss message" onClick={() => setToast(null)}><Icon name="close" size={16} /></button></div>}
          <div className="list-toolbar"><h2>{view === 'completed' ? 'Done & dusted' : 'Your list'} <span className="count-badge">{visible.length}</span></h2><div className="sort-control"><Icon name="settings" size={15} /><label className="sr-only" htmlFor="sort">Sort tasks</label><select id="sort" value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Newest first</option><option value="due">Due date</option><option value="important">Important first</option><option value="alphabetical">A to Z</option></select></div></div>
          {live.length > 0 && <div className="search-field"><Icon name="search" size={18} /><label className="sr-only" htmlFor="search">Search tasks</label><input id="search" type="search" autoComplete="off" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a task…" />{query && <button className="icon-button" aria-label="Clear search" onClick={() => setQuery('')}><Icon name="close" size={16} /></button>}</div>}
          {visible.length ? <ul className="task-list">{visible.map(task => <TaskRow key={task.id} task={task} onEdit={() => setEdit(task)} onDelete={() => remove(task)} />)}</ul> : <div className="empty-state"><EmptyArt /><h2>{query ? 'Nothing by that name' : view === 'completed' ? 'Good things take a first step' : live.length === 0 ? 'Room for a fresh start' : view === 'today' ? 'A little breathing room' : 'All clear here'}</h2><p>{query ? 'Try a different word or clear your search.' : view === 'completed' ? 'Check off a task and it will find a home here.' : live.length === 0 ? 'Big plans or small reminders. It starts with one task.' : view === 'today' ? 'No tasks due today. Add one above or enjoy the space.' : 'Add a task above, or explore another list.'}</p>{query && <button className="secondary" onClick={() => setQuery('')}>Clear search</button>}{!live.length && !query && view !== 'completed' && <div className="starter-tasks"><span>Need a starting point?</span><div>{['Plan my week', 'Go for a walk', 'Read 10 pages'].map(s => <button className="suggestion" key={s} onClick={() => add(undefined, s)}><Icon name="plus" size={14} />{s}</button>)}</div></div>}</div>}
          <div className="list-footer"><span><Icon name="check" size={15} />{remaining} {remaining === 1 ? 'task' : 'tasks'} to go</span><span className="local-footer">{storageError ? 'Not saved to browser' : sync.phase === 'connected' ? 'Connected to one device' : 'Saved locally'}</span></div>
        </section>
        <aside className="overview" aria-label="Task overview"><section className="progress-panel"><div className="panel-heading"><h2>A little progress</h2><Icon name="sun" size={21} /></div><div className="progress-visual"><svg viewBox="0 0 140 140" width="140" height="140" aria-hidden="true"><circle cx="70" cy="70" r="58" className="progress-track" /><circle cx="70" cy="70" r="58" className="progress-value" strokeDasharray={`${percent * 3.644} 364.4`} transform="rotate(-90 70 70)" /></svg><div><strong>{percent}<span>%</span></strong><span>complete</span></div></div><p>{completed ? 'Every checkmark counts.' : 'Small steps add up.'}</p><div className="progress-stats"><div><strong>{dueToday}</strong><span>Due today</span></div><div><strong>{completed}</strong><span>Completed</span></div></div></section>
          <section className="sync-panel"><div className="device-sketch" aria-hidden="true"><Icon name="laptop" size={36} /><span>···</span><Icon name="phone" size={29} /></div><h2>{sync.phase === 'connected' ? 'A little more connected' : 'Your list, wherever you are'}</h2><p>{sync.phase === 'connected' ? 'Edits sync while both pages stay open.' : 'Pair a second device and keep your tasks together.'}</p><button className="text-button" onClick={() => setDialog('sync')}>{sync.phase === 'connected' ? 'Manage connection' : 'Connect a device'}<Icon name="arrow" size={17} /></button></section>
          <div className="quiet-note"><Icon name="leaf" size={17} /><span>Less to remember.<br />More room for your day.</span></div>
        </aside></div>
        <footer className="page-footer"><span>A little more done, together.</span><button className="text-button" onClick={() => setDialog('backup')}><Icon name="download" size={15} />Keep a backup</button></footer>
      </main>
    </div>
    <div className="announcer sr-only" role="status" aria-live="polite">{toast?.message || ''}</div>

    {dialog === 'sync' && <SyncDialog onClose={() => setDialog(null)} />}
    {dialog === 'backup' && <BackupDialog onClose={() => setDialog(null)} notify={notify} />}
    {dialog === 'help' && <Modal title="A little help" onClose={() => setDialog(null)}><div className="help-content"><h3>Make a little space</h3><p>Add a task and press Enter. Use Add details to choose a list, due date, or importance. Select a task to edit it or add notes.</p><h3>Find your focus</h3><p>Today includes overdue tasks. Upcoming shows future tasks. Check off a task to move it to Completed; uncheck it there to bring it back.</p><h3>Keep your devices together</h3><p>Sync devices connects two open pages directly. Exchange pairing and reply codes through a private channel. There is no cloud account or background sync. Closing either page ends the session.</p><h3>Keep a copy</h3><p>Each browser stores tasks locally. Clearing browser data removes that copy. Download a backup regularly; restore it on any device to merge your tasks.</p></div></Modal>}
    {edit && <EditDialog task={edit} onClose={() => setEdit(null)} onDelete={() => remove(edit)} />}
  </div>;
}
