import React, { useState, useEffect } from 'react';
import { supabaseAdmin } from '../utils/supabaseAdmin.ts';

interface Snapshot {
  id: string;
  scenario_id: string;
  scenario_name: string;
  scenario_data: any;
  variants_data: any[];
  action: string;
  description: string;
  version: number;
  created_at: string;
}

interface ScenarioVersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (snapshotId: string) => Promise<boolean>;
}

const ACTION_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  update: { label: 'Atualizado', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  delete: { label: 'Excluído', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  migrate: { label: 'Migração', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
  bulk_replace: { label: 'Substituição', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
};

const ScenarioVersionHistory: React.FC<ScenarioVersionHistoryProps> = ({ isOpen, onClose, onRestore }) => {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) fetchSnapshots();
  }, [isOpen]);

  const fetchSnapshots = async () => {
    setLoading(true);
    const { data, error } = await supabaseAdmin
      .from('scenario_snapshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (data) setSnapshots(data);
    if (error) console.error('[Snapshots] Fetch error:', error.message);
    setLoading(false);
  };

  const handleRestore = async (snapshot: Snapshot) => {
    const rangeCount = Object.keys(snapshot.scenario_data?.ranges || {}).length;
    const variantCount = (snapshot.variants_data || []).length;

    const confirmMsg = [
      `🔄 RESTAURAR CENÁRIO`,
      ``,
      `Nome: ${snapshot.scenario_name}`,
      `Versão: v${snapshot.version}`,
      `Data do backup: ${new Date(snapshot.created_at).toLocaleString('pt-BR')}`,
      `Ranges: ${rangeCount} mãos`,
      variantCount > 0 ? `Variantes: ${variantCount} boards` : '',
      ``,
      `O estado atual será salvo como backup antes da reversão.`,
      `Deseja continuar?`,
    ].filter(Boolean).join('\n');

    if (!window.confirm(confirmMsg)) return;

    setRestoring(snapshot.id);
    const ok = await onRestore(snapshot.id);
    setRestoring(null);
    if (ok) {
      setSuccess(`Cenário "${snapshot.scenario_name}" restaurado com sucesso!`);
      setTimeout(() => setSuccess(''), 4000);
      await fetchSnapshots();
    }
  };

  const filtered = filter === 'all'
    ? snapshots
    : snapshots.filter(s => s.action === filter);

  // Agrupar por cenário
  const grouped = filtered.reduce<Record<string, Snapshot[]>>((acc, snap) => {
    const key = snap.scenario_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(snap);
    return acc;
  }, {});

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0d0d0d] border border-white/10 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-white font-black uppercase tracking-tighter text-lg">Histórico de Versões</h2>
            <p className="text-gray-500 text-xs font-bold mt-1">
              {snapshots.length} backup{snapshots.length !== 1 ? 's' : ''} salvos — restaure qualquer versão anterior
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-500 hover:text-white transition-all text-sm"
          >
            ✕
          </button>
        </div>

        {/* Success toast */}
        {success && (
          <div className="mx-6 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold text-center">
            ✓ {success}
          </div>
        )}

        {/* Filters */}
        <div className="px-6 pt-4 flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'update', label: 'Atualizações' },
            { key: 'delete', label: 'Exclusões' },
            { key: 'migrate', label: 'Migrações' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                filter === f.key
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="text-center py-12 text-gray-500 text-sm font-bold">Carregando backups...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm font-bold">Nenhum backup encontrado</p>
              <p className="text-gray-600 text-xs mt-2">Backups são criados automaticamente ao editar, excluir ou migrar cenários.</p>
            </div>
          ) : (
            Object.entries(grouped).map(([name, snaps]: [string, Snapshot[]]) => (
              <div key={name} className="space-y-2">
                <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest px-1">{name}</h3>
                {snaps.map(snap => {
                  const actionInfo = ACTION_LABELS[snap.action] || ACTION_LABELS.update;
                  const isExpanded = expandedId === snap.id;
                  const rangeCount = Object.keys(snap.scenario_data?.ranges || {}).length;
                  const variantCount = (snap.variants_data || []).length;

                  return (
                    <div
                      key={snap.id}
                      className={`border rounded-2xl transition-all ${actionInfo.bg}`}
                    >
                      <div className="p-4 flex items-center justify-between gap-3">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : snap.id)}
                          className="flex-1 text-left flex items-center gap-3 min-w-0"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-black uppercase tracking-widest ${actionInfo.color}`}>
                                {actionInfo.label}
                              </span>
                              <span className="text-gray-600 text-[10px] font-bold">v{snap.version}</span>
                              <span className="text-gray-600 text-[10px]">•</span>
                              <span className="text-gray-500 text-[10px] font-bold">
                                {new Date(snap.created_at).toLocaleString('pt-BR', {
                                  day: '2-digit', month: '2-digit', year: '2-digit',
                                  hour: '2-digit', minute: '2-digit',
                                })}
                              </span>
                            </div>
                            {snap.description && (
                              <p className="text-gray-400 text-xs mt-1 truncate">{snap.description}</p>
                            )}
                            <div className="flex gap-3 mt-1">
                              <span className="text-gray-600 text-[10px] font-bold">{rangeCount} mãos</span>
                              {variantCount > 0 && (
                                <span className="text-gray-600 text-[10px] font-bold">{variantCount} variantes</span>
                              )}
                              <span className="text-gray-600 text-[10px] font-bold">
                                {snap.scenario_data?.street === 'PREFLOP' ? 'Pré-Flop' : 'Pós-Flop'}
                              </span>
                            </div>
                          </div>
                          <span className="text-gray-600 text-xs">{isExpanded ? '▲' : '▼'}</span>
                        </button>

                        <button
                          onClick={() => handleRestore(snap)}
                          disabled={restoring === snap.id}
                          className="shrink-0 px-4 py-2.5 bg-emerald-600/80 hover:bg-emerald-500 border border-emerald-400/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all active:scale-95 disabled:opacity-50"
                        >
                          {restoring === snap.id ? '...' : 'Restaurar'}
                        </button>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-gray-600 font-bold">Modalidade:</span>{' '}
                              <span className="text-gray-300">{snap.scenario_data?.modality}</span>
                            </div>
                            <div>
                              <span className="text-gray-600 font-bold">Rua:</span>{' '}
                              <span className="text-gray-300">{snap.scenario_data?.street}</span>
                            </div>
                            <div>
                              <span className="text-gray-600 font-bold">Hero:</span>{' '}
                              <span className="text-gray-300">{snap.scenario_data?.hero_pos}</span>
                            </div>
                            <div>
                              <span className="text-gray-600 font-bold">Stack:</span>{' '}
                              <span className="text-gray-300">{snap.scenario_data?.stack_bb}bb</span>
                            </div>
                            <div>
                              <span className="text-gray-600 font-bold">Oponentes:</span>{' '}
                              <span className="text-gray-300">{(snap.scenario_data?.opponents || []).join(', ')}</span>
                            </div>
                            <div>
                              <span className="text-gray-600 font-bold">Ações:</span>{' '}
                              <span className="text-gray-300">{(snap.scenario_data?.custom_actions || []).join(', ') || 'Padrão'}</span>
                            </div>
                          </div>

                          {/* Amostra de ranges */}
                          <div>
                            <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mb-2">Amostra dos Ranges</p>
                            <div className="bg-black/30 rounded-xl p-3 max-h-40 overflow-y-auto">
                              <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
                                {Object.entries(snap.scenario_data?.ranges || {}).slice(0, 30).map(([hand, freq]: [string, any]) => {
                                  const actions = Object.entries(freq).filter(([, v]) => (v as number) > 0);
                                  return (
                                    <div key={hand} className="flex gap-1 text-gray-400">
                                      <span className="text-gray-200 font-bold w-8">{hand}</span>
                                      <span className="truncate">
                                        {actions.map(([a, v]) => `${a}:${v}%`).join(' ')}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                              {Object.keys(snap.scenario_data?.ranges || {}).length > 30 && (
                                <p className="text-gray-600 text-[10px] mt-2 text-center">
                                  ...e mais {Object.keys(snap.scenario_data.ranges).length - 30} mãos
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="text-[10px] text-gray-600 font-mono break-all">
                            ID: {snap.scenario_id}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ScenarioVersionHistory;
