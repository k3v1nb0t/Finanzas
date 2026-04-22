import { Target, Pencil, Trash2, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { SavingsGoal } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';

interface GoalsTabProps {
  savingsGoals: SavingsGoal[];
  setEditingGoalId: (id: string | null) => void;
  setGoalName: (name: string) => void;
  setGoalTarget: (target: string) => void;
  setGoalCurrent: (current: string) => void;
  setGoalDeadline: (deadline: string) => void;
  setIsGoalModalOpen: (open: boolean) => void;
  setSelectedGoalForAmount: (goal: SavingsGoal | null) => void;
  setIsAddAmountModalOpen: (open: boolean) => void;
  handleDeleteGoal: (id: string) => void;
}

export function GoalsTab({
  savingsGoals,
  setEditingGoalId,
  setGoalName,
  setGoalTarget,
  setGoalCurrent,
  setGoalDeadline,
  setIsGoalModalOpen,
  setSelectedGoalForAmount,
  setIsAddAmountModalOpen,
  handleDeleteGoal
}: GoalsTabProps) {
  return (
    <motion.div 
      key="goals"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight dark:text-text-dark">Metas de Ahorro</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Tus objetivos financieros</p>
        </div>
        <button 
          onClick={() => {
            setEditingGoalId(null);
            setGoalName('');
            setGoalTarget('');
            setGoalCurrent('');
            setGoalDeadline('');
            setIsGoalModalOpen(true);
          }}
          className="bg-primary dark:bg-primary-light text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md"
        >
          Nueva Meta
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {savingsGoals.map((goal) => {
          const progress = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
          return (
            <div key={goal.id} className="bg-white dark:bg-gray-900 p-6 rounded-[32px] shadow-sm border border-border dark:border-border-dark space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
                    <Target size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold dark:text-white">{goal.name}</h3>
                    {goal.deadline && (
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Meta: {goal.deadline}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => {
                      setSelectedGoalForAmount(goal);
                      setIsAddAmountModalOpen(true);
                    }}
                    className="p-2 text-gray-300 hover:text-income transition-colors"
                    title="Añadir monto"
                  >
                    <Plus size={18} />
                  </button>
                  <button 
                    onClick={() => {
                      setEditingGoalId(goal.id);
                      setGoalName(goal.name);
                      setGoalTarget(goal.targetAmount.toString());
                      setGoalCurrent(goal.currentAmount.toString());
                      setGoalDeadline(goal.deadline || '');
                      setIsGoalModalOpen(true);
                    }}
                    className="p-2 text-gray-300 hover:text-primary transition-colors"
                  >
                    <Pencil size={18} />
                  </button>
                  <button 
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <p className="text-lg font-black text-primary dark:text-primary-light">
                    {formatCurrency(goal.currentAmount)}
                    <span className="text-xs font-bold text-gray-400 ml-1">/ {formatCurrency(goal.targetAmount)}</span>
                  </p>
                  <p className="text-sm font-black text-gray-400">{progress}%</p>
                </div>
                <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-amber-500 rounded-full"
                  />
                </div>
              </div>
            </div>
          );
        })}
        {savingsGoals.length === 0 && (
          <div className="sm:col-span-2 bg-white dark:bg-gray-900 p-12 rounded-[32px] border border-dashed border-gray-300 dark:border-gray-700 text-center">
            <Target size={48} className="mx-auto text-gray-200 dark:text-gray-800 mb-4" />
            <p className="text-gray-400 font-medium">No tienes metas de ahorro configuradas.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
