import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { CATEGORIES } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetInput: string;
  setBudgetInput: (val: string) => void;
  categoryBudgetsInput: Record<string, string>;
  setCategoryBudgetsInput: (val: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  categoryEmojisInput: Record<string, string>;
  setCategoryEmojisInput: (val: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  customCategoriesInput: string[];
  setCustomCategoriesInput: (val: string[] | ((prev: string[]) => string[])) => void;
  newCategoryInput: string;
  setNewCategoryInput: (val: string) => void;
  handleUpdateBudget: (e: React.FormEvent) => void;
  downloadTemplate: () => void;
  handleImportCSV: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function BudgetModal({
  isOpen,
  onClose,
  budgetInput,
  setBudgetInput,
  categoryBudgetsInput,
  setCategoryBudgetsInput,
  categoryEmojisInput,
  setCategoryEmojisInput,
  customCategoriesInput,
  setCustomCategoriesInput,
  newCategoryInput,
  setNewCategoryInput,
  handleUpdateBudget,
  downloadTemplate,
  handleImportCSV
}: BudgetModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-[40px] sm:rounded-[40px] shadow-2xl border border-border dark:border-border-dark overflow-hidden"
          >
            <div className="p-6 sm:p-8 max-h-[85vh] overflow-y-auto pb-12">
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-6 sm:hidden" />
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black tracking-tight dark:text-text-dark">Presupuesto</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Configuración mensual</p>
                </div>
                <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateBudget} className="space-y-8">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Presupuesto Global</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Q</span>
                    <input 
                      type="number" 
                      required
                      value={budgetInput}
                      onChange={(e) => setBudgetInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-4 bg-bg dark:bg-gray-800 rounded-2xl border-none focus:ring-2 focus:ring-primary font-bold text-lg dark:text-white"
                    />
                  </div>
                  {(() => {
                    const total = Object.values(categoryBudgetsInput).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
                    const global = parseFloat(budgetInput) || 0;
                    return total > 0 && (
                      <p className={cn(
                        "mt-2 text-[10px] font-bold uppercase tracking-wider",
                        total > global ? "text-red-500" : "text-income"
                      )}>
                        Total asignado: {formatCurrency(total)} / {formatCurrency(global)}
                        {total > global && " (Excede el global)"}
                      </p>
                    );
                  })()}
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Categorías Personalizadas</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      placeholder="Nueva categoría..."
                      className="flex-1 bg-bg dark:bg-gray-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary dark:text-white"
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        const trimmedCat = newCategoryInput.trim();
                        if (trimmedCat && !customCategoriesInput.includes(trimmedCat) && !CATEGORIES.expense.includes(trimmedCat) && !CATEGORIES.income.includes(trimmedCat)) {
                          setCustomCategoriesInput(prev => [...prev, trimmedCat]);
                          setNewCategoryInput('');
                        } else if (trimmedCat) {
                          toast.error('Esta categoría ya existe');
                        }
                      }}
                      className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold"
                    >
                      Agregar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {customCategoriesInput.map(cat => (
                      <div key={cat} className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full flex items-center gap-2">
                        <span className="text-xs font-medium dark:text-gray-300">{cat}</span>
                        <button 
                          type="button"
                          onClick={() => {
                            setCustomCategoriesInput(prev => prev.filter(c => c !== cat));
                            setCategoryBudgetsInput(prev => {
                              const next = { ...prev };
                              delete next[cat];
                              return next;
                            });
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Presupuesto por Categoría y Emojis</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Array.from(new Set([...CATEGORIES.expense, ...CATEGORIES.income, ...customCategoriesInput])).map(cat => (
                      <div key={cat} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10px] font-bold text-gray-500">{cat}</label>
                          <input 
                            type="text"
                            maxLength={2}
                            value={categoryEmojisInput[cat] || ''}
                            onChange={(e) => setCategoryEmojisInput(prev => ({ ...prev, [cat]: e.target.value }))}
                            placeholder="Emoji"
                            className="w-10 h-8 text-center bg-gray-50 dark:bg-gray-800 rounded-lg border-none focus:ring-2 focus:ring-primary text-sm"
                          />
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Q</span>
                          <input 
                            type="number" 
                            value={categoryBudgetsInput[cat] || ''}
                            onChange={(e) => setCategoryBudgetsInput(prev => ({ ...prev, [cat]: e.target.value }))}
                            placeholder="0.00"
                            className="w-full pl-6 pr-3 py-2 bg-bg dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-primary text-sm font-bold dark:text-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-inner-border dark:border-border-dark">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Importar/Exportar</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Descargar Plantilla
                    </button>
                    <label className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                      Subir CSV
                      <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
                    </label>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-primary-hover transition-colors"
                >
                  Guardar Presupuestos
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
