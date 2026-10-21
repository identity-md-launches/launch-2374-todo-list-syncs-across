export const LISTS = ['Personal', 'Work', 'Life'] as const;
export type ListName = typeof LISTS[number];
export type Values = { title: string; notes: string; list: ListName; due: string; important: boolean; done: boolean; deleted: boolean };
export type Field = keyof Values;
export type Stamp = { n: number; actor: string };
export type Task = Values & { id: string; createdAt: string; versions: Record<Field, Stamp> };
export type Snapshot = { format: 'tandem'; version: 1; tasks: Task[] };
export const FIELDS: Field[] = ['title', 'notes', 'list', 'due', 'important', 'done', 'deleted'];
export const STORAGE_KEY = 'tandem.tasks.v1';
export const MAX_TASKS = 10000;

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function validDate(value: unknown): value is string {
  if (value === '') return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isTask(value: unknown): value is Task {
  if (!value || typeof value !== 'object') return false;
  const t = value as Task;
  return typeof t.id === 'string' && /^[\w-]{1,80}$/.test(t.id) &&
    typeof t.createdAt === 'string' && t.createdAt.length <= 30 && !isNaN(Date.parse(t.createdAt)) &&
    typeof t.title === 'string' && t.title.trim().length > 0 && t.title.length <= 240 &&
    typeof t.notes === 'string' && t.notes.length <= 2000 && LISTS.includes(t.list) && validDate(t.due) &&
    typeof t.important === 'boolean' && typeof t.done === 'boolean' && typeof t.deleted === 'boolean' &&
    !!t.versions && FIELDS.every(f => {
      const s = t.versions[f];
      return s && Number.isSafeInteger(s.n) && s.n >= 0 && s.n < Number.MAX_SAFE_INTEGER - 1 &&
        typeof s.actor === 'string' && /^[\w-]{1,80}$/.test(s.actor);
    });
}

export function snapshot(tasks: Task[]): Snapshot { return { format: 'tandem', version: 1, tasks }; }

export function parseSnapshot(raw: string): Task[] {
  if (raw.length > 25_000_000) throw new Error('This backup is too large. Choose a Tandem backup under 25 MB.');
  let data: Snapshot;
  try { data = JSON.parse(raw) as Snapshot; } catch { throw new Error('Choose a valid Tandem JSON backup.'); }
  if (data?.format !== 'tandem' || data.version !== 1 || !Array.isArray(data.tasks) ||
      data.tasks.length > MAX_TASKS || !data.tasks.every(isTask) || new Set(data.tasks.map(t => t.id)).size !== data.tasks.length) {
    throw new Error('This is not a supported Tandem backup. Existing tasks have not changed.');
  }
  return data.tasks;
}

function compare(a: Stamp, b: Stamp) { return a.n - b.n || (a.actor < b.actor ? -1 : a.actor > b.actor ? 1 : 0); }

// Field-level logical clocks preserve simultaneous edits to different fields.
// Tombstones travel with snapshots, so reconnecting cannot resurrect a deletion.
export function mergeTasks(local: Task[], incoming: Task[]): Task[] {
  const merged = new Map(local.map(t => [t.id, t]));
  for (const task of incoming) {
    const current = merged.get(task.id);
    if (!current) { merged.set(task.id, task); continue; }
    let next = current;
    for (const field of FIELDS) {
      if (compare(task.versions[field], current.versions[field]) > 0) {
        next = { ...next, [field]: task[field], versions: { ...next.versions, [field]: task.versions[field] } };
      }
    }
    merged.set(task.id, next);
  }
  if (merged.size > MAX_TASKS) throw new Error('This list has reached its 10,000-task storage limit, including deleted tasks. Export a backup before starting a new list in another browser profile.');
  return [...merged.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function nextStamp(tasks: Task[], actor: string): Stamp {
  let n = 0;
  for (const task of tasks) for (const field of FIELDS) n = Math.max(n, task.versions[field].n);
  return { n: n + 1, actor };
}

export function createTask(values: Partial<Values> & { title: string }, stamp: Stamp): Task {
  return { notes: '', list: 'Personal', due: '', important: false, done: false, deleted: false,
    ...values, title: values.title.trim(), id: crypto.randomUUID(), createdAt: new Date().toISOString(),
    versions: Object.fromEntries(FIELDS.map(f => [f, stamp])) as Record<Field, Stamp> };
}

export function changeTask(task: Task, changes: Partial<Values>, stamp: Stamp): Task {
  const versions = { ...task.versions };
  for (const field of Object.keys(changes) as Field[]) versions[field] = stamp;
  return { ...task, ...changes, versions };
}

export function dateLabel(due: string) {
  if (!due) return '';
  if (due === today()) return 'Today';
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const date = new Date(`${due}T12:00:00`);
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' as const } : {}) }).format(date);
}
