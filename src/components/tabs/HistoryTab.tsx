import { Search, ArrowDownRight, Repeat, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';
import { Transaction } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';

const GUATEMALA_TZ = 'America/Guatemala';

interface HistoryTabProps {
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedTagFilter: string | null;
  setSelectedTagFilter: (tag: string | null) => void;
  exportToCSV: () => void;
  getCategoryEmoji: (cat: string) => string;
  user: any;
  isAdmin: boolean;
  setEditingTransactionId: (id: string | null) => void;
  setAmount: (amount: string) => void;
  setType: (type: 'expense' | 'income') => void;
  setCategory: (cat: string) => void;
  setDescription: (desc: string) => void;
  setTags: (tags: string[]) => void;
  setPaymentMethod: (method: any) => void;
  setDate: (date: string) => void;
  setIsAdding: (isAdding: boolean) => void;
  setIsRecurring: (isRecurring: boolean) => void;
  handleDelete: (id: string) => void;
  selectedMonth: string;
}

export function HistoryTab({
  transactions,
  filteredTransactions,
  searchQuery,
  setSearchQuery,
  selectedTagFilter,
  setSelectedTagFilter,
  exportToCSV,
  getCategoryEmoji,
  user,
  isAdmin,
  setEditingTransactionId,
  setAmount,
  setType,
  setCategory,
  setDescription,
  setTags,
  setPaymentMethod,
  setDate,
  setIsAdding,
  setIsRecurring,
  handleDelete,
  selectedMonth
}: HistoryTabProps) {
  return (
    <motion.div 
      key="history"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold dark:text-text-dark">Historial del Mes</h2>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                placeholder="Buscar descripción o etiqueta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-border dark:border-border-dark rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
              />
            </div>
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-border dark:border-border-dark rounded-xl text-xs font-bold text-primary dark:text-primary-light hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowDownRight size={14} />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Tag Filter */}
        {(() => {
          const allTags = Array.from(new Set(transactions.flatMap(t => t.tags || [])));
          if (allTags.length === 0) return null;

          // Calculate spending by tag
          const spendingByTag: Record<string, number> = {};
          filteredTransactions.filter(t => t.type === 'expense').forEach(t => {
            (t.tags || []).forEach(tag => {
              spendingByTag[tag] = (spendingByTag[tag] || 0) + t.amount;
            });
          });

          return (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mr-2">Filtrar por etiqueta:</p>
                <button 
                  onClick={() => setSelectedTagFilter(null)}
                  className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold transition-all",
                    !selectedTagFilter ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                  )}
                >
                  Todas
                </button>
                {allTags.map(tag => (
                  <button 
                    key={tag}
                    onClick={() => setSelectedTagFilter(selectedTagFilter === tag ? null : tag)}
                    className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold transition-all",
                      selectedTagFilter === tag ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                    )}
                  >
                    #{tag}
                  </button>
                ))}
              </div>

              {/* Tag Spending Summary */}
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {Object.entries(spendingByTag)
                  .sort((a, b) => b[1] - a[1])
                  .map(([tag, amount]) => (
                    <div key={tag} className="flex-shrink-0 bg-white dark:bg-gray-900 px-4 py-3 rounded-2xl border border-border dark:border-border-dark shadow-sm">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">#{tag}</p>
                      <p className="text-sm font-black text-primary dark:text-primary-light">{formatCurrency(amount)}</p>
                    </div>
                  ))}
              </div>
            </div>
          );
        })()}
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-border dark:border-border-dark overflow-hidden">
        <div className="divide-y divide-inner-border dark:divide-border-dark">
          {filteredTransactions.map((tx) => (
            <div key={tx.id} className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 group gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className={cn(
                  "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex-shrink-0 flex items-center justify-center text-lg sm:text-xl",
                  tx.type === 'income' ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"
                )}>
                  {getCategoryEmoji(tx.category)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-medium text-sm sm:text-base truncate dark:text-white">{tx.description || tx.category}</p>
                    <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center gap-1">
                      {getCategoryEmoji(tx.category)} {tx.category}
                    </span>
                    {tx.isRecurring && (
                      <span className="bg-primary/10 text-primary text-[7px] sm:text-[8px] font-black uppercase px-1 py-0.5 rounded tracking-tighter flex-shrink-0 flex items-center gap-0.5">
                        <Repeat size={7} className="sm:w-2 sm:h-2" /> Fijo
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 items-center">
                    <p className="text-[10px] sm:text-xs text-gray-500">
                      <span className="sm:hidden">{formatInTimeZone(tx.date?.toDate ? tx.date.toDate() : new Date(tx.date), GUATEMALA_TZ, 'dd/MM/yy')}</span>
                      <span className="hidden sm:inline">{formatInTimeZone(tx.date?.toDate ? tx.date.toDate() : new Date(tx.date), GUATEMALA_TZ, 'PPP', { locale: es })}</span>
                      {` • ${tx.userName}`}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(new Set(tx.tags || [])).map(tag => (
                        <span key={tag} className="text-[8px] sm:text-[9px] text-primary dark:text-primary-light font-bold">#{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-3 flex-shrink-0 text-right">
                <p className={cn(
                  "font-bold text-sm sm:text-base whitespace-nowrap",
                  tx.type === 'income' ? "text-income" : "text-expense"
                )}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </p>
                <div className="flex items-center sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                  {(tx.userId === user?.uid || isAdmin) && (
                    <button 
                      onClick={() => {
                        setEditingTransactionId(tx.id);
                        setAmount(tx.amount.toFixed(2));
                        setType(tx.type);
                        setCategory(tx.category);
                        setDescription(tx.description || '');
                        setTags(tx.tags || []);
                        setPaymentMethod(tx.paymentMethod || 'Efectivo');
                        setDate(formatInTimeZone(tx.date?.toDate ? tx.date.toDate() : new Date(tx.date), GUATEMALA_TZ, 'yyyy-MM-dd'));
                        setIsAdding(true);
                        setIsRecurring(false);
                      }}
                      className="p-1.5 sm:p-2 text-gray-300 hover:text-primary"
                    >
                      <Pencil size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                  )}
                  {(tx.userId === user?.uid || isAdmin) && (
                    <button 
                      onClick={() => handleDelete(tx.id)}
                      className="p-1.5 sm:p-2 text-gray-300 hover:text-red-500"
                    >
                      <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filteredTransactions.length === 0 && (
            <div className="p-12 text-center text-gray-400">
              No hay transacciones para el mes seleccionado.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
