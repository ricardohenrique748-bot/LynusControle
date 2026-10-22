import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search, Building2, Phone, Mail, MapPin, CheckCircle, Ban } from 'lucide-react';
import { CustomersService } from '../../services/customers.service.ts';
import { CustomerItem } from '../../types/index.ts';
import { customerSchema, CustomerFormData } from '../../lib/validations/index.ts';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import { Modal } from '../../components/ui/modal.tsx';
import { Badge } from '../../components/ui/badge.tsx';
import { useAuth } from '../../app/auth-context.tsx';

export function CustomersPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => CustomersService.getAll(),
  });

  const createCustomerMutation = useMutation({
    mutationFn: (data: CustomerFormData) =>
      CustomersService.create({
        ...data,
        status: 'active',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsModalOpen(false);
      reset();
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: CustomerItem['status'] }) =>
      CustomersService.toggleStatus(id, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      state: 'SP',
    },
  });

  const filteredCustomers = customers.filter((cust) => {
    const matchesSearch =
      cust.corporate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cust.trade_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cust.cnpj_cpf.includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || cust.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const onSubmit = (data: CustomerFormData) => {
    createCustomerMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Clientes Corporativos
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cadastro de empresas contratantes, controle de CNPJ, contratos e licenças ativas.
          </p>
        </div>
        {can('create_customer') && (
          <Button onClick={() => setIsModalOpen(true)} size="sm" variant="primary">
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Cliente
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-lg">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por razão, fantasia ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Segmented status filter buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-md self-stretch sm:self-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos ({customers.length})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              filterStatus === 'active'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ativos ({customers.filter((c) => c.status === 'active').length})
          </button>
          <button
            onClick={() => setFilterStatus('suspended')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              filterStatus === 'suspended'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Suspensos ({customers.filter((c) => c.status === 'suspended').length})
          </button>
        </div>
      </div>

      {/* High-Density Data Grid / Table */}
      <div className="rounded-lg bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-medium">
                <th className="py-3 px-4">Empresa / Razão Social</th>
                <th className="py-3 px-4">CNPJ / CPF</th>
                <th className="py-3 px-4">Localidade</th>
                <th className="py-3 px-4">Contato</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Carregando dados de clientes...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Nenhum cliente corporativo encontrado.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{cust.trade_name}</div>
                      <div className="text-[11px] text-slate-400">{cust.corporate_name}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300 tabular-nums">
                      {cust.cnpj_cpf}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {cust.city} / {cust.state}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{cust.email}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{cust.phone}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {cust.status === 'active' ? (
                        <Badge variant="success">Ativo</Badge>
                      ) : (
                        <Badge variant="danger">Suspenso</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {can('edit_customer') && (
                        <button
                          onClick={() =>
                            toggleStatusMutation.mutate({
                              id: cust.id,
                              newStatus: cust.status === 'active' ? 'suspended' : 'active',
                            })
                          }
                          className="px-2 py-1 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                        >
                          {cust.status === 'active' ? 'Suspender' : 'Reativar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Cliente */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Cadastrar Novo Cliente Corporativo"
        description="Os dados cadastrais serão persistidos com RLS e sincronizados no PostgreSQL."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Razão Social"
            placeholder="Ex: Comercial Distribuidora de Alimentos S.A."
            {...register('corporate_name')}
            error={errors.corporate_name?.message}
          />
          <Input
            label="Nome Fantasia"
            placeholder="Ex: Distribuidora Alvorada"
            {...register('trade_name')}
            error={errors.trade_name?.message}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="CNPJ ou CPF"
              placeholder="00.000.000/0001-00"
              {...register('cnpj_cpf')}
              error={errors.cnpj_cpf?.message}
            />
            <Input
              label="Telefone de Contato"
              placeholder="(11) 3456-7890"
              {...register('phone')}
              error={errors.phone?.message}
            />
          </div>
          <Input
            label="E-mail Corporativo"
            type="email"
            placeholder="financeiro@empresa.com.br"
            {...register('email')}
            error={errors.email?.message}
          />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input
                label="Cidade"
                placeholder="São Paulo"
                {...register('city')}
                error={errors.city?.message}
              />
            </div>
            <div>
              <Input
                label="UF"
                placeholder="SP"
                maxLength={2}
                {...register('state')}
                error={errors.state?.message}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting || createCustomerMutation.isPending}
            >
              Salvar Cliente
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
