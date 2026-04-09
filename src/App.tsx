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
  User,
  Check,
  PieChart, 
  History,
  LayoutDashboard,
  PlusCircle,
  Pencil,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  Loader2,
  Target,
  X,
  CreditCard,
  Banknote,
  Repeat,
  CalendarDays,
  Play
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
  limit,
  writeBatch,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';
import { Transaction, CATEGORIES, TransactionType, Group, UserProfile, PaymentMethod, PAYMENT_METHODS, RecurringExpense } from './types';
import { formatCurrency, cn } from './lib/utils';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';
import { format, isLastDayOfMonth, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

const GUATEMALA_TZ = 'America/Guatemala';
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
  const { user, profile, group, groups, logout, isAdmin, viewMode, setViewMode, switchGroup, createGroup, joinGroup } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, UserProfile>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'group' | 'recurring'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

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
  const [endDate, setEndDate] = useState('');
  const [editingRecurringId, setEditingRecurringId] = useState<string | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [hasProcessedRecurring, setHasProcessedRecurring] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupAction, setGroupAction] = useState<'create' | 'join'>('create');
  const [newGroupName, setNewGroupName] = useState('');
  const [joinInviteCode, setJoinInviteCode] = useState('');
  const [isGroupActionLoading, setIsGroupActionLoading] = useState(false);

  // Fetch member profiles
  useEffect(() => {
    if (!group?.members || group.members.length === 0) {
      setMemberProfiles({});
      return;
    }

    const fetchMembers = async () => {
      try {
        const profiles: Record<string, UserProfile> = {};
        const memberIds = group.members;
        
        // Firestore 'in' query is limited to 10 items. For larger groups, we'd need to chunk this.
        // Assuming family groups are small (< 10 members).
        const q = query(collection(db, 'users'), where('uid', 'in', memberIds));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
          profiles[doc.id] = doc.data() as UserProfile;
        });
        setMemberProfiles(profiles);
      } catch (error) {
        console.error("Error fetching member profiles:", error);
      }
    };

    fetchMembers();
  }, [group?.members]);

  const exportToCSV = () => {
    if (!group) return;
    
    // Header
    let csv = "Tipo,Categoría,Monto,Descripción,Fecha,Usuario\n";
    
    // All Transactions
    transactions.forEach(t => {
      const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      const row = [
        t.type === 'income' ? 'Ingreso' : 'Gasto',
        t.category,
        t.amount,
        `"${t.description || ''}"`,
        format(tDate, 'yyyy-MM-dd'),
        t.userName
      ].join(",");
      csv += row + "\n";
    });

    // Budget Info
    csv += "\n\nPresupuesto del Grupo\n";
    csv += `Presupuesto Global,${group.budget || 0}\n`;
    csv += "\nPresupuesto por Categoría\n";
    Object.entries(group.categoryBudgets || {}).forEach(([cat, budget]) => {
      csv += `${cat},${budget}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `FamiCash_Historial_Completo_${group.name}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTemplate = () => {
    let csv = "Categoría,Presupuesto\n";
    CATEGORIES.expense.forEach(cat => {
      csv += `${cat},0\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "FamiCash_Plantilla_Presupuesto.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.groupId) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newCategoryBudgets: Record<string, number> = {};
      let totalBudget = 0;

      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [category, budgetStr] = line.split(',');
        const budget = parseFloat(budgetStr);
        if (category && !isNaN(budget)) {
          newCategoryBudgets[category] = budget;
          totalBudget += budget;
        }
      }

      try {
        await setDoc(doc(db, 'groups', profile.groupId), {
          budget: totalBudget,
          categoryBudgets: newCategoryBudgets
        }, { merge: true });
        toast.success('Presupuesto importado con éxito');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `groups/${profile.groupId}`);
      }
    };
    reader.readAsText(file);
  };

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
    if (!profile?.groupId || !user || recurringExpenses.length === 0 || hasProcessedRecurring) return;

    const today = new Date();
    const currentMonth = format(today, 'yyyy-MM');
    const currentDay = today.getDate();
    const isLastDay = isLastDayOfMonth(today);

    const processExpenses = async () => {
      setHasProcessedRecurring(true);
      for (const re of recurringExpenses) {
        if (re.status === 'finished') continue;

        if (re.endDate && new Date(re.endDate) < today) {
          try {
            await setDoc(doc(db, 'groups', profile.groupId, 'recurringExpenses', re.id), {
              ...re,
              status: 'finished',
              active: false
            });
            toast.info(`Fijo "${re.category}" ha finalizado`);
          } catch (error) {
            console.error('Error finishing recurring expense:', error);
          }
          continue;
        }

        const shouldProcess = re.dayOfMonth <= currentDay || (isLastDay && re.dayOfMonth > currentDay);

        // EXTRA CHECK: Verify if a transaction for this recurringId already exists in THIS month
        const alreadyExists = transactions.some(t => 
          t.recurringId === re.id && 
          t.date && 
          format(t.date.toDate ? t.date.toDate() : new Date(t.date), 'yyyy-MM') === currentMonth
        );

        if (re.lastProcessedMonth !== currentMonth && shouldProcess && !alreadyExists) {
          try {
            const batch = writeBatch(db);
            // Deterministic ID to prevent duplicates
            const txId = `rec_${re.id}_${currentMonth}`;
            
            batch.set(doc(db, 'groups', profile.groupId, 'transactions', txId), {
              groupId: profile.groupId,
              userId: user.uid,
              userName: user.displayName || 'Sistema',
              amount: re.amount,
              type: re.type || 'expense',
              category: re.category,
              description: `(Fijo) ${re.description || re.category}`,
              paymentMethod: re.type === 'income' ? null : re.paymentMethod,
              date: serverTimestamp(),
              createdAt: serverTimestamp(),
              isRecurring: true,
              recurringId: re.id
            });

            batch.update(doc(db, 'groups', profile.groupId, 'recurringExpenses', re.id), {
              lastProcessedMonth: currentMonth
            });
            
            await batch.commit();
            toast.info(`Fijo "${re.category}" registrado`);
          } catch (error) {
            // Ignore if already exists (another client processed it)
            if (error instanceof Error && !error.message.includes('already-exists')) {
              console.error('Error processing recurring expense:', error);
            }
          }
        }
      }
    };

    processExpenses();
  }, [profile?.groupId, user, recurringExpenses, transactions, hasProcessedRecurring]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      return formatInTimeZone(tDate, GUATEMALA_TZ, 'yyyy-MM') === selectedMonth;
    });
  }, [transactions, selectedMonth]);

  const paymentMethodStats = useMemo(() => {
    const methods: Record<string, number> = {};
    filteredTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const method = t.paymentMethod || 'Otros';
        methods[method] = (methods[method] || 0) + t.amount;
      });
    return Object.entries(methods).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  const stats = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

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
    filteredTransactions
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
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month - 1, i + 1);
      return format(d, 'yyyy-MM-dd');
    });

    return days.map(day => {
      const dayTxs = filteredTransactions.filter(t => {
        const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
        const dayStr = formatInTimeZone(tDate, GUATEMALA_TZ, 'yyyy-MM-dd');
        return dayStr === day;
      });
      return {
        name: parseInt(day.split('-')[2]).toString(),
        Ingresos: dayTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        Gastos: dayTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
      };
    });
  }, [filteredTransactions, selectedMonth]);

  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'expense').forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  const handleAddTransaction = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile?.groupId || !user) return;

    try {
      const data = {
        groupId: profile.groupId,
        userId: user.uid,
        userName: user.displayName || 'Usuario',
        amount: parseFloat(amount),
        type,
        category,
        description,
        paymentMethod: type === 'expense' ? paymentMethod : null,
        date: Timestamp.fromDate(fromZonedTime(date, GUATEMALA_TZ)),
        updatedAt: serverTimestamp(),
      };

      if (editingTransactionId) {
        await setDoc(doc(db, 'groups', profile.groupId, 'transactions', editingTransactionId), data, { merge: true });
        toast.success('Transacción actualizada');
      } else {
        await addDoc(collection(db, 'groups', profile.groupId, 'transactions'), {
          ...data,
          createdAt: serverTimestamp(),
        });
        toast.success('Transacción agregada');
      }

      setIsAdding(false);
      setEditingTransactionId(null);
      setAmount('');
      setCategory('');
      setDescription('');
      setIsRecurring(false);
    } catch (error) {
      handleFirestoreError(error, editingTransactionId ? OperationType.UPDATE : OperationType.WRITE, `groups/${profile.groupId}/transactions`);
    }
  };

  const handleProcessRecurringManually = async (re: RecurringExpense) => {
    if (!profile?.groupId || !user) return;
    
    const today = new Date();
    const currentMonth = format(today, 'yyyy-MM');
    
    try {
      const batch = writeBatch(db);
      // Use a unique ID but allow manual re-processing if needed by adding a timestamp or random string
      // However, the user said "deterministic" before. Let's use a slightly different ID for manual ones
      // or just allow it to overwrite if it's the same month.
      // Actually, user wants to avoid double execution but also wants a manual button.
      // Let's use a timestamp for manual ones to allow multiple if they really want to.
      const txId = `manual_rec_${re.id}_${Date.now()}`;
      
      batch.set(doc(db, 'groups', profile.groupId, 'transactions', txId), {
        groupId: profile.groupId,
        userId: user.uid,
        userName: user.displayName || 'Sistema',
        amount: re.amount,
        type: re.type || 'expense',
        category: re.category,
        description: `(Manual) ${re.description || re.category}`,
        paymentMethod: re.type === 'income' ? null : re.paymentMethod,
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
        isRecurring: true,
        recurringId: re.id
      });

      batch.update(doc(db, 'groups', profile.groupId, 'recurringExpenses', re.id), {
        lastProcessedMonth: currentMonth
      });
      
      await batch.commit();
      toast.success(`Fijo "${re.category}" procesado manualmente`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `groups/${profile.groupId}/transactions`);
    }
  };

  const handleAddRecurring = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile?.groupId) return;

    try {
      const data = {
        groupId: profile.groupId,
        amount: parseFloat(amount),
        type,
        category,
        description,
        dayOfMonth: parseInt(dayOfMonth),
        paymentMethod: type === 'expense' ? paymentMethod : 'Otros',
        active: true,
        endDate: endDate || null,
        status: 'active',
        updatedAt: serverTimestamp(),
      };

      if (editingRecurringId) {
        await setDoc(doc(db, 'groups', profile.groupId, 'recurringExpenses', editingRecurringId), data, { merge: true });
        toast.success('Gasto fijo actualizado');
      } else {
        await addDoc(collection(db, 'groups', profile.groupId, 'recurringExpenses'), {
          ...data,
          createdAt: serverTimestamp(),
        });
        toast.success('Gasto fijo configurado');
      }
      
      setIsAdding(false);
      setEditingRecurringId(null);
      setAmount('');
      setCategory('');
      setDescription('');
      setEndDate('');
    } catch (error) {
      handleFirestoreError(error, editingRecurringId ? OperationType.UPDATE : OperationType.WRITE, `groups/${profile.groupId}/recurringExpenses`);
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

  const handleGroupAction = async (e: FormEvent) => {
    e.preventDefault();
    setIsGroupActionLoading(true);
    try {
      if (groupAction === 'create') {
        await createGroup(newGroupName);
        toast.success('Grupo creado con éxito');
        setNewGroupName('');
      } else {
        await joinGroup(joinInviteCode);
        toast.success('Te has unido al grupo');
        setJoinInviteCode('');
      }
      setIsGroupModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al procesar la solicitud');
    } finally {
      setIsGroupActionLoading(false);
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

  if (profile?.status === 'blocked') {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center p-4 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white p-10 rounded-[40px] shadow-xl border border-red-100"
        >
          <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center text-red-600 mx-auto mb-8">
            <X size={40} />
          </div>
          <h1 className="text-3xl font-bold mb-4 text-red-600">Cuenta Bloqueada</h1>
          <p className="text-gray-500 mb-8">Tu cuenta ha sido bloqueada por un administrador debido a un incumplimiento de las normas.</p>
          <button 
            onClick={logout}
            className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
          >
            Cerrar Sesión
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-[#E4E3E0] z-40 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#5A5A40] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#5A5A40]/20">
              <Wallet size={24} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold tracking-tight leading-tight">FamiCash</h1>
              {groups.length > 1 ? (
                <select 
                  value={profile?.groupId || ''} 
                  onChange={(e) => switchGroup(e.target.value)}
                  className="bg-transparent border-none p-0 text-[10px] font-bold text-[#5A5A40] uppercase tracking-widest focus:ring-0 cursor-pointer hover:underline"
                >
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-[10px] font-bold text-[#5A5A40] uppercase tracking-widest">{group?.name || 'Cargando...'}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center bg-gray-100 rounded-xl p-1">
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-[#5A5A40] focus:ring-0 py-1"
              />
            </div>
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
        <div className="sm:hidden mb-6">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Mes Seleccionado</label>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full bg-white border border-[#E4E3E0] rounded-2xl py-3 px-4 text-sm font-bold text-[#5A5A40] focus:ring-2 focus:ring-[#5A5A40]"
          />
        </div>

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

              {/* Payment Methods Summary */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E4E3E0]">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <CreditCard size={20} className="text-gray-400" />
                  Cuadre por Forma de Pago
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {PAYMENT_METHODS.map(method => {
                    const amount = paymentMethodStats.find(s => s.name === method)?.value || 0;
                    return (
                      <div key={method} className="bg-[#F5F5F0] p-4 rounded-2xl">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{method}</p>
                        <p className="text-lg font-black text-[#5A5A40]">{formatCurrency(amount)}</p>
                      </div>
                    );
                  })}
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
                  {filteredTransactions.slice(0, 5).map((tx) => (
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
                  {filteredTransactions.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                      No hay transacciones en este mes.
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
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Historial del Mes</h2>
                <button 
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E4E3E0] rounded-xl text-xs font-bold text-[#5A5A40] hover:bg-gray-50 transition-colors"
                >
                  <ArrowDownRight size={14} />
                  Exportar CSV
                </button>
              </div>
              <div className="bg-white rounded-3xl shadow-sm border border-[#E4E3E0] overflow-hidden">
                <div className="divide-y divide-[#E4E3E0]">
                  {filteredTransactions.map((tx) => (
                    <div key={tx.id} className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50 group gap-2 sm:gap-3">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className={cn(
                          "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex-shrink-0 flex items-center justify-center",
                          tx.type === 'income' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                        )}>
                          {tx.type === 'income' ? <ArrowUpRight size={18} className="sm:w-5 sm:h-5" /> : <ArrowDownRight size={18} className="sm:w-5 sm:h-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-medium text-sm sm:text-base">{tx.description || tx.category}</p>
                            {tx.isRecurring && (
                              <span className="bg-[#5A5A40]/10 text-[#5A5A40] text-[7px] sm:text-[8px] font-black uppercase px-1 py-0.5 rounded tracking-tighter flex-shrink-0 flex items-center gap-0.5">
                                <Repeat size={7} className="sm:w-2 sm:h-2" /> Fijo
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] sm:text-xs text-gray-500">
                            <span className="sm:hidden">{formatInTimeZone(tx.date?.toDate ? tx.date.toDate() : new Date(tx.date), GUATEMALA_TZ, 'dd/MM/yy')}</span>
                            <span className="hidden sm:inline">{formatInTimeZone(tx.date?.toDate ? tx.date.toDate() : new Date(tx.date), GUATEMALA_TZ, 'PPP', { locale: es })}</span>
                            {` • ${tx.userName}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-3 flex-shrink-0 text-right">
                        <p className={cn(
                          "font-bold text-sm sm:text-base whitespace-nowrap",
                          tx.type === 'income' ? "text-green-600" : "text-red-600"
                        )}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </p>
                        <div className="flex items-center sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => {
                              setEditingTransactionId(tx.id);
                              setAmount(tx.amount.toString());
                              setType(tx.type);
                              setCategory(tx.category);
                              setDescription(tx.description || '');
                              setPaymentMethod(tx.paymentMethod || 'Efectivo');
                              setDate(formatInTimeZone(tx.date?.toDate ? tx.date.toDate() : new Date(tx.date), GUATEMALA_TZ, 'yyyy-MM-dd'));
                              setIsAdding(true);
                              setIsRecurring(false);
                            }}
                            className="p-1.5 sm:p-2 text-gray-300 hover:text-[#5A5A40]"
                          >
                            <Pencil size={16} className="sm:w-[18px] sm:h-[18px]" />
                          </button>
                          {tx.userId === user?.uid && (
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
                
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                  <div className="w-full sm:w-auto flex items-center gap-3 p-4 bg-[#F5F5F0] rounded-2xl border border-[#E4E3E0]">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]">Código de Invitación</p>
                      <p className="text-xl font-mono font-bold">{group?.inviteCode}</p>
                    </div>
                    <button 
                      onClick={() => {
                        const shareUrl = `${window.location.origin}${window.location.pathname}?join=${group?.inviteCode}`;
                        const message = `¡Hola! Únete a mi grupo "${group?.name}" en Finanza para gestionar nuestros gastos juntos.\n\nCódigo: ${group?.inviteCode}\n\nÚnete aquí: ${shareUrl}`;
                        navigator.clipboard.writeText(message);
                        toast.success('Invitación copiada');
                      }}
                      className="ml-auto p-2 bg-white rounded-xl shadow-sm border border-[#E4E3E0] hover:bg-gray-50 transition-colors"
                    >
                      <Plus size={18} className="rotate-45" />
                    </button>
                  </div>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => {
                        setGroupAction('create');
                        setIsGroupModalOpen(true);
                      }}
                      className="flex-1 sm:flex-none bg-[#5A5A40] text-white px-4 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-[#4A4A30] transition-colors"
                    >
                      Nuevo Grupo
                    </button>
                    <button 
                      onClick={() => {
                        setGroupAction('join');
                        setIsGroupModalOpen(true);
                      }}
                      className="flex-1 sm:flex-none bg-white text-[#5A5A40] border border-[#E4E3E0] px-4 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors"
                    >
                      Unirse a Grupo
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold mb-4">Miembros ({group?.members.length})</h3>
                <div className="space-y-4">
                  {group?.members.map((memberId) => {
                    const memberProfile = memberProfiles[memberId];
                    const displayName = memberProfile?.displayName || memberProfile?.email || 'Miembro';
                    
                    return (
                      <div key={memberId} className="flex items-center gap-3">
                        {memberProfile?.photoURL ? (
                          <img 
                            src={memberProfile.photoURL} 
                            alt={displayName} 
                            className="w-10 h-10 rounded-full object-cover border border-gray-100"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold">
                            {displayName.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {memberId === user?.uid ? `${displayName} (Tú)` : displayName}
                          </p>
                          <p className="text-xs text-gray-400">{memberId === group.ownerId ? 'Propietario' : 'Colaborador'}</p>
                        </div>
                      </div>
                    );
                  })}
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
                  <div key={re.id} className="bg-white p-4 sm:p-5 rounded-[32px] shadow-sm border border-[#E4E3E0] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#F5F5F0] rounded-2xl flex-shrink-0 flex items-center justify-center text-[#5A5A40]">
                        <CalendarDays size={20} className="sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold truncate">{re.description || re.category}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">
                            Día {re.dayOfMonth} • {re.paymentMethod}
                          </p>
                          {re.status === 'finished' && (
                            <span className="text-[8px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter flex-shrink-0">Finalizado</span>
                          )}
                          {re.endDate && re.status !== 'finished' && (
                            <span className="text-[8px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter flex-shrink-0">Hasta: {re.endDate}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 text-right">
                      <div className="mr-1 sm:mr-2">
                        <p className={cn(
                          "font-black text-sm sm:text-base whitespace-nowrap",
                          re.type === 'income' ? "text-green-600" : "text-red-600"
                        )}>
                          {re.type === 'income' ? '+' : '-'}{formatCurrency(re.amount)}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <button 
                          onClick={() => handleProcessRecurringManually(re)}
                          className="p-1.5 sm:p-2 text-gray-300 hover:text-green-600 transition-colors"
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
                            setDayOfMonth(re.dayOfMonth.toString());
                            setPaymentMethod(re.paymentMethod);
                            setEndDate(re.endDate || '');
                            setIsAdding(true);
                          }}
                          className="p-1.5 sm:p-2 text-gray-300 hover:text-[#5A5A40] transition-colors"
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

      {/* Group Action Modal */}
      <AnimatePresence>
        {isGroupModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">
                    {groupAction === 'create' ? 'Crear Nuevo Grupo' : 'Unirse a un Grupo'}
                  </h2>
                  <button onClick={() => setIsGroupModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleGroupAction} className="space-y-6">
                  {groupAction === 'create' ? (
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Nombre del Grupo</label>
                      <input 
                        type="text" 
                        required
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Ej. Familia Pérez"
                        className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-[#5A5A40]"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Código de Invitación</label>
                      <input 
                        type="text" 
                        required
                        value={joinInviteCode}
                        onChange={(e) => setJoinInviteCode(e.target.value.toUpperCase())}
                        placeholder="ABC-123"
                        className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-[#5A5A40]"
                      />
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={isGroupActionLoading}
                    className="w-full bg-[#5A5A40] text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-[#4A4A30] transition-colors disabled:opacity-50"
                  >
                    {isGroupActionLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                    {groupAction === 'create' ? 'Crear Grupo' : 'Unirse'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

                  <div className="space-y-4 pt-6 border-t border-[#F0EFEA]">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Importar/Exportar</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={downloadTemplate}
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors"
                      >
                        Descargar Plantilla
                      </button>
                      <label className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors cursor-pointer">
                        Subir CSV
                        <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
                      </label>
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
                <h2 className="text-xl sm:text-2xl font-bold">
                  {editingRecurringId ? 'Editar Fijo' : editingTransactionId ? 'Editar Transacción' : isRecurring ? 'Nuevo Fijo' : 'Nueva Transacción'}
                </h2>
                <button 
                  onClick={() => {
                    setIsAdding(false);
                    setEditingRecurringId(null);
                    setEditingTransactionId(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isRecurring || editingRecurringId) {
                    handleAddRecurring(e);
                  } else {
                    handleAddTransaction(e);
                  }
                }} 
                className="space-y-5"
              >
                {(true) && (
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
                  {type === 'expense' && !(isRecurring || editingRecurringId) ? (
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
                  ) : (isRecurring || editingRecurringId) ? (
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

                {(isRecurring || editingRecurringId) && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Fecha Fin (Opcional)</label>
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-gray-50 border-none rounded-2xl py-4 px-4 focus:ring-2 focus:ring-[#5A5A40]"
                    />
                    <p className="text-[10px] text-gray-400 px-2">El fijo se marcará como FINALIZADO después de esta fecha.</p>
                  </div>
                )}

                {(type === 'expense' || isRecurring || editingRecurringId) && (
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
                  {editingRecurringId ? 'Actualizar Fijo' : editingTransactionId ? 'Actualizar Transacción' : isRecurring ? 'Configurar Fijo' : 'Guardar Transacción'}
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

function BlockedScreen() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center p-4 text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white p-10 rounded-[40px] shadow-xl border border-[#E4E3E0]"
      >
        <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center text-red-600 mx-auto mb-8">
          <X size={40} />
        </div>
        <h1 className="text-3xl font-bold mb-4">Cuenta Bloqueada</h1>
        <p className="text-gray-500 mb-8">Lo sentimos, tu acceso a Finanza ha sido restringido por incumplimiento de nuestras normas de uso.</p>
        
        <div className="space-y-4">
          <div className="p-4 bg-red-50 rounded-2xl text-red-800 text-sm font-medium">
            Estado: Acceso denegado
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

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
    try {
      await setDoc(doc(db, 'users', userId), { status: newStatus }, { merge: true });
      toast.success(`Usuario ${newStatus === 'blocked' ? 'bloqueado' : 'desbloqueado'} correctamente`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
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
                  <div key={g.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors gap-4">
                    <div className="min-w-0">
                      <h3 className="font-bold text-lg truncate">{g.name}</h3>
                      <p className="text-sm text-gray-500 truncate">Solicitado por: {owner?.displayName || owner?.email || 'Desconocido'}</p>
                      <p className="text-xs text-gray-400">ID: {g.id}</p>
                    </div>
                    <button 
                      onClick={() => authorizeGroup(g.id)}
                      className="bg-[#5A5A40] text-white px-4 sm:px-6 py-2 rounded-xl font-bold hover:bg-[#4A4A30] transition-colors flex-shrink-0 text-sm"
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
              <h2 className="text-xl font-bold">Gestión de Usuarios</h2>
            </div>
            <div className="divide-y divide-[#F0EFEA]">
              {users.map(u => (
                <div key={u.uid} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    {u.photoURL ? (
                      <img src={u.photoURL} alt={u.displayName || ''} className="w-10 h-10 rounded-full flex-shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex-shrink-0 flex items-center justify-center text-gray-400">
                        <User size={20} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-bold truncate">{u.displayName || 'Usuario'}</h3>
                      <p className="text-sm text-gray-500 truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <span className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase whitespace-nowrap ${u.status === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {u.status === 'blocked' ? 'Bloqueado' : 'Activo'}
                    </span>
                    {u.email !== 'kevinboteo@gmail.com' && (
                      <button 
                        onClick={() => toggleUserStatus(u.uid, u.status || 'active')}
                        className={`p-2 rounded-xl transition-colors flex-shrink-0 ${u.status === 'blocked' ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                        title={u.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                      >
                        {u.status === 'blocked' ? <Check size={18} /> : <X size={18} />}
                      </button>
                    )}
                  </div>
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
                  <div key={n.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] sm:text-xs font-bold uppercase text-[#5A5A40] bg-[#F0EFEA] px-2 py-0.5 rounded whitespace-nowrap">
                        {n.type === 'group_join' ? 'Unión a Grupo' : 'Notificación'}
                      </span>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {n.createdAt?.toDate ? format(n.createdAt.toDate(), 'HH:mm') : ''}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 break-words">{n.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1 truncate">Enviado a: {n.to}</p>
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

  if (profile.status === 'blocked') {
    return <BlockedScreen />;
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
