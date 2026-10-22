import test from 'node:test';
import assert from 'node:assert/strict';
import { formatBRL, calculateMRR, evaluateDelinquency } from './finance.ts';

test('formats Brazilian Real properly', () => {
  const formatted = formatBRL(1250.5);
  // Contains R$ and comma for decimals
  assert.equal(formatted.includes('R$'), true);
  assert.equal(formatted.includes('1.250,50') || formatted.includes('1250,50'), true);
});

test('calculates MRR correctly across monthly, quarterly, and annual contracts', () => {
  const contracts = [
    { status: 'active', value_brl: 1200, billing_cycle: 'monthly' as const },
    { status: 'active', value_brl: 3000, billing_cycle: 'quarterly' as const }, // 1000/mo
    { status: 'active', value_brl: 12000, billing_cycle: 'annual' as const },   // 1000/mo
    { status: 'cancelled', value_brl: 5000, billing_cycle: 'monthly' as const }, // ignored
  ];

  const mrr = calculateMRR(contracts);
  assert.equal(mrr, 3200);
});

test('evaluates delinquency and automated suspension triggers', () => {
  const refDate = new Date('2026-10-18T00:00:00Z');

  // Invoices: 1 paid, 1 due in future, 1 overdue 3 days (within grace 5), 1 overdue 10 days (exceeds grace)
  const invoices = [
    { id: '1', amount_brl: 500, due_date: '2026-10-01', status: 'paid' as const },
    { id: '2', amount_brl: 750, due_date: '2026-10-25', status: 'pending' as const },
    { id: '3', amount_brl: 400, due_date: '2026-10-15', status: 'pending' as const }, // 3 days overdue
  ];

  const res1 = evaluateDelinquency(invoices, 5, refDate);
  assert.equal(res1.isDelinquent, true);
  assert.equal(res1.overdueCount, 1);
  assert.equal(res1.totalOverdueBRL, 400);
  assert.equal(res1.requiresSuspension, false); // 3 days < 5 days grace

  // Add invoice overdue by 10 days
  const invoicesWithSevere = [
    ...invoices,
    { id: '4', amount_brl: 900, due_date: '2026-10-08', status: 'pending' as const }, // 10 days overdue
  ];
  const res2 = evaluateDelinquency(invoicesWithSevere, 5, refDate);
  assert.equal(res2.isDelinquent, true);
  assert.equal(res2.overdueCount, 2);
  assert.equal(res2.totalOverdueBRL, 1300);
  assert.equal(res2.requiresSuspension, true); // 10 days > 5 days grace
});
