import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Trash2,
  TriangleAlert,
  User,
  X,
} from 'lucide-react';
import { VisitsService } from '../../services/visits.service.ts';
import { CustomersService } from '../../services/customers.service.ts';
import { VisitItem } from '../../types/index.ts';
import { visitSchema, VisitFormData } from '../../lib/validations/index.ts';
import { Button } from '../../components/ui/button.tsx';
import { Input, Select } from '../../components/ui/input.tsx';
import { Modal } from '../../components/ui/modal.tsx';
import {
  VISIT_TYPES,
  endTime,
  findConflicts,
  googleCalendarLink,
  mapsLink,
  monthGrid,
  parseDateKey,
  sortVisits,
  toDateKey,
  whatsappLink,
} from './agenda-utils.ts';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DURATIONS = [30, 60, 90, 120, 180, 240, 480];

function formatDuration(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

function dayTitle(key: string) {
  const text = parseDateKey(key).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const textareaClass =
  'w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 resize-y';

export function AgendaPage() {
  const queryClient = useQueryClient();
  const today = toDateKey(new Date());
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState(today);
  const [formState, setFormState] = useState<{ open: boolean; editing: VisitItem | null }>({
    open: false,
    editing: null,
  });
  const [completing, setCompleting] = useState<VisitItem | null>(null);
  const [outcome, setOutcome] = useState('');

  const { data: visits = [] } = useQuery({ queryKey: ['visits'], queryFn: () => VisitsService.getAll() });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => CustomersService.getAll() });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['visits'] });
  const saveMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: VisitFormData }) =>
      id ? VisitsService.update(id, data) : VisitsService.create(data),
    onSuccess: (saved) => {
      invalidate();
      setFormState({ open: false, editing: null });
      setSelectedDay(saved.date);
      const d = parseDateKey(saved.date);
      setCursor({ year: d.getFullYear(), month: d.getMonth() });
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<VisitItem> }) => VisitsService.update(id, patch),
    onSuccess: invalidate,
  });
  const removeMutation = useMutation({ mutationFn: (id: string) => VisitsService.remove(id), onSuccess: invalidate });

  const byDay = useMemo(() => {
    const map = new Map<string, VisitItem[]>();
    for (const v of sortVisits(visits)) {
      map.set(v.date, [...(map.get(v.date) ?? []), v]);
    }
    return map;
  }, [visits]);

  const grid = monthGrid(cursor.year, cursor.month);
  const monthName = new Date(cursor.year, cursor.month, 1).toLocaleDateString('pt-BR', { month: 'long' });
  const monthLabel = `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} de ${cursor.year}`;
  const dayVisits = byDay.get(selectedDay) ?? [];
  const upcoming = sortVisits(visits)
    .filter((v) => v.status === 'scheduled' && v.date >= today)
    .slice(0, 6);
  const scheduledThisMonth = visits.filter(
    (v) => v.status === 'scheduled' && v.date.startsWith(`${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`)
  ).length;

  const moveMonth = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const goToday = () => {
    const d = new Date();
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
    setSelectedDay(today);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Agenda de Visitas</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Visitas comerciais, implantações, suporte e treinamentos nos clientes.
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={() => setFormState({ open: true, editing: null })}>
          <Plus className="w-4 h-4 mr-1.5" />
          Nova Visita
        </Button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        {/* Month calendar */}
        <div className="rounded-lg bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <div className="flex items-center gap-1">
              <button
                onClick={() => moveMonth(-1)}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="w-44 text-center text-sm font-semibold text-white">{monthLabel}</h2>
              <button
                onClick={() => moveMonth(1)}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                aria-label="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-xs text-slate-500">
                {scheduledThisMonth} {scheduledThisMonth === 1 ? 'visita agendada' : 'visitas agendadas'}
              </span>
              <Button size="sm" variant="outline" onClick={goToday}>
                Hoje
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/60">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-2 text-center text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {grid.map((key, i) => {
              const inMonth = parseDateKey(key).getMonth() === cursor.month;
              const items = (byDay.get(key) ?? []).filter((v) => v.status !== 'cancelled');
              const isToday = key === today;
              const isSelected = key === selectedDay;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDay(key)}
                  onDoubleClick={() => setFormState({ open: true, editing: null })}
                  className={`relative min-h-16 sm:min-h-24 p-1.5 text-left align-top border-slate-800 transition-colors cursor-pointer ${
                    i % 7 !== 6 ? 'border-r' : ''
                  } ${i < 35 ? 'border-b' : ''} ${isSelected ? 'bg-cyan-950/40' : 'hover:bg-slate-800/40'}`}
                  aria-label={`${dayTitle(key)}: ${items.length} visita(s)`}
                  aria-pressed={isSelected}
                >
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                      isToday
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : inMonth
                          ? 'text-slate-200'
                          : 'text-slate-600'
                    }`}
                  >
                    {parseDateKey(key).getDate()}
                  </span>
                  {/* Phones: dots */}
                  <div className="flex flex-wrap gap-1 mt-1 sm:hidden">
                    {items.slice(0, 4).map((v) => (
                      <span key={v.id} className={`w-1.5 h-1.5 rounded-full ${VISIT_TYPES[v.type].dot}`} />
                    ))}
                  </div>
                  {/* Larger screens: chips */}
                  <div className="hidden sm:block space-y-0.5 mt-0.5">
                    {items.slice(0, 3).map((v) => (
                      <div
                        key={v.id}
                        className={`truncate rounded border px-1 py-px text-[10px] leading-tight ${VISIT_TYPES[v.type].chip} ${
                          v.status === 'done' ? 'opacity-50 line-through' : ''
                        } ${inMonth ? '' : 'opacity-40'}`}
                      >
                        <span className="font-mono">{v.start_time}</span> {v.client_name}
                      </div>
                    ))}
                    {items.length > 3 && <div className="text-[10px] text-slate-500 px-1">+{items.length - 3} mais</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-white">{dayTitle(selectedDay)}</h2>
              <button
                onClick={() => setFormState({ open: true, editing: null })}
                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Agendar
              </button>
            </div>
            <div className="p-3 space-y-3">
              {dayVisits.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500">Nenhuma visita neste dia.</p>
              ) : (
                dayVisits.map((v) => (
                  <VisitCard
                    key={v.id}
                    visit={v}
                    onEdit={() => setFormState({ open: true, editing: v })}
                    onComplete={() => {
                      setOutcome('');
                      setCompleting(v);
                    }}
                    onCancel={() => {
                      if (window.confirm(`Cancelar a visita em ${v.client_name}?`)) {
                        updateMutation.mutate({ id: v.id, patch: { status: 'cancelled' } });
                      }
                    }}
                    onReopen={() => updateMutation.mutate({ id: v.id, patch: { status: 'scheduled' } })}
                    onDelete={() => {
                      if (window.confirm(`Excluir a visita em ${v.client_name}? Esta ação não pode ser desfeita.`)) {
                        removeMutation.mutate(v.id);
                      }
                    }}
                  />
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg bg-slate-900 border border-slate-800">
            <div className="px-4 py-3 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-white">Próximas visitas</h2>
            </div>
            {upcoming.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-slate-500">Nada agendado a partir de hoje.</p>
            ) : (
              <ul className="divide-y divide-slate-800/70">
                {upcoming.map((v) => (
                  <li key={v.id}>
                    <button
                      onClick={() => {
                        const d = parseDateKey(v.date);
                        setCursor({ year: d.getFullYear(), month: d.getMonth() });
                        setSelectedDay(v.date);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-800/40 cursor-pointer"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${VISIT_TYPES[v.type].dot}`} />
                      <span className="flex-1 min-w-0">
                        <span className="block truncate text-xs font-medium text-slate-200">{v.client_name}</span>
                        <span className="block text-[11px] text-slate-500">
                          {v.date === today
                            ? 'Hoje'
                            : parseDateKey(v.date).toLocaleDateString('pt-BR', {
                                weekday: 'short',
                                day: '2-digit',
                                month: '2-digit',
                              })}{' '}
                          · {v.start_time}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {formState.open && (
        <VisitFormModal
          key={formState.editing?.id ?? 'new'}
          editing={formState.editing}
          defaultDate={selectedDay}
          visits={visits}
          customers={customers}
          isSaving={saveMutation.isPending}
          onClose={() => setFormState({ open: false, editing: null })}
          onSubmit={(data) => saveMutation.mutate({ id: formState.editing?.id, data })}
        />
      )}

      {completing && (
        <Modal
          isOpen
          onClose={() => setCompleting(null)}
          title="Concluir visita"
          description={`${completing.client_name} · ${dayTitle(completing.date)} às ${completing.start_time}`}
          maxWidth="md"
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate({ id: completing.id, patch: { status: 'done', outcome: outcome.trim() } });
              setCompleting(null);
            }}
          >
            <label className="block">
              <span className="block text-xs font-medium text-slate-300 mb-1.5">Como foi a visita? (opcional)</span>
              <textarea
                className={textareaClass}
                rows={4}
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="Ex.: cliente gostou da demonstração, pediu proposta com o módulo de pneus."
                autoFocus
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setCompleting(null)}>
                Voltar
              </Button>
              <Button type="submit" size="sm" variant="primary">
                <Check className="w-4 h-4" /> Marcar como realizada
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function VisitCard({
  visit: v,
  onEdit,
  onComplete,
  onCancel,
  onReopen,
  onDelete,
}: {
  visit: VisitItem;
  onEdit: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onReopen: () => void;
  onDelete: () => void;
}) {
  const type = VISIT_TYPES[v.type];
  const wa = whatsappLink(v.phone);
  const maps = mapsLink(v.address);
  const linkClass =
    'inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white';

  return (
    <div
      className={`rounded-md border border-slate-800 bg-slate-950/60 p-3 space-y-2 ${
        v.status === 'cancelled' ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono">
              {v.start_time}–{endTime(v.start_time, v.duration_min)}
            </span>
            <span className={`rounded border px-1.5 py-px text-[10px] ${type.chip}`}>{type.label}</span>
          </div>
          <p className={`mt-1 text-sm font-semibold text-white truncate ${v.status === 'cancelled' ? 'line-through' : ''}`}>
            {v.client_name}
          </p>
        </div>
        {v.status === 'done' && (
          <span className="shrink-0 inline-flex items-center gap-1 text-[11px] text-emerald-300">
            <Check className="w-3.5 h-3.5" /> Realizada
          </span>
        )}
        {v.status === 'cancelled' && <span className="shrink-0 text-[11px] text-rose-300">Cancelada</span>}
      </div>

      <div className="space-y-0.5 text-xs text-slate-400">
        {v.contact_name && (
          <p className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 shrink-0" /> {v.contact_name}
          </p>
        )}
        {v.phone && (
          <p className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 shrink-0" /> {v.phone}
          </p>
        )}
        {v.address && (
          <p className="flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {v.address}
          </p>
        )}
      </div>

      {v.notes && <p className="text-xs text-slate-300 whitespace-pre-line">{v.notes}</p>}
      {v.status === 'done' && v.outcome && (
        <p className="text-xs text-emerald-200/90 bg-emerald-950/30 border border-emerald-900/50 rounded px-2 py-1.5 whitespace-pre-line">
          {v.outcome}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {maps && (
          <a href={maps} target="_blank" rel="noreferrer" className={linkClass}>
            <MapPin className="w-3 h-3" /> Rota
          </a>
        )}
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className={linkClass}>
            <MessageCircle className="w-3 h-3" /> WhatsApp
          </a>
        )}
        {v.status === 'scheduled' && (
          <a href={googleCalendarLink(v)} target="_blank" rel="noreferrer" className={linkClass}>
            <CalendarPlus className="w-3 h-3" /> Google Agenda
          </a>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
        <div className="flex gap-1">
          {v.status === 'scheduled' ? (
            <>
              <button onClick={onComplete} className="px-2 py-1 rounded text-[11px] font-medium text-emerald-300 hover:bg-emerald-950/50 cursor-pointer">
                Concluir
              </button>
              <button onClick={onCancel} className="px-2 py-1 rounded text-[11px] text-slate-400 hover:text-rose-300 hover:bg-slate-800 cursor-pointer">
                Cancelar
              </button>
            </>
          ) : (
            <button onClick={onReopen} className="px-2 py-1 rounded text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
              Reabrir
            </button>
          )}
        </div>
        <div className="flex gap-0.5">
          <button onClick={onEdit} className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-slate-800 cursor-pointer" aria-label="Editar visita">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded text-slate-500 hover:text-rose-300 hover:bg-slate-800 cursor-pointer" aria-label="Excluir visita">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function VisitFormModal({
  editing,
  defaultDate,
  visits,
  customers,
  isSaving,
  onClose,
  onSubmit,
}: {
  editing: VisitItem | null;
  defaultDate: string;
  visits: VisitItem[];
  customers: Awaited<ReturnType<typeof CustomersService.getAll>>;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (data: VisitFormData) => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VisitFormData>({
    resolver: zodResolver(visitSchema),
    defaultValues: editing
      ? {
          date: editing.date,
          start_time: editing.start_time,
          duration_min: editing.duration_min,
          type: editing.type,
          customer_id: editing.customer_id ?? '',
          client_name: editing.client_name,
          contact_name: editing.contact_name,
          phone: editing.phone,
          address: editing.address,
          notes: editing.notes,
        }
      : {
          date: defaultDate,
          start_time: '09:00',
          duration_min: 60,
          type: 'commercial',
          customer_id: '',
          client_name: '',
          contact_name: '',
          phone: '',
          address: '',
          notes: '',
        },
  });

  const [date, startTime, duration] = watch(['date', 'start_time', 'duration_min']);
  const conflicts =
    date && /^\d{2}:\d{2}$/.test(startTime ?? '')
      ? findConflicts({ id: editing?.id, date, start_time: startTime, duration_min: Number(duration) || 0 }, visits)
      : [];

  const customerId = watch('customer_id');
  useEffect(() => {
    if (!customerId || editing?.customer_id === customerId) return;
    const c = customers.find((x) => x.id === customerId);
    if (!c) return;
    setValue('client_name', c.trade_name || c.corporate_name, { shouldValidate: true });
    if (c.phone) setValue('phone', c.phone);
    if (c.city) setValue('address', `${c.city}${c.state ? ` - ${c.state}` : ''}`);
  }, [customerId, customers, editing?.customer_id, setValue]);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={editing ? 'Editar visita' : 'Agendar visita'}
      description="A visita aparece no calendário e pode ser enviada para o Google Agenda do celular."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {customers.length > 0 && (
          <Select
            label="Cliente cadastrado (opcional)"
            {...register('customer_id')}
            options={[
              { value: '', label: '— Prospect / digitar o nome —' },
              ...customers.map((c) => ({ value: c.id, label: c.trade_name || c.corporate_name })),
            ]}
          />
        )}
        <Input label="Cliente ou prospect" {...register('client_name')} error={errors.client_name?.message} />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Contato" {...register('contact_name')} />
          <Input label="Telefone / WhatsApp" placeholder="(17) 99999-9999" {...register('phone')} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Input label="Data" type="date" {...register('date')} error={errors.date?.message} />
          <Input label="Horário" type="time" {...register('start_time')} error={errors.start_time?.message} />
          <Select
            label="Duração"
            {...register('duration_min', { valueAsNumber: true })}
            error={errors.duration_min?.message}
            options={DURATIONS.map((d) => ({ value: d, label: formatDuration(d) }))}
          />
        </div>

        {conflicts.length > 0 && (
          <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-200">
            <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Conflito de horário com{' '}
              {conflicts.map((c) => `${c.client_name} (${c.start_time}–${endTime(c.start_time, c.duration_min)})`).join(', ')}.
              Você ainda pode salvar.
            </span>
          </div>
        )}

        <Select
          label="Tipo de visita"
          {...register('type')}
          options={Object.entries(VISIT_TYPES).map(([value, t]) => ({ value, label: t.label }))}
        />
        <Input label="Endereço" placeholder="Rua, número, bairro, cidade" {...register('address')} />
        <label className="block">
          <span className="block text-xs font-medium text-slate-300 mb-1.5">Observações</span>
          <textarea className={textareaClass} rows={3} placeholder="Objetivo da visita, o que levar..." {...register('notes')} />
        </label>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            <X className="w-4 h-4" /> Cancelar
          </Button>
          <Button type="submit" size="sm" variant="primary" isLoading={isSaving}>
            <CalendarDays className="w-4 h-4" /> {editing ? 'Salvar alterações' : 'Agendar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
