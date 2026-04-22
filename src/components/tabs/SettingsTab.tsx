import { Target, PieChart, Sparkles, Plus, Trash2, X, ChevronDown, Check, Users, Edit2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useAuth } from '../../AuthContext';
import { Group } from '../../types';
import { cn, generateInviteCode } from '../../lib/utils';
import { CATEGORIES, CATEGORY_EMOJIS } from '../../types';
import { toast } from 'sonner';

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
  const { updateGroupName, user } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState(group?.name || '');
  const [isSavingName, setIsSavingName] = useState(false);

  const isOwner = group?.ownerId === user?.uid;

  const handleSaveName = async () => {
    if (!groupNameInput.trim()) {
      toast.error('El nombre no puede estar vacío');
      return;
    }
    
    setIsSavingName(true);
    try {
      await updateGroupName(groupNameInput.trim());
      setIsEditingName(false);
      toast.success('Nombre del grupo actualizado');
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar el nombre');
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <motion.div 
      key="settings"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      {/* Información del Grupo */}
      <div className="bg-white dark:bg-gray-900 p-4 sm:p-8 rounded-3xl shadow-sm border border-border dark:border-border-dark">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 dark:text-text-dark">Información del Grupo</h2>
        
        <div className="p-6 bg-bg dark:bg-gray-800 rounded-2xl border border-inner-border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-xl flex items-center justify-center text-primary dark:text-primary-light shadow-sm">
                <Users size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold dark:text-text-dark">Nombre del Grupo</p>
                {isEditingName && isOwner ? (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={groupNameInput}
                      onChange={(e) => setGroupNameInput(e.target.value)}
                      className="bg-white dark:bg-gray-900 border border-inner-border dark:border-gray-700 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:text-text-dark"
                      autoFocus
                    />
                    <button 
                      onClick={handleSaveName}
                      disabled={isSavingName}
                      className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
                    >
                      <Check size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        setIsEditingName(false);
                        setGroupNameInput(group?.name || '');
                      }}
                      className="p-1.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-black text-primary dark:text-primary-light">{group?.name}</p>
                    {isOwner && (
                      <button 
                        onClick={() => {
                          setGroupNameInput(group?.name || '');
                          setIsEditingName(true);
                        }}
                        className="p-1 text-gray-400 hover:text-primary transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Código de Invitación</p>
              <p className="text-sm font-black dark:text-text-dark select-all cursor-pointer bg-white dark:bg-gray-900 px-3 py-1 rounded-lg border border-inner-border dark:border-gray-700 mt-1">
                {group?.inviteCode}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 p-4 sm:p-8 rounded-3xl shadow-sm border border-border dark:border-border-dark">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 dark:text-text-dark">Configuración del Presupuesto</h2>
        
        <div className="space-y-6">
          <div className="p-6 bg-bg dark:bg-gray-800 rounded-2xl border border-inner-border dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-xl flex items-center justify-center text-primary dark:text-primary-light shadow-sm">
                  <Target size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold dark:text-text-dark">Presupuesto Global</p>
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
                className="text-sm font-bold text-primary dark:text-primary-light hover:underline"
              >
                Editar
              </button>
            </div>
            <p className="text-2xl font-black text-primary dark:text-primary-light">
              {group?.budget ? `Q ${group.budget.toLocaleString()}` : 'No definido'}
            </p>
          </div>

          <div className="p-6 bg-bg dark:bg-gray-800 rounded-2xl border border-inner-border dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-xl flex items-center justify-center text-primary dark:text-primary-light shadow-sm">
                <PieChart size={20} />
              </div>
              <div>
                <p className="text-sm font-bold dark:text-text-dark">Presupuestos por Categoría</p>
                <p className="text-xs text-gray-400">Control detallado por tipo de gasto</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(group?.categoryBudgets || {}).map(([cat, budget]) => (
                budget > 0 && (
                  <div key={cat} className="bg-white dark:bg-gray-900 p-3 rounded-xl shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase truncate">{cat}</p>
                    <p className="text-sm font-black text-primary dark:text-primary-light">Q {budget.toLocaleString()}</p>
                  </div>
                )
              ))}
              {(!group?.categoryBudgets || Object.values(group.categoryBudgets).every(v => v === 0)) && (
                <p className="col-span-full text-xs text-gray-400 py-2">No hay presupuestos por categoría definidos.</p>
              )}
            </div>
          </div>

          <div className="p-6 bg-bg dark:bg-gray-800 rounded-2xl border border-inner-border dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-xl flex items-center justify-center text-primary dark:text-primary-light shadow-sm">
                  <Sparkles size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold dark:text-text-dark">Inteligencia Artificial</p>
                  <p className="text-xs text-gray-400">Análisis y consejos automáticos</p>
                </div>
              </div>
              <button 
                onClick={toggleAISharing}
                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${profile?.aiSharingConsent ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
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
