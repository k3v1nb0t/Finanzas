import { useState, useEffect, useMemo, FormEvent } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { Toaster } from 'sonner';
import { 
  Plus, 
  LogOut, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Users, 
  PieChart, 
  History,
  LayoutDashboard,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  Loader2,
  Target,
  X,
  CreditCard,
  Banknote,
  Repeat,
  CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  deleteDoc, 
  doc,
  Timestamp,
  setDoc,
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import { Transaction, CATEGORIES, TransactionType, Group, UserProfile, PaymentMethod, PAYMENT_METHODS, RecurringExpense } from './types';
import { formatCurrency, cn } from './lib/utils';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';
import { format, isLastDayOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { ErrorBoundary } from './components/ErrorBoundary';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart as RePieChart,
  Pie
} from 'recharts';
import { toast } from 'sonner';

function Dashboard() {
  const { user, profile, group, logout, isAdmin, viewMode, setViewMode } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'group' | 'recurring'>('dashboard');

  // Form state
  const [amount, setAmount] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
  const [categoryBudgetsInput, setCategoryBudgetsInput] = useState<Record<string, string>>({});
  const [customCategoriesInput, setCustomCategoriesInput] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Recurring state
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [dayOfMonth, setDayOfMonth] = useState('1');

  useEffect(() => {
    if (!profile?.groupId) return;

    const q = query(
      collection(db, 'groups', profile.groupId, 'transactions'),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(txs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `groups/${profile.groupId}/transactions`);
    });

    return unsubscribe;
  }, [profile?.groupId]);

  useEffect(() => {
    if (!profile?.groupId) return;

    const q = query(
      collection(db, 'groups', profile.groupId, 'recurringExpenses'),
      orderBy('dayOfMonth', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecurringExpenses(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RecurringExpense[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `groups/${profile.groupId}/recurringExpenses`);
    });

    return unsubscribe;
  }, [profile?.groupId]);

  useEffect(() => {
    if (!profile?.groupId || !user || recurringExpenses.length === 0) return;

    const today = new Date();
    const currentMonth = format(today, 'yyyy-MM');
    const currentDay = today.getDate();
    const isLastDay = isLastDayOfMonth(today);

    const processExpenses = async () => {
      for (const re of recurringExpenses) {
        // Logic: Process if day has arrived OR if it's the last day of month and the scheduled day is later
        const shouldProcess = re.dayOfMonth <= currentDay || (isLastDay && re.dayOfMonth > currentDay);

        if (re.lastProcessedMonth !== currentMonth && shouldProcess) {
          try {
            // Register transaction
            await addDoc(collection(db, 'groups', profile.groupId, 'transactions'), {
              groupId: profile.groupId,
              userId: user.uid,
              userName: user.displayName || 'Sistema',
              amount: re.amount,
              type: 'expense',
              category: re.category,
              description: `(Fijo) ${re.description || re.category}`,
              paymentMethod: re.paymentMethod,
              date: serverTimestamp(),
              createdAt: serverTimestamp(),
              isRecurring: true,
              recurringId: re.id
            });

            // Update last processed month on the recurring expense
            await setDoc(doc(db, 'groups', profile.groupId, 'recurringExpenses', re.id), {
              ...re,
              lastProcessedMonth: currentMonth
            });
            
            toast.info(`Gasto fijo "${re.category}" registrado automáticamente`);
          } catch (error) {
            console.error('Error processing recurring expense:', error);
          }
        }
      }
    };

    processExpenses();
  }, [profile?.groupId, user, recurringExpenses]);

  const stats = useMemo(() => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  const budgetProgress = useMemo(() => {
    if (!group?.budget) return null;
    const percentage = (stats.expense / group.budget) * 100;
    return {
      percentage: Math.min(percentage, 100),
      isOver: percentage > 100,
      remaining: group.budget - stats.expense
    };
  }, [group?.budget, stats.expense]);

  const categoryBudgetProgress = useMemo(() => {
    if (!group?.categoryBudgets) return [];
    
    // Calculate expenses per category
    const expensesByCategory: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
      });

    return Object.entries(group.categoryBudgets).map(([category, budget]) => {
      const spent = expensesByCategory[category] || 0;
      const percentage = (spent / budget) * 100;
      return {
        category,
        budget,
        spent,
        percentage: Math.min(percentage, 100),
        isOver: percentage > 100,
        remaining: budget - spent
      };
    });
  }, [group?.categoryBudgets, transactions]);

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return format(d, 'yyyy-MM-dd');
    }).reverse();

    return last7Days.map(day => {
      const dayTxs = transactions.filter(t => {
        const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
        return format(tDate, 'yyyy-MM-dd') === day;
      });
      return {
        name: format(new Date(day), 'eee', { locale: es }),
        Ingresos: dayTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        Gastos: dayTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
      };
    });
  }, [transactions]);

  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const handleAddTransaction = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile?.groupId || !user) return;

    try {
      await addDoc(collection(db, 'groups', profile.groupId, 'transactions'), {
        groupId: profile.groupId,
        userId: user.uid,
        userName: user.displayName || 'Usuario',
        amount: parseFloat(amount),
        type,
        category,
        description,
        paymentMethod: type === 'expense' ? paymentMethod : null,
        date: Timestamp.fromDate(new Date(date)),
        createdAt: serverTimestamp(),
      });
      setIsAdding(false);
      setAmount('');
      setCategory('');
      setDescription('');
      setIsRecurring(false);
      toast.success('Transacción agregada');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `groups/${profile.groupId}/transactions`);
    }
  };

  const handleAddRecurring = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile?.groupId) return;

    try {
      await addDoc(collection(db, 'groups', profile.groupId, 'recurringExpenses'), {
        groupId: profile.groupId,
        amount: parseFloat(amount),
        category,
        description,
        dayOfMonth: parseInt(dayOfMonth),
        paymentMethod,
        active: true,
        createdAt: serverTimestamp(),
      });
      setIsAdding(false);
      setAmount('');
      setCategory('');
      setDescription('');
      toast.success('Gasto fijo configurado');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `groups/${profile.groupId}/recurringExpenses`);
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    if (!profile?.groupId) return;
    try {
      await deleteDoc(doc(db, 'groups', profile.groupId, 'recurringExpenses', id));
      toast.success('Gasto fijo eliminado');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `groups/${profile.groupId}/recurringExpenses/${id}`);
    }
  };

  const handleUpdateBudget = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile?.groupId) return;

    const globalBudget = parseFloat(budgetInput) || 0;
    let totalCategoryBudget = 0;
    const categoryBudgets: Record<string, number> = {};
    
    Object.entries(categoryBudgetsInput).forEach(([cat, val]) => {
      if (val && !isNaN(parseFloat(val))) {
        const amount = parseFloat(val);
        categoryBudgets[cat] = amount;
        totalCategoryBudget += amount;
      }
    });

    if (totalCategoryBudget > globalBudget) {
      toast.error(`La suma de los presupuestos por categoría (${formatCurrency(totalCategoryBudget)}) supera el presupuesto global (${formatCurrency(globalBudget)})`);
      return;
    }

    try {
      await setDoc(doc(db, 'groups', profile.groupId), {
        budget: globalBudget,
        categoryBudgets,
        customCategories: customCategoriesInput
      }, { merge: true });
      setIsBudgetModalOpen(false);
      toast.success('Presupuesto actualizado');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${profile.groupId}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!profile?.groupId) return;
    try {
      await deleteDoc(doc(db, 'groups', profile.groupId, 'transactions', id));
      toast.success('Transacción eliminada');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `groups/${profile.groupId}/transactions/${id}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-[#E4E3E0] z-40 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#5A5A40] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#5A5A40]/20">
              <Wallet size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">FamiCash</h1>
              <p className="text-[10px] font-bold text-[#5A5A40] uppercase tracking-widest">{group?.name || 'Cargando...'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button 
                onClick={() => setViewMode(viewMode === 'admin' ? 'personal' : 'admin')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                  viewMode === 'admin' 
                    ? "bg-[#5A5A40] text-white shadow-md" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                <LayoutDashboard size={14} />
                <span className="hidden xs:inline">{viewMode === 'admin' ? 'Admin' : 'Personal'}</span>
              </button>
            )}
            <button 
              onClick={logout}
              className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-6 pb-32">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Balance Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-[32px] shadow-sm border border-[#E4E3E0] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <Wallet size={48} />
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Balance Total</p>
                  <h2 className="text-3xl font-black tracking-tight">{formatCurrency(stats.balance)}</h2>
                </div>
                
                <div className="grid grid-cols-2 sm:contents gap-4">
                  <div className="bg-white p-5 rounded-[32px] shadow-sm border border-[#E4E3E0] flex flex-col justify-between gap-2">
                    <div className="w-8 h-8 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                      <TrendingUp size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Ingresos</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(stats.income)}</p>
                    </div>
                  </div>
                  
                  <div className="bg-white p-5 rounded-[32px] shadow-sm border border-[#E4E3E0] flex flex-col justify-between gap-2">
                    <div className="w-8 h-8 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                      <TrendingDown size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Gastos</p>
                      <p className="text-lg font-bold text-red-600">{formatCurrency(stats.expense)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget Progress Card */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E4E3E0]">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-[#5A5A40]/10 text-[#5A5A40] rounded-xl flex items-center justify-center">
                      <Target size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold">Presupuesto Mensual</h3>
                      <p className="text-xs text-gray-500">Control de gastos del grupo</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setBudgetInput(group?.budget?.toString() || '');
                      const initialCategoryBudgets: Record<string, string> = {};
                      const allCategories = [...CATEGORIES.expense, ...(group?.customCategories || [])];
                      allCategories.forEach(cat => {
                        initialCategoryBudgets[cat] = group?.categoryBudgets?.[cat]?.toString() || '';
                      });
                      setCategoryBudgetsInput(initialCategoryBudgets);
                      setCustomCategoriesInput(group?.customCategories || []);
                      setIsBudgetModalOpen(true);
                    }}
                    className="text-sm font-bold text-[#5A5A40] hover:underline"
                  >
                    {group?.budget ? 'Editar' : 'Establecer'}
                  </button>
                </div>

                {group?.budget ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-2xl font-bold">{formatCurrency(stats.expense)} <span className="text-sm font-normal text-gray-400">/ {formatCurrency(group.budget)}</span></p>
                        <p className={cn(
                          "text-xs font-medium mt-1",
                          budgetProgress?.isOver ? "text-red-500" : "text-green-600"
                        )}>
                          {budgetProgress?.isOver 
                            ? `Excedido por ${formatCurrency(Math.abs(budgetProgress.remaining))}` 
                            : `Restan ${formatCurrency(budgetProgress?.remaining || 0)}`}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-gray-500">{Math.round((stats.expense / group.budget) * 100)}%</p>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${budgetProgress?.percentage}%` }}
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          budgetProgress?.isOver ? "bg-red-500" : "bg-[#5A5A40]"
                        )}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-sm text-gray-500 mb-4">Aún no has establecido un presupuesto para este grupo.</p>
                    <button 
                      onClick={() => {
                        setBudgetInput('');
                        const initialCategoryBudgets: Record<string, string> = {};
                        CATEGORIES.expense.forEach(cat => {
                          initialCategoryBudgets[cat] = '';
                        });
                        setCategoryBudgetsInput(initialCategoryBudgets);
                        setCustomCategoriesInput([]);
                        setIsBudgetModalOpen(true);
                      }}
                      className="bg-[#5A5A40] text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-[#4A4A30] transition-colors"
                    >
                      Establecer Presupuesto
                    </button>
                  </div>
                )}

                {categoryBudgetProgress.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-[#F0EFEA] space-y-6">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Presupuesto por Categoría</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {categoryBudgetProgress.map((item) => (
                        <div key={item.category} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <p className="text-sm font-bold text-gray-700">{item.category}</p>
                            <p className="text-xs font-bold text-gray-400">{Math.round((item.spent / item.budget) * 100)}%</p>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${item.percentage}%` }}
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                item.isOver ? "bg-red-500" : "bg-[#8B8B6B]"
                              )}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] font-medium">
                            <span className="text-gray-400">{formatCurrency(item.spent)} gastado</span>
                            <span className={cn(
                              item.isOver ? "text-red-500" : "text-gray-400"
                            )}>
                              {item.isOver ? 'Excedido' : `${formatCurrency(item.remaining)} restante`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E4E3E0]">
                  <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <TrendingUp size={20} className="text-gray-400" />
                    Actividad Semanal
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#999' }} />
                        <YAxis hide />
                        <Tooltip 
                          cursor={{ fill: '#F5F5F0' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="Ingresos" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="Gastos" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E4E3E0]">
                  <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <PieChart size={20} className="text-gray-400" />
                    Gastos por Categoría
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={categoryData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={['#5A5A40', '#8B8B6B', '#A8A88F', '#C4C4B3', '#E1E1D7'][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="bg-white rounded-3xl shadow-sm border border-[#E4E3E0] overflow-hidden">
                <div className="p-6 border-b border-[#E4E3E0] flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Transacciones Recientes</h3>
                  <button 
                    onClick={() => setActiveTab('history')}
                    className="text-sm font-medium text-[#5A5A40] hover:underline"
                  >
                    Ver todo
                  </button>
                </div>
                <div className="divide-y divide-[#E4E3E0]">
                  {transactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          tx.type === 'income' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                        )}>
                          {tx.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{tx.description || tx.category}</p>
                            {tx.isRecurring && (
                              <span className="bg-[#5A5A40]/10 text-[#5A5A40] text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-tighter flex items-center gap-0.5">
                                <Repeat size={8} /> Fijo
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {format(tx.date?.toDate ? tx.date.toDate() : new Date(tx.date), 'dd MMM', { locale: es })} • {tx.userName}
                          </p>
                        </div>
                      </div>
                      <p className={cn(
                        "font-bold",
                        tx.type === 'income' ? "text-green-600" : "text-red-600"
                      )}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                      No hay transacciones aún.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold">Historial Completo</h2>
              <div className="bg-white rounded-3xl shadow-sm border border-[#E4E3E0] overflow-hidden">
                <div className="divide-y divide-[#E4E3E0]">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-gray-50 group">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          tx.type === 'income' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                        )}>
                          {tx.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{tx.description || tx.category}</p>
                            {tx.isRecurring && (
                              <span className="bg-[#5A5A40]/10 text-[#5A5A40] text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-tighter flex items-center gap-0.5">
                                <Repeat size={8} /> Fijo
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {format(tx.date?.toDate ? tx.date.toDate() : new Date(tx.date), 'PPP', { locale: es })} • {tx.userName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className={cn(
                          "font-bold",
                          tx.type === 'income' ? "text-green-600" : "text-red-600"
                        )}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </p>
                        {tx.userId === user?.uid && (
                          <button 
                            onClick={() => handleDelete(tx.id)}
                            className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'group' && (
            <motion.div 
              key="group"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E4E3E0]">
                <h2 className="text-2xl font-bold mb-2">{group?.name}</h2>
                <p className="text-gray-500 mb-6">Gestiona los miembros de tu familia o grupo.</p>
                
                <div className="bg-[#F5F5F0] p-4 rounded-2xl mb-8 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]">Código de Invitación</p>
                    <p className="text-2xl font-mono font-bold">{group?.inviteCode}</p>
                  </div>
                  <button 
                    onClick={() => {
                      const shareUrl = `${window.location.origin}${window.location.pathname}?join=${group?.inviteCode}`;
                      const message = `¡Hola! Únete a mi grupo "${group?.name}" en Finanza para gestionar nuestros gastos juntos.\n\nCódigo: ${group?.inviteCode}\n\nÚnete aquí: ${shareUrl}`;
                      navigator.clipboard.writeText(message);
                      toast.success('Invitación copiada al portapapeles');
                    }}
                    className="bg-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm border border-[#E4E3E0] hover:bg-gray-50 transition-colors"
                  >
                    Copiar Invitación
                  </button>
                </div>

                <h3 className="font-semibold mb-4">Miembros ({group?.members.length})</h3>
                <div className="space-y-4">
                  {group?.members.map((memberId) => (
                    <div key={memberId} className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold">
                        {memberId.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{memberId === user?.uid ? 'Tú' : 'Miembro'}</p>
                        <p className="text-xs text-gray-400">{memberId === group.ownerId ? 'Propietario' : 'Colaborador'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'recurring' && (
            <motion.div 
              key="recurring"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Gastos Fijos</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Programación mensual</p>
                </div>
                <button 
                  onClick={() => {
                    setIsAdding(true);
                    setIsRecurring(true);
                  }}
                  className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md"
                >
                  Nuevo
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {recurringExpenses.map((re) => (
                  <div key={re.id} className="bg-white p-5 rounded-[32px] shadow-sm border border-[#E4E3E0] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#F5F5F0] rounded-2xl flex items-center justify-center text-[#5A5A40]">
                        <CalendarDays size={24} />
                      </div>
                      <div>
                        <p className="font-bold">{re.description || re.category}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                          Día {re.dayOfMonth} • {re.paymentMethod}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-black text-red-600">{formatCurrency(re.amount)}</p>
                      <button 
                        onClick={() => handleDeleteRecurring(re.id)}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                {recurringExpenses.length === 0 && (
                  <div className="bg-white p-12 rounded-[32px] border border-dashed border-gray-300 text-center">
                    <Repeat size={48} className="mx-auto text-gray-200 mb-4" />
                    <p className="text-gray-400 font-medium">No tienes gastos fijos configurados.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-[#E4E3E0] px-6 py-3 pb-8 z-30">
        <div className="max-w-md mx-auto flex items-center justify-between relative">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-all duration-300",
              activeTab === 'dashboard' ? "text-[#5A5A40] scale-110" : "text-gray-400"
            )}
          >
            <div className={cn(
              "p-1 rounded-xl transition-colors",
              activeTab === 'dashboard' ? "bg-[#5A5A40]/10" : ""
            )}>
              <LayoutDashboard size={22} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">Inicio</span>
          </button>

          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-all duration-300",
              activeTab === 'history' ? "text-[#5A5A40] scale-110" : "text-gray-400"
            )}
          >
            <div className={cn(
              "p-1 rounded-xl transition-colors",
              activeTab === 'history' ? "bg-[#5A5A40]/10" : ""
            )}>
              <History size={22} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">Historial</span>
          </button>
          
          {/* Floating Action Button */}
          <div className="relative -top-8">
            <button 
              onClick={() => {
                setIsRecurring(false);
                setIsAdding(true);
              }}
              className="w-16 h-16 bg-[#5A5A40] text-white rounded-[24px] flex items-center justify-center shadow-2xl shadow-[#5A5A40]/40 border-4 border-white hover:scale-110 active:scale-95 transition-all"
            >
              <Plus size={32} strokeWidth={3} />
            </button>
          </div>

          <button 
            onClick={() => setActiveTab('recurring')}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-all duration-300",
              activeTab === 'recurring' ? "text-[#5A5A40] scale-110" : "text-gray-400"
            )}
          >
            <div className={cn(
              "p-1 rounded-xl transition-colors",
              activeTab === 'recurring' ? "bg-[#5A5A40]/10" : ""
            )}>
              <Repeat size={22} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">Fijos</span>
          </button>

          <button 
            onClick={() => setActiveTab('group')}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-all duration-300",
              activeTab === 'group' ? "text-[#5A5A40] scale-110" : "text-gray-400"
            )}
          >
            <div className={cn(
              "p-1 rounded-xl transition-colors",
              activeTab === 'group' ? "bg-[#5A5A40]/10" : ""
            )}>
              <Users size={22} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">Familia</span>
          </button>

          <button 
            onClick={() => {
              // Quick access to budget
              setBudgetInput(group?.budget?.toString() || '');
              const initialCategoryBudgets: Record<string, string> = {};
              const allCategories = [...CATEGORIES.expense, ...(group?.customCategories || [])];
              allCategories.forEach(cat => {
                initialCategoryBudgets[cat] = group?.categoryBudgets?.[cat]?.toString() || '';
              });
              setCategoryBudgetsInput(initialCategoryBudgets);
              setCustomCategoriesInput(group?.customCategories || []);
              setIsBudgetModalOpen(true);
            }}
            className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-[#5A5A40] transition-all"
          >
            <div className="p-1 rounded-xl">
              <Target size={22} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">Metas</span>
          </button>
        </div>
      </nav>

      {/* Budget Modal */}
      <AnimatePresence>
        {isBudgetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBudgetModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg bg-white rounded-t-[40px] sm:rounded-[40px] shadow-2xl border border-[#E4E3E0] overflow-hidden"
            >
              <div className="p-8 max-h-[85vh] overflow-y-auto pb-12">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 sm:hidden" />
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">Presupuesto</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Configuración mensual</p>
                  </div>
                  <button onClick={() => setIsBudgetModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
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
                        className="w-full pl-8 pr-4 py-4 bg-[#F5F5F0] rounded-2xl border-none focus:ring-2 focus:ring-[#5A5A40] font-bold text-lg"
                      />
                    </div>
                    {(() => {
                      const total = Object.values(categoryBudgetsInput).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
                      const global = parseFloat(budgetInput) || 0;
                      return total > 0 && (
                        <p className={cn(
                          "mt-2 text-[10px] font-bold uppercase tracking-wider",
                          total > global ? "text-red-500" : "text-green-600"
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
                        className="flex-1 bg-[#F5F5F0] rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#5A5A40]"
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          if (newCategoryInput.trim()) {
                            setCustomCategoriesInput(prev => [...prev, newCategoryInput.trim()]);
                            setNewCategoryInput('');
                          }
                        }}
                        className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-sm font-bold"
                      >
                        Agregar
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {customCategoriesInput.map(cat => (
                        <div key={cat} className="bg-gray-100 px-3 py-1 rounded-full flex items-center gap-2">
                          <span className="text-xs font-medium">{cat}</span>
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
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Presupuesto por Categoría (Opcional)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[...CATEGORIES.expense, ...customCategoriesInput].map(cat => (
                        <div key={cat}>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1">{cat}</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Q</span>
                            <input 
                              type="number" 
                              value={categoryBudgetsInput[cat] || ''}
                              onChange={(e) => setCategoryBudgetsInput(prev => ({ ...prev, [cat]: e.target.value }))}
                              placeholder="0.00"
                              className="w-full pl-6 pr-3 py-2 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-[#5A5A40] text-sm font-bold"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-[#5A5A40] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#4A4A30] transition-colors"
                  >
                    Guardar Presupuestos
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] p-6 sm:p-8 relative shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-bold">{isRecurring ? 'Nuevo Gasto Fijo' : 'Nueva Transacción'}</h2>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isRecurring) {
                    handleAddRecurring(e);
                  } else {
                    handleAddTransaction(e);
                  }
                }} 
                className="space-y-5"
              >
                {!isRecurring && (
                  <div className="flex p-1 bg-gray-100 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setType('expense')}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
                        type === 'expense' ? "bg-white shadow-sm text-red-600" : "text-gray-500"
                      )}
                    >
                      Gasto
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('income')}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
                        type === 'income' ? "bg-white shadow-sm text-green-600" : "text-gray-500"
                      )}
                    >
                      Ingreso
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Monto</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">Q</span>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-10 pr-4 text-2xl font-bold focus:ring-2 focus:ring-[#5A5A40]"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Categoría</label>
                    <select 
                      required
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-gray-50 border-none rounded-2xl py-4 px-4 focus:ring-2 focus:ring-[#5A5A40]"
                    >
                      <option value="">Seleccionar</option>
                      {(type === 'expense' ? [...CATEGORIES.expense, ...(group?.customCategories || [])] : CATEGORIES.income).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  {type === 'expense' && !isRecurring ? (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Fecha</label>
                      <input 
                        type="date" 
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-gray-50 border-none rounded-2xl py-4 px-4 focus:ring-2 focus:ring-[#5A5A40]"
                      />
                    </div>
                  ) : type === 'expense' && isRecurring ? (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Día del Mes</label>
                      <select 
                        required
                        value={dayOfMonth}
                        onChange={(e) => setDayOfMonth(e.target.value)}
                        className="w-full bg-gray-50 border-none rounded-2xl py-4 px-4 focus:ring-2 focus:ring-[#5A5A40]"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Fecha</label>
                      <input 
                        type="date" 
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-gray-50 border-none rounded-2xl py-4 px-4 focus:ring-2 focus:ring-[#5A5A40]"
                      />
                    </div>
                  )}
                </div>

                {type === 'expense' && !isRecurring && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Forma de Pago</label>
                    <div className="grid grid-cols-2 gap-2">
                      {PAYMENT_METHODS.map(method => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-all",
                            paymentMethod === method 
                              ? "bg-[#5A5A40] text-white border-[#5A5A40] shadow-md" 
                              : "bg-white text-gray-600 border-gray-200 hover:border-[#5A5A40]"
                          )}
                        >
                          {method === 'Efectivo' && <Banknote size={16} />}
                          {method === 'Tarjeta' && <CreditCard size={16} />}
                          {method === 'Transferencia' && <ArrowUpRight size={16} />}
                          {method === 'Otros' && <PlusCircle size={16} />}
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isRecurring && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Forma de Pago</label>
                    <div className="grid grid-cols-2 gap-2">
                      {PAYMENT_METHODS.map(method => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-all",
                            paymentMethod === method 
                              ? "bg-[#5A5A40] text-white border-[#5A5A40] shadow-md" 
                              : "bg-white text-gray-600 border-gray-200 hover:border-[#5A5A40]"
                          )}
                        >
                          {method === 'Efectivo' && <Banknote size={16} />}
                          {method === 'Tarjeta' && <CreditCard size={16} />}
                          {method === 'Transferencia' && <ArrowUpRight size={16} />}
                          {method === 'Otros' && <PlusCircle size={16} />}
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Descripción (Opcional)</label>
                  <input 
                    type="text" 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-4 focus:ring-2 focus:ring-[#5A5A40]"
                    placeholder={isRecurring ? "Ej. Pago de Hipoteca" : "Ej. Almuerzo en el trabajo"}
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-[#5A5A40] text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-[#4A4A30] transition-colors"
                >
                  {isRecurring ? 'Configurar Gasto Fijo' : 'Guardar Transacción'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Landing() {
  const { signIn, createGroup, joinGroup, profile, loading, user } = useAuth();
  const [step, setStep] = useState<'login' | 'choice' | 'create' | 'join'>('login');
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    
    if (joinCode) {
      setInviteCode(joinCode);
      if (profile) {
        // If already logged in and has profile, maybe they want to switch? 
        // For now, let's just pre-fill if they are at the join step
      } else if (step === 'login') {
        // We'll wait for them to login, then we can auto-redirect to join step
      }
    }

    if (!loading && profile) {
      // User is already in a group, handled by App component
    } else if (!loading && !profile && step === 'login') {
      // If we have a join code, let's skip the choice and go straight to join after login
      if (joinCode && user) {
        setStep('join');
      }
    }
  }, [loading, profile, user, step]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setIsActionLoading(true);
    try {
      await createGroup(groupName);
    } catch (error) {
      toast.error('Error al crear grupo');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();
    setIsActionLoading(true);
    try {
      await joinGroup(inviteCode);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al unirse');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-8 rounded-[40px] shadow-xl border border-[#E4E3E0] text-center"
      >
        <div className="w-16 h-16 bg-[#5A5A40] rounded-2xl flex items-center justify-center text-white mx-auto mb-6">
          <Wallet size={32} />
        </div>
        
        <AnimatePresence mode="wait">
          {step === 'login' && (
            <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h1 className="text-3xl font-bold mb-2">Bienvenido a Finanza</h1>
              <p className="text-gray-500 mb-8">Toma el control de tu presupuesto personal y familiar de forma sencilla.</p>
              <button 
                disabled={isActionLoading}
                onClick={async () => {
                  setIsActionLoading(true);
                  try {
                    await signIn();
                    setStep('choice');
                  } catch (error) {
                    toast.error('Error al iniciar sesión');
                  } finally {
                    setIsActionLoading(false);
                  }
                }}
                className="w-full flex items-center justify-center gap-3 bg-white border border-[#E4E3E0] py-4 rounded-2xl font-bold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isActionLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#5A5A40]" />
                ) : (
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                )}
                {isActionLoading ? 'Iniciando sesión...' : 'Continuar con Google'}
              </button>
            </motion.div>
          )}

          {step === 'choice' && (
            <motion.div key="choice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold mb-2">Casi listo</h2>
              <p className="text-gray-500 mb-8">¿Cómo quieres empezar a gestionar tu presupuesto?</p>
              <div className="space-y-4">
                <button 
                  onClick={() => setStep('create')}
                  className="w-full bg-[#5A5A40] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#4A4A30] transition-colors"
                >
                  Crear nuevo grupo
                </button>
                <button 
                  onClick={() => setStep('join')}
                  className="w-full bg-white border border-[#E4E3E0] py-4 rounded-2xl font-bold hover:bg-gray-50 transition-colors"
                >
                  Unirse a un grupo existente
                </button>
              </div>
            </motion.div>
          )}

          {step === 'create' && (
            <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold mb-2">Crear Grupo</h2>
              <p className="text-gray-500 mb-8">Dale un nombre a tu presupuesto familiar o personal.</p>
              <form onSubmit={handleCreate} className="space-y-4">
                <input 
                  type="text" 
                  required
                  disabled={isActionLoading}
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ej. Familia Pérez o Mi Presupuesto"
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-[#5A5A40] disabled:opacity-50"
                />
                <button 
                  type="submit"
                  disabled={isActionLoading}
                  className="w-full bg-[#5A5A40] text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isActionLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                  {isActionLoading ? 'Creando...' : 'Comenzar'}
                </button>
                <button type="button" onClick={() => setStep('choice')} disabled={isActionLoading} className="text-sm text-gray-400 font-medium disabled:opacity-50">Volver</button>
              </form>
            </motion.div>
          )}

          {step === 'join' && (
            <motion.div key="join" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold mb-2">Unirse a Grupo</h2>
              <p className="text-gray-500 mb-8">Ingresa el código que te compartieron.</p>
              <form onSubmit={handleJoin} className="space-y-4">
                <input 
                  type="text" 
                  required
                  disabled={isActionLoading}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="CÓDIGO"
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-center text-2xl font-mono font-bold focus:ring-2 focus:ring-[#5A5A40] disabled:opacity-50"
                />
                <button 
                  type="submit"
                  disabled={isActionLoading}
                  className="w-full bg-[#5A5A40] text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isActionLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                  {isActionLoading ? 'Uniéndose...' : 'Unirse ahora'}
                </button>
                <button type="button" onClick={() => setStep('choice')} disabled={isActionLoading} className="text-sm text-gray-400 font-medium disabled:opacity-50">Volver</button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function AdminPanel() {
  const { logout, setViewMode } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubGroups = onSnapshot(collection(db, 'groups'), (snapshot) => {
      setGroups(snapshot.docs.map(doc => doc.data() as Group));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'groups');
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    const unsubNotifs = onSnapshot(
      query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(10)), 
      (snapshot) => {
        setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
      }
    );
    setLoading(false);
    return () => {
      unsubGroups();
      unsubUsers();
      unsubNotifs();
    };
  }, []);

  const authorizeGroup = async (groupId: string) => {
    try {
      await setDoc(doc(db, 'groups', groupId), { status: 'active' }, { merge: true });
      toast.success('Grupo autorizado correctamente');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${groupId}`);
    }
  };

  if (loading) return null;

  const pendingGroups = groups.filter(g => g.status === 'pending');
  const activeGroups = groups.filter(g => g.status === 'active');

  return (
    <div className="min-h-screen bg-[#F5F5F0] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#5A5A40]">Panel de Administración</h1>
            <p className="text-gray-500">Gestión global de Finanza</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setViewMode('personal')}
              className="flex items-center gap-2 bg-white border border-[#E4E3E0] px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
            >
              <LayoutDashboard size={18} />
              <span>Vista Personal</span>
            </button>
            <button onClick={logout} className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors">
              <LogOut size={20} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E4E3E0]">
            <p className="text-gray-500 text-sm mb-1">Total Usuarios</p>
            <p className="text-3xl font-bold">{users.length}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E4E3E0]">
            <p className="text-gray-500 text-sm mb-1">Grupos Activos</p>
            <p className="text-3xl font-bold text-green-600">{activeGroups.length}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E4E3E0]">
            <p className="text-gray-500 text-sm mb-1">Pendientes</p>
            <p className="text-3xl font-bold text-amber-600">{pendingGroups.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-[40px] shadow-xl border border-[#E4E3E0] overflow-hidden">
          <div className="p-8 border-b border-[#F0EFEA]">
            <h2 className="text-xl font-bold">Solicitudes de Autorización</h2>
          </div>
          <div className="divide-y divide-[#F0EFEA]">
            {pendingGroups.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                No hay solicitudes pendientes
              </div>
            ) : (
              pendingGroups.map(g => {
                const owner = users.find(u => u.uid === g.ownerId);
                return (
                  <div key={g.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <h3 className="font-bold text-lg">{g.name}</h3>
                      <p className="text-sm text-gray-500">Solicitado por: {owner?.displayName || owner?.email || 'Desconocido'}</p>
                      <p className="text-xs text-gray-400">ID: {g.id}</p>
                    </div>
                    <button 
                      onClick={() => authorizeGroup(g.id)}
                      className="bg-[#5A5A40] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#4A4A30] transition-colors"
                    >
                      Autorizar
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-[40px] shadow-xl border border-[#E4E3E0] overflow-hidden">
            <div className="p-8 border-b border-[#F0EFEA]">
              <h2 className="text-xl font-bold">Todos los Grupos</h2>
            </div>
            <div className="divide-y divide-[#F0EFEA]">
              {activeGroups.map(g => (
                <div key={g.id} className="p-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">{g.name}</h3>
                    <p className="text-sm text-gray-500">{g.members.length} miembros • Código: {g.inviteCode}</p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase">Activo</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[40px] shadow-xl border border-[#E4E3E0] overflow-hidden">
            <div className="p-8 border-b border-[#F0EFEA]">
              <h2 className="text-xl font-bold">Registro de Notificaciones</h2>
            </div>
            <div className="divide-y divide-[#F0EFEA]">
              {notifications.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  Sin notificaciones recientes
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase text-[#5A5A40] bg-[#F0EFEA] px-2 py-0.5 rounded">
                        {n.type === 'group_join' ? 'Unión a Grupo' : 'Notificación'}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {n.createdAt?.toDate ? format(n.createdAt.toDate(), 'HH:mm') : ''}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">{n.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">Enviado a: {n.to}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PendingAuthorization() {
  const { logout, group } = useAuth();
  return (
    <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center p-4 text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white p-10 rounded-[40px] shadow-xl border border-[#E4E3E0]"
      >
        <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center text-amber-600 mx-auto mb-8">
          <Loader2 size={40} className="animate-spin" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Esperando Autorización</h1>
        <p className="text-gray-500 mb-2">Tu grupo <span className="font-bold text-[#5A5A40]">"{group?.name}"</span> ha sido creado con éxito.</p>
        <p className="text-gray-500 mb-8">El administrador debe autorizar tu solicitud antes de que puedas comenzar a registrar transacciones. Se te notificará automáticamente.</p>
        
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 rounded-2xl text-amber-800 text-sm font-medium">
            Estado: Pendiente de revisión
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-red-500 font-medium transition-colors"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function AppContent() {
  const { user, profile, group, isAdmin, viewMode, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-12 h-12 bg-[#5A5A40] rounded-2xl"
        />
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  if (isAdmin && viewMode === 'admin') {
    return <AdminPanel />;
  }

  if (!profile) {
    return <Landing />;
  }

  if (group?.status === 'pending') {
    return <PendingAuthorization />;
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </ErrorBoundary>
  );
}
