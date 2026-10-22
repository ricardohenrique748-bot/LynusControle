import test from 'node:test';
import assert from 'node:assert/strict';
import { amountInWordsBRL } from './number-to-words.ts';

test('writes round thousands', () => {
  assert.equal(amountInWordsBRL(16000), 'dezesseis mil reais');
  assert.equal(amountInWordsBRL(8000), 'oito mil reais');
  assert.equal(amountInWordsBRL(1000), 'mil reais');
});

test('writes hundreds and tens', () => {
  assert.equal(amountInWordsBRL(100), 'cem reais');
  assert.equal(amountInWordsBRL(101), 'cento e um reais');
  assert.equal(amountInWordsBRL(1), 'um real');
  assert.equal(amountInWordsBRL(21), 'vinte e um reais');
});

test('joins groups with "e" or comma', () => {
  assert.equal(amountInWordsBRL(1500), 'mil e quinhentos reais');
  assert.equal(amountInWordsBRL(1050), 'mil e cinquenta reais');
  assert.equal(amountInWordsBRL(1250), 'mil, duzentos e cinquenta reais');
  assert.equal(amountInWordsBRL(16850), 'dezesseis mil, oitocentos e cinquenta reais');
});

test('writes millions and cents', () => {
  assert.equal(amountInWordsBRL(1_000_000), 'um milhão de reais');
  assert.equal(amountInWordsBRL(2_500_000), 'dois milhões e quinhentos mil reais');
  assert.equal(amountInWordsBRL(1250.5), 'mil, duzentos e cinquenta reais e cinquenta centavos');
  assert.equal(amountInWordsBRL(0.01), 'um centavo');
  assert.equal(amountInWordsBRL(0), 'zero reais');
});
