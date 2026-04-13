import { Target, PieChart, Sparkles, Plus, Trash2, X, ChevronDown, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { Group } from '../../types';
import { cn } from '../../lib/utils';
import { CATEGORIES, CATEGORY_EMOJIS } from '../../types';

interface SettingsTabProps {
  group: Group | null;
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
  setIsBudgetModalOpen: (open: boolean) => void;
  handleUpdateBudget: (e: React.FormEvent) => void;
  profile: any;
  toggleAISharing: () => void;
}

export function SettingsTab({
  group,
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
  setIsBudgetModalOpen,
  handleUpdateBudget,
  profile,
  toggleAISharing
}: SettingsTabProps) {
  return (
    <motion.div 
      key="settings"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-[#E4E3E0] dark:border-gray-800">
        <h2 className="text-2xl font-bold mb-6 dark:text-white">Configuración del Presupuesto</h2>
        
        <div className="space-y-6">
          <div className="p-6 bg-[#F5F5F0] dark:bg-gray-800 rounded-2xl border border-[#E4E3E0] dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-xl flex items-center justify-center text-[#5A5A40] dark:text-[#8B8B6B] shadow-sm">
                  <Target size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold dark:text-white">Presupuesto Global</p>
                  <p className="text-xs text-gray-400">Límite de gastos mensual del grupo</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setBudgetInput(group?.budget?.toString() || '');
                  const initialCategoryBudgets: Record<string, string> = {};
                  const initialCategoryEmojis: Record<string, string> = {};
                  const allCategories = [...CATEGORIES.expense, ...CATEGORIES.income, ...(group?.customCategories || [])];
                  allCategories.forEach(cat => {
                    initialCategoryBudgets[cat] = group?.categoryBudgets?.[cat]?.toString() || '';
                    initialCategoryEmojis[cat] = group?.categoryEmojis?.[cat] || CATEGORY_EMOJIS[cat] || '';
                  });
                  setCategoryBudgetsInput(initialCategoryBudgets);
                  setCategoryEmojisInput(initialCategoryEmojis);
                  setCustomCategoriesInput(group?.customCategories || []);
                  setIsBudgetModalOpen(true);
                }}
                className="text-sm font-bold text-[#5A5A40] dark:text-[#8B8B6B] hover:underline"
              >
                Editar
              </button>
            </div>
            <p className="text-2xl font-black text-[#5A5A40] dark:text-[#8B8B6B]">
              {group?.budget ? `Q ${group.budget.toLocaleString()}` : 'No definido'}
            </p>
          </div>

          <div className="p-6 bg-[#F5F5F0] dark:bg-gray-800 rounded-2xl border border-[#E4E3E0] dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-xl flex items-center justify-center text-[#5A5A40] dark:text-[#8B8B6B] shadow-sm">
                <PieChart size={20} />
              </div>
              <div>
                <p className="text-sm font-bold dark:text-white">Presupuestos por Categoría</p>
                <p className="text-xs text-gray-400">Control detallado por tipo de gasto</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(group?.categoryBudgets || {}).map(([cat, budget]) => (
                budget > 0 && (
                  <div key={cat} className="bg-white dark:bg-gray-900 p-3 rounded-xl shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase truncate">{cat}</p>
                    <p className="text-sm font-black text-[#5A5A40] dark:text-[#8B8B6B]">Q {budget.toLocaleString()}</p>
                  </div>
                )
              ))}
              {(!group?.categoryBudgets || Object.values(group.categoryBudgets).every(v => v === 0)) && (
                <p className="col-span-full text-xs text-gray-400 py-2">No hay presupuestos por categoría definidos.</p>
              )}
            </div>
          </div>

          <div className="p-6 bg-[#F5F5F0] dark:bg-gray-800 rounded-2xl border border-[#E4E3E0] dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-xl flex items-center justify-center text-[#5A5A40] dark:text-[#8B8B6B] shadow-sm">
                  <Sparkles size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold dark:text-white">Inteligencia Artificial</p>
                  <p className="text-xs text-gray-400">Análisis y consejos automáticos</p>
                </div>
              </div>
              <button 
                onClick={toggleAISharing}
                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${profile?.aiSharingConsent ? 'bg-[#5A5A40]' : 'bg-gray-300 dark:bg-gray-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${profile?.aiSharingConsent ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Al activar esta opción, permites que BudgetBuddy analice tus transacciones de forma anónima para brindarte consejos personalizados sobre ahorro y gestión de gastos.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
