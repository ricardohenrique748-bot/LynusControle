import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAccess, daysOverdue } from './access-policy.ts';

const NOW = new Date('2026-10-20T15:00:00Z');
const base = { license_status: 'active' as const, expires_at: '2027-10-01T00:00:00Z' };

test('counts whole days after the due date', () => {
  assert.equal(daysOverdue('2026-10-20', NOW), 0);
  assert.equal(daysOverdue('2026-10-19', NOW), 1);
  assert.equal(daysOverdue('2026-10-05', NOW), 15);
  assert.equal(daysOverdue('2026-10-25', NOW), 0); // not due yet
});

test('nothing overdue → active', () => {
  const d = evaluateAccess({ ...base, oldest_unpaid_due_date: null }, NOW);
  assert.equal(d.stage, 'active');
  assert.equal(d.reason, 'ok');
});

test('due today is still active', () => {
  assert.equal(evaluateAccess({ ...base, oldest_unpaid_due_date: '2026-10-20' }, NOW).stage, 'active');
});

test('1..5 days late → warning, with date read-only starts', () => {
  const d1 = evaluateAccess({ ...base, oldest_unpaid_due_date: '2026-10-19' }, NOW);
  assert.equal(d1.stage, 'warning');
  assert.equal(d1.days_overdue, 1);
  assert.equal(d1.next_stage_at, '2026-10-25T00:00:00.000Z'); // day 6
  assert.equal(evaluateAccess({ ...base, oldest_unpaid_due_date: '2026-10-15' }, NOW).stage, 'warning'); // day 5
});

test('6..15 days late → read only', () => {
  assert.equal(evaluateAccess({ ...base, oldest_unpaid_due_date: '2026-10-14' }, NOW).stage, 'read_only'); // day 6
  const d15 = evaluateAccess({ ...base, oldest_unpaid_due_date: '2026-10-05' }, NOW); // day 15
  assert.equal(d15.stage, 'read_only');
  assert.match(d15.message, /suspenso em 1 dia\./);
});

test('16+ days late → blocked for overdue', () => {
  const d = evaluateAccess({ ...base, oldest_unpaid_due_date: '2026-10-04' }, NOW);
  assert.equal(d.stage, 'blocked');
  assert.equal(d.reason, 'overdue');
  assert.equal(d.days_overdue, 16);
});

test('custom policy per contract', () => {
  const policy = { read_only_after_days: 2, block_after_days: 4 };
  assert.equal(evaluateAccess({ ...base, oldest_unpaid_due_date: '2026-10-18', policy }, NOW).stage, 'warning');
  assert.equal(evaluateAccess({ ...base, oldest_unpaid_due_date: '2026-10-17', policy }, NOW).stage, 'read_only');
  assert.equal(evaluateAccess({ ...base, oldest_unpaid_due_date: '2026-10-15', policy }, NOW).stage, 'blocked');
});

test('suspended / revoked / expired licenses are blocked', () => {
  assert.equal(
    evaluateAccess({ ...base, license_status: 'suspended', oldest_unpaid_due_date: null }, NOW).reason,
    'suspended'
  );
  assert.equal(
    evaluateAccess({ ...base, license_status: 'suspended', oldest_unpaid_due_date: '2026-10-01' }, NOW).reason,
    'overdue'
  );
  assert.equal(evaluateAccess({ ...base, license_status: 'revoked', oldest_unpaid_due_date: null }, NOW).reason, 'revoked');
  assert.equal(
    evaluateAccess({ ...base, expires_at: '2026-10-01T00:00:00Z', oldest_unpaid_due_date: null }, NOW).reason,
    'expired'
  );
});
