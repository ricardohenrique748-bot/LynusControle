/**
 * Writes a BRL amount in Portuguese words, as used in commercial proposals.
 * e.g. 16000 -> "dezesseis mil reais", 1250.5 -> "mil, duzentos e cinquenta reais e cinquenta centavos"
 */

const UNITS = [
  'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove',
];
const TENS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const HUNDREDS = [
  '', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
  'seiscentos', 'setecentos', 'oitocentos', 'novecentos',
];

const SCALES: Array<[string, string]> = [
  ['', ''],
  ['mil', 'mil'],
  ['milhão', 'milhões'],
  ['bilhão', 'bilhões'],
];

function belowThousand(n: number): string {
  if (n === 100) return 'cem';
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h) parts.push(HUNDREDS[h]);
  if (rest) {
    if (rest < 20) parts.push(UNITS[rest]);
    else {
      const t = Math.floor(rest / 10);
      const u = rest % 10;
      parts.push(u ? `${TENS[t]} e ${UNITS[u]}` : TENS[t]);
    }
  }
  return parts.join(' e ');
}

export function integerToWords(n: number): string {
  if (n === 0) return 'zero';

  const groups: number[] = [];
  for (let v = n; v > 0; v = Math.floor(v / 1000)) groups.push(v % 1000);

  const chunks: Array<{ text: string; value: number }> = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (!g) continue;
    const [singular, plural] = SCALES[i];
    let text: string;
    if (i === 1 && g === 1) text = 'mil';
    else text = [belowThousand(g), g === 1 ? singular : plural].filter(Boolean).join(' ');
    chunks.push({ text, value: g });
  }

  // "e" before the last group when it is < 100 or a round hundred; comma otherwise
  return chunks.reduce((acc, chunk, idx) => {
    if (idx === 0) return chunk.text;
    const isLast = idx === chunks.length - 1;
    const joiner = isLast && (chunk.value < 100 || chunk.value % 100 === 0) ? ' e ' : ', ';
    return acc + joiner + chunk.text;
  }, '');
}

export function amountInWordsBRL(amount: number): string {
  const totalCents = Math.round(Math.abs(amount) * 100);
  const reais = Math.floor(totalCents / 100);
  const cents = totalCents % 100;

  const parts: string[] = [];
  if (reais > 0) {
    const words = integerToWords(reais);
    // "um milhão de reais", "dois milhões de reais"
    const needsDe = reais >= 1_000_000 && reais % 1_000_000 === 0;
    parts.push(`${words}${needsDe ? ' de' : ''} ${reais === 1 ? 'real' : 'reais'}`);
  }
  if (cents > 0) {
    parts.push(`${integerToWords(cents)} ${cents === 1 ? 'centavo' : 'centavos'}`);
  }
  return parts.length ? parts.join(' e ') : 'zero reais';
}
