import { z } from 'zod';

export const customerSchema = z.object({
  corporate_name: z.string().min(3, 'Razão social deve ter pelo menos 3 caracteres'),
  trade_name: z.string().min(2, 'Nome fantasia deve ter pelo menos 2 caracteres'),
  cnpj_cpf: z.string().min(11, 'Informe um CNPJ ou CPF válido'),
  email: z.string().email('E-mail corporativo inválido'),
  phone: z.string().min(8, 'Telefone de contato obrigatório'),
  city: z.string().min(2, 'Cidade obrigatória'),
  state: z.string().length(2, 'UF deve ter 2 letras (ex: SP)'),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

export const licenseIssueSchema = z.object({
  customer_id: z.string().min(1, 'Selecione o cliente'),
  system_id: z.string().min(1, 'Selecione o sistema'),
  contract_id: z.string().min(1, 'Selecione o contrato associado'),
  max_instances: z.number().int().min(1, 'Mínimo de 1 terminal').max(100, 'Máximo 100 terminais'),
  offline_lease_days: z.number().int().min(1, 'Mínimo de 1 dia').max(60, 'Máximo 60 dias'),
  duration_months: z.number().int().min(1).max(36),
});

export type LicenseIssueFormData = z.infer<typeof licenseIssueSchema>;

export const contractSchema = z.object({
  contract_number: z.string().min(4, 'Número do contrato obrigatório'),
  customer_id: z.string().min(1, 'Selecione o cliente'),
  system_id: z.string().min(1, 'Selecione o sistema'),
  plan_id: z.string().min(1, 'Selecione o plano'),
  value_brl: z.number().positive('O valor deve ser maior que zero'),
  billing_cycle: z.enum(['monthly', 'quarterly', 'annual']),
  due_day: z.number().int().min(1).max(28, 'Dia de vencimento entre 1 e 28'),
  grace_period_days: z.number().int().min(0).max(30),
  block_after_days: z.number().int().min(1).max(90),
  payment_method: z.enum(['pix', 'boleto', 'credit_card']),
  notes: z.string().optional(),
}).refine((d) => d.block_after_days >= d.grace_period_days, {
  path: ['block_after_days'],
  message: 'Deve ser maior ou igual aos dias de aviso',
});

export type ContractFormData = z.infer<typeof contractSchema>;

export const chargeSchema = z.object({
  customer_id: z.string().min(1, 'Selecione o cliente'),
  contract_id: z.string().min(1, 'Selecione o contrato'),
  amount_brl: z.number().positive('Valor da cobrança deve ser positivo'),
  due_date: z.string().min(8, 'Data de vencimento obrigatória'),
  payment_method: z.enum(['pix', 'boleto', 'credit_card']),
});

export type ChargeFormData = z.infer<typeof chargeSchema>;

export const fiscalDocSchema = z.object({
  doc_number: z.string().min(3, 'Identificação do documento fiscal obrigatória'),
  doc_type: z.enum(['nfe', 'nfse', 'cte', 'sped_fiscal', 'sped_contribuicoes']),
  customer_id: z.string().min(1, 'Selecione a empresa emitente'),
  competence_period: z.string().regex(/^\d{4}-\d{2}$/, 'Formato YYYY-MM (ex: 2026-10)'),
  file_size_kb: z.number().positive('Tamanho do arquivo deve ser informado'),
});

export type FiscalDocFormData = z.infer<typeof fiscalDocSchema>;

export const visitSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Informe o horário'),
  duration_min: z.number().int().min(15, 'Mínimo 15 minutos').max(720, 'Máximo 12 horas'),
  type: z.enum(['commercial', 'onboarding', 'support', 'training', 'other']),
  customer_id: z.string().optional(),
  client_name: z.string().trim().min(2, 'Informe o cliente ou prospect'),
  contact_name: z.string().trim(),
  phone: z.string().trim(),
  address: z.string().trim(),
  notes: z.string(),
});

export type VisitFormData = z.infer<typeof visitSchema>;
