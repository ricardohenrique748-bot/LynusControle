import test from 'node:test';
import assert from 'node:assert/strict';
import { VisitItem } from '../../types/index.ts';
import {
  addDays,
  endTime,
  findConflicts,
  googleCalendarLink,
  monthGrid,
  toDateKey,
  whatsappLink,
} from './agenda-utils.ts';

function visit(partial: Partial<VisitItem>): VisitItem {
  return {
    id: 'v1',
    date: '2026-10-22',
    start_time: '09:00',
    duration_min: 60,
    type: 'commercial',
    status: 'scheduled',
    client_name: 'A5Lu',
    contact_name: '',
    phone: '',
    address: '',
    notes: '',
    outcome: '',
    created_at: '',
    updated_at: '',
    ...partial,
  };
}

test('date keys use the local calendar day, also late in the evening', () => {
  assert.equal(toDateKey(new Date(2026, 9, 22, 23, 30)), '2026-10-22');
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
});

test('month grid starts on Sunday and covers 6 weeks', () => {
  const grid = monthGrid(2026, 9); // October 2026 starts on a Thursday
  assert.equal(grid.length, 42);
  assert.equal(grid[0], '2026-09-27');
  assert.equal(grid[4], '2026-10-01');
  assert.equal(grid[41], '2026-11-07');
});

test('end time wraps past midnight', () => {
  assert.equal(endTime('09:30', 90), '11:00');
  assert.equal(endTime('23:30', 60), '00:30');
});

test('overlapping scheduled visits on the same day conflict', () => {
  const existing = [
    visit({ id: 'a', start_time: '09:00', duration_min: 60 }),
    visit({ id: 'b', start_time: '14:00', duration_min: 60, status: 'cancelled' }),
    visit({ id: 'c', start_time: '09:30', date: '2026-10-23' }),
  ];
  assert.deepEqual(findConflicts({ date: '2026-10-22', start_time: '09:30', duration_min: 30 }, existing).map((v) => v.id), ['a']);
  // back-to-back is fine
  assert.equal(findConflicts({ date: '2026-10-22', start_time: '10:00', duration_min: 30 }, existing).length, 0);
  // cancelled visits do not block the slot
  assert.equal(findConflicts({ date: '2026-10-22', start_time: '14:00', duration_min: 30 }, existing).length, 0);
  // editing a visit does not conflict with itself
  assert.equal(findConflicts({ id: 'a', date: '2026-10-22', start_time: '09:15', duration_min: 30 }, existing).length, 0);
});

test('whatsapp link normalizes Brazilian numbers', () => {
  assert.equal(whatsappLink('(17) 99175-4230'), 'https://wa.me/5517991754230');
  assert.equal(whatsappLink('+55 17 99175-4230'), 'https://wa.me/5517991754230');
  assert.equal(whatsappLink('123'), null);
});

test('google calendar link carries local start/end and timezone', () => {
  const url = new URL(googleCalendarLink(visit({ start_time: '23:30', duration_min: 60, address: 'Rua A, 10' })));
  assert.equal(url.searchParams.get('dates'), '20261022T233000/20261023T003000');
  assert.equal(url.searchParams.get('ctz'), 'America/Sao_Paulo');
  assert.equal(url.searchParams.get('location'), 'Rua A, 10');
});
