import test from 'node:test';
import assert from 'node:assert/strict';
import { changeTask, createTask, mergeTasks, nextStamp, parseSnapshot, snapshot, validDate } from '../src/model';

const task = () => createTask({ title: 'Book a train', list: 'Personal' }, { n: 1, actor: 'device-a' });

test('new tasks trim their names and round-trip through a backup', () => {
  const t = createTask({ title: '  Make time  ' }, { n: 1, actor: 'device-a' });
  assert.equal(t.title, 'Make time');
  assert.deepEqual(parseSnapshot(JSON.stringify(snapshot([t]))), [t]);
});

test('concurrent changes to separate fields are both retained, regardless of merge direction', () => {
  const t = task();
  const a = changeTask(t, { title: 'Book the morning train' }, { n: 2, actor: 'device-a' });
  const b = changeTask(t, { done: true }, { n: 2, actor: 'device-b' });
  const merged = mergeTasks([a], [b]);
  assert.equal(merged[0].title, a.title); assert.equal(merged[0].done, true);
  assert.deepEqual(merged, mergeTasks([b], [a]));
});

test('simultaneous same-field writes resolve deterministically', () => {
  const t = task();
  const a = changeTask(t, { title: 'A' }, { n: 2, actor: 'device-a' });
  const b = changeTask(t, { title: 'B' }, { n: 2, actor: 'device-b' });
  assert.equal(mergeTasks([a], [b])[0].title, 'B');
  assert.deepEqual(mergeTasks([a], [b]), mergeTasks([b], [a]));
});

test('deletion survives stale backups and concurrent non-deletion edits', () => {
  const t = task();
  const deleted = changeTask(t, { deleted: true }, { n: 2, actor: 'device-a' });
  const edited = changeTask(t, { notes: 'Meet at the station' }, { n: 3, actor: 'device-b' });
  const result = mergeTasks([deleted], [edited])[0];
  assert.equal(result.deleted, true); assert.equal(result.notes, edited.notes);
  assert.equal(mergeTasks([result], [t])[0].deleted, true);
});

test('undo is a newer replicated edit and clocks advance beyond remote revisions', () => {
  const deleted = changeTask(task(), { deleted: true }, { n: 45, actor: 'device-b' });
  const stamp = nextStamp([deleted], 'device-a');
  assert.equal(stamp.n, 46);
  const restored = changeTask(deleted, { deleted: false }, stamp);
  assert.equal(mergeTasks([deleted], [restored])[0].deleted, false);
});

test('merging is idempotent and retains records unique to both devices', () => {
  const a = task(), b = task();
  const merged = mergeTasks([a], [b]);
  assert.equal(merged.length, 2);
  assert.deepEqual(mergeTasks(merged, merged), merged);
});

test('invalid, duplicate, incompatible, and corrupted backups are rejected before applying', () => {
  const t = task();
  const bad: unknown[] = [null, {}, { ...snapshot([t]), version: 2 }, snapshot([t, t]), snapshot([{ ...t, title: '' }]), snapshot([{ ...t, due: '2026-02-30' }]), snapshot([{ ...t, list: 'Unknown' as never }]), snapshot([{ ...t, versions: {} as never }])];
  for (const value of bad) assert.throws(() => parseSnapshot(JSON.stringify(value)));
  assert.throws(() => parseSnapshot('{broken'));
});

test('calendar validation accepts optional dates and leap days, rejecting rollover and timestamps', () => {
  assert.equal(validDate(''), true); assert.equal(validDate('2028-02-29'), true);
  for (const value of ['2026-02-29', '2026-13-01', '2026-10-21T00:00:00Z', null]) assert.equal(validDate(value), false);
});
