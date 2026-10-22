import { VisitItem, VisitType } from '../../types/index.ts';

// All day keys are local calendar dates (YYYY-MM-DD). Never use toISOString() for them:
// in Brazil (UTC-3) an evening visit would land on the next UTC day.

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** 6 weeks × 7 days covering the month, starting on Sunday */
export function monthGrid(year: number, month: number): string[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => toDateKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)));
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function endTime(start: string, durationMin: number): string {
  const total = timeToMinutes(start) + durationMin;
  const h = Math.floor(total / 60) % 24;
  return `${String(h).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function sortVisits(list: VisitItem[]): VisitItem[] {
  return [...list].sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));
}

/** Scheduled visits on the same day whose time ranges overlap the candidate */
export function findConflicts(
  candidate: Pick<VisitItem, 'date' | 'start_time' | 'duration_min'> & { id?: string },
  visits: VisitItem[]
): VisitItem[] {
  const start = timeToMinutes(candidate.start_time);
  const end = start + candidate.duration_min;
  return visits.filter((v) => {
    if (v.id === candidate.id || v.status !== 'scheduled' || v.date !== candidate.date) return false;
    const vStart = timeToMinutes(v.start_time);
    return start < vStart + v.duration_min && vStart < end;
  });
}

export const VISIT_TYPES: Record<VisitType, { label: string; dot: string; chip: string }> = {
  commercial: { label: 'Comercial', dot: 'bg-cyan-400', chip: 'bg-cyan-950/70 text-cyan-200 border-cyan-800/70' },
  onboarding: { label: 'Implantação', dot: 'bg-violet-400', chip: 'bg-violet-950/70 text-violet-200 border-violet-800/70' },
  support: { label: 'Suporte', dot: 'bg-amber-400', chip: 'bg-amber-950/70 text-amber-200 border-amber-800/70' },
  training: { label: 'Treinamento', dot: 'bg-emerald-400', chip: 'bg-emerald-950/70 text-emerald-200 border-emerald-800/70' },
  other: { label: 'Outro', dot: 'bg-slate-400', chip: 'bg-slate-800 text-slate-300 border-slate-700' },
};

/** wa.me link for Brazilian numbers typed in any format */
export function whatsappLink(phone: string): string | null {
  let digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (!digits.startsWith('55')) digits = `55${digits}`;
  return `https://wa.me/${digits}`;
}

export function mapsLink(address: string): string | null {
  return address.trim() ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}` : null;
}

/** Pre-filled "add to Google Calendar" link so the visit shows up (with reminders) on the phone */
export function googleCalendarLink(v: VisitItem): string {
  const stamp = (key: string, time: string) => `${key.replace(/-/g, '')}T${time.replace(':', '')}00`;
  const endMinutes = timeToMinutes(v.start_time) + v.duration_min;
  const endKey = endMinutes >= 24 * 60 ? addDays(v.date, 1) : v.date;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Visita: ${v.client_name}`,
    dates: `${stamp(v.date, v.start_time)}/${stamp(endKey, endTime(v.start_time, v.duration_min))}`,
    ctz: 'America/Sao_Paulo',
    details: [
      `Tipo: ${VISIT_TYPES[v.type].label}`,
      v.contact_name && `Contato: ${v.contact_name}`,
      v.phone && `Telefone: ${v.phone}`,
      v.notes,
    ]
      .filter(Boolean)
      .join('\n'),
    location: v.address,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
