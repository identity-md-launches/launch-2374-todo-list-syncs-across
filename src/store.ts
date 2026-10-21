import { useSyncExternalStore } from 'react';
import { changeTask, createTask, mergeTasks, nextStamp, parseSnapshot, snapshot, STORAGE_KEY, type Task, type Values } from './model';

type State = { tasks: Task[]; storageError: string };

class TaskStore {
  private actor = crypto.randomUUID();
  private listeners = new Set<() => void>();
  private blocked = false;
  private state: State = { tasks: [], storageError: '' };

  constructor() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.state.tasks = parseSnapshot(raw);
    } catch {
      this.blocked = true;
      this.state.storageError = 'Saved tasks could not be read. New changes stay in this tab. Export a backup before closing it; the previous storage is preserved.';
    }
    window.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try { this.merge(parseSnapshot(event.newValue)); }
      catch { this.setError('Another tab supplied unreadable data. Existing tasks have been kept. Export a backup before closing.'); }
    });
  }

  getState = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit() { this.listeners.forEach(l => l()); }
  private setError(message: string) { this.state = { ...this.state, storageError: message }; this.emit(); }

  private commit(tasks: Task[]) {
    if (tasks.length === this.state.tasks.length && tasks.every((t, i) => t === this.state.tasks[i])) return;
    let storageError = this.state.storageError;
    if (!this.blocked) {
      try {
        // Read-before-write also protects edits made by a tab whose storage event has not arrived.
        const current = localStorage.getItem(STORAGE_KEY);
        if (current) tasks = mergeTasks(tasks, parseSnapshot(current));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot(tasks)));
        storageError = '';
      } catch { storageError = 'Changes are in this tab, but browser storage is unavailable or full. Export a backup before closing.'; }
    }
    this.state = { tasks, storageError };
    this.emit();
  }

  add(values: Partial<Values> & { title: string }) {
    const task = createTask(values, nextStamp(this.state.tasks, this.actor));
    this.commit(mergeTasks(this.state.tasks, [task]));
    return task;
  }
  update(id: string, values: Partial<Values>) {
    const task = this.state.tasks.find(t => t.id === id);
    if (!task) return;
    this.commit(mergeTasks(this.state.tasks, [changeTask(task, values, nextStamp(this.state.tasks, this.actor))]));
  }
  merge(tasks: Task[]) { this.commit(mergeTasks(this.state.tasks, tasks)); }
}

export const store = new TaskStore();
export const useTasks = () => useSyncExternalStore(store.subscribe, store.getState);
