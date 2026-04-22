import { Play, Pencil, Trash2, Repeat } from 'lucide-react';
import { motion } from 'motion/react';
import { RecurringExpense } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';

interface RecurringTabProps {
  recurringExpenses: RecurringExpense[];
  getCategoryEmoji: (cat: string) => string;
  handleProcessRecurringManually: (re: RecurringExpense) => void;
  setEditingRecurringId: (id: string | null) => void;
  setAmount: (amount: string) => void;
  setType: (type: 'expense' | 'income') => void;
  setCategory: (cat: string) => void;
  setDescription: (desc: string) => void;
  setTags: (tags: string[]) => void;
  setDayOfMonth: (day: string) => void;
  setPaymentMethod: (method: any) => void;
  setEndDate: (date: string) => void;
  setIsAdding: (isAdding: boolean) => void;
  setIsRecurring: (isRecurring: boolean) => void;
  handleDeleteRecurring: (id: string) => void;
}

export function RecurringTab({
  recurringExpenses,
  getCategoryEmoji,
  handleProcessRecurringManually,
  setEditingRecurringId,
  setAmount,
  setType,
  setCategory,
  setDescription,
  setTags,
  setDayOfMonth,
  setPaymentMethod,
  setEndDate,
  setIsAdding,
  setIsRecurring,
  handleDeleteRecurring
}: RecurringTabProps) {
  return (
    <motion.div 
      key="recurring"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight dark:text-text-dark">Gastos Fijos</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Programación mensual</p>
        </div>
        <button 
          onClick={() => {
            setIsAdding(true);
            setIsRecurring(true);
          }}
          className="bg-primary dark:bg-primary-light text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md"
        >
          Nuevo
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {recurringExpenses.map((re) => (
          <div key={re.id} className="bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-[32px] shadow-sm border border-border dark:border-border-dark flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-bg dark:bg-gray-800 rounded-2xl flex-shrink-0 flex items-center justify-center text-lg sm:text-xl">
                {getCategoryEmoji(re.category)}
              </div>
              <div className="min-w-0">
                <p className="font-bold truncate dark:text-white">{re.description || re.category}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">
                    Día {re.dayOfMonth} • {re.paymentMethod}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(re.tags || []).map(tag => (
                      <span key={tag} className="text-[8px] text-primary dark:text-primary-light font-bold">#{tag}</span>
                    ))}
                  </div>
                  {re.status === 'finished' && (
                    <span className="text-[8px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter flex-shrink-0">Finalizado</span>
                  )}
                  {re.endDate && re.status !== 'finished' && (
                    <span className="text-[8px] bg-blue-50 dark:bg-blue-900/20 text-blue-500 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter flex-shrink-0">Hasta: {re.endDate}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 text-right">
              <div className="mr-1 sm:mr-2">
                <p className={cn(
                  "font-black text-sm sm:text-base whitespace-nowrap",
                  re.type === 'income' ? "text-income" : "text-expense"
                )}>
                  {re.type === 'income' ? '+' : '-'}{formatCurrency(re.amount)}
                </p>
              </div>
              <div className="flex items-center">
                <button 
                  onClick={() => handleProcessRecurringManually(re)}
                  className="p-1.5 sm:p-2 text-gray-300 hover:text-income transition-colors"
                  title="Procesar ahora"
                >
                  <Play size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
                <button 
                  onClick={() => {
                    setEditingRecurringId(re.id);
                    setAmount(re.amount.toString());
                    setType(re.type || 'expense');
                    setCategory(re.category);
                    setDescription(re.description);
                    setTags(re.tags || []);
                    setDayOfMonth(re.dayOfMonth.toString());
                    setPaymentMethod(re.paymentMethod);
                    setEndDate(re.endDate || '');
                    setIsAdding(true);
                  }}
                  className="p-1.5 sm:p-2 text-gray-300 hover:text-primary transition-colors"
                >
                  <Pencil size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
                <button 
                  onClick={() => handleDeleteRecurring(re.id)}
                  className="p-1.5 sm:p-2 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {recurringExpenses.length === 0 && (
          <div className="bg-white dark:bg-gray-900 p-12 rounded-[32px] border border-dashed border-gray-300 dark:border-gray-700 text-center">
            <Repeat size={48} className="mx-auto text-gray-200 dark:text-gray-800 mb-4" />
            <p className="text-gray-400 font-medium">No tienes gastos fijos configurados.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
