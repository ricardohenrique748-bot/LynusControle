import test from 'node:test';
import assert from 'node:assert/strict';
import { canPerformAction, getRoleLabel } from './permissions.ts';

test('validates admin role has universal privileges', () => {
  assert.equal(canPerformAction('admin', 'manage_systems'), true);
  assert.equal(canPerformAction('admin', 'delete_customer'), true);
  assert.equal(canPerformAction('admin', 'suspend_license'), true);
  assert.equal(canPerformAction('admin', 'validate_fiscal_doc'), true);
});

test('restricts finance and fiscal roles appropriately', () => {
  // Finance can reconcile and create charges, but cannot manage system architectures
  assert.equal(canPerformAction('finance', 'reconcile_finance'), true);
  assert.equal(canPerformAction('finance', 'create_charge'), true);
  assert.equal(canPerformAction('finance', 'manage_systems'), false);
  assert.equal(canPerformAction('finance', 'delete_customer'), false);

  // Fiscal can validate documents and download archives, but cannot issue licenses
  assert.equal(canPerformAction('fiscal', 'validate_fiscal_doc'), true);
  assert.equal(canPerformAction('fiscal', 'download_fiscal_archive'), true);
  assert.equal(canPerformAction('fiscal', 'issue_license'), false);
  assert.equal(canPerformAction('fiscal', 'create_charge'), false);

  // Support can reset hardware and issue licenses, but cannot reconcile finance
  assert.equal(canPerformAction('support', 'reset_hardware_binding'), true);
  assert.equal(canPerformAction('support', 'reconcile_finance'), false);
});

test('returns descriptive Portuguese role labels', () => {
  assert.equal(getRoleLabel('admin'), 'Administrador Global');
  assert.equal(getRoleLabel('finance'), 'Controladoria & Financeiro');
  assert.equal(getRoleLabel('fiscal'), 'Governança Fiscal');
  assert.equal(getRoleLabel('support'), 'Suporte & Operações');
});
