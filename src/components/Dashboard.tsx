import { useState, useEffect, useMemo, FormEvent } from 'react';
import { useAuth } from '../AuthContext';
import { 
  Plus, 
  Wallet, 
  LayoutDashboard,
  History,
  Repeat,
  Target,
  BarChart3,
  Sparkles,
  Settings,
  LogOut,
  Moon,
  Sun,
  Loader2,
  Users,
  Check,
  CreditCard
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
import { db } from '../firebase';
import { 
  Transaction, 
  CATEGORIES, 
  CATEGORY_EMOJIS, 
  TransactionType, 
  Group, 
  UserProfile, 
  PaymentMethod, 
  PAYMENT_METHODS, 
  RecurringExpense, 
  SavingsGoal 
} from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { format, isLastDayOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
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
import { FinancialAssistant } from './FinancialAssistant';

// Tab Components
import { HistoryTab } from './tabs/HistoryTab';
import { ReportsTab } from './tabs/ReportsTab';
import { RecurringTab } from './tabs/RecurringTab';
import { GoalsTab } from './tabs/GoalsTab';
import { FamilyTab } from './tabs/FamilyTab';
import { SettingsTab } from './tabs/SettingsTab';

// Modal Components
import { TransactionModal } from './modals/TransactionModal';
import { BudgetModal } from './modals/BudgetModal';
import { GoalModal } from './modals/GoalModal';
import { GroupModal } from './modals/GroupModal';
import { AddAmountModal } from './modals/AddAmountModal';
import { ConfirmModal } from './modals/ConfirmModal';

const GUATEMALA_TZ = 'America/Guatemala';

export function Dashboard() {
  const { 
    user, 
    profile, 
    group, 
    groups, 
    logout, 
    isAdmin, 
    viewMode, 
    setViewMode, 
    switchGroup, 
    createGroup, 
    joinGroup, 
    isSwitching,
    isDarkMode,
    setIsDarkMode,
    toggleAISharing
  } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, UserProfile>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isAddAmountModalOpen, setIsAddAmountModalOpen] = useState(false);
  const [selectedGoalForAmount, setSelectedGoalForAmount] = useState<SavingsGoal | null>(null);
  const [amountToAddInput, setAmountToAddInput] = useState('');
  const [shouldRecordAsTransaction, setShouldRecordAsTransaction] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'reports' | 'group' | 'recurring' | 'goals' | 'ai' | 'settings'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [reportType, setReportType] = useState<'category' | 'tag' | 'paymentMethod'>('category');
  const [reportPeriod, setReportPeriod] = useState<'month' | 'year'>('month');
  const [reportDisplay, setReportDisplay] = useState<'grouped' | 'detailed'>('grouped');
  const [reportYear, setReportYear] = useState(new Date().getFullYear().toString());
  const [reportTransactionType, setReportTransactionType] = useState<'expense' | 'income'>('expense');
  const [reportUnitFilter, setReportUnitFilter] = useState<string[]>([]);
  const [unitSearchInput, setUnitSearchInput] = useState('');
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  // Form state
  const [amount, setAmount] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
  const [categoryBudgetsInput, setCategoryBudgetsInput] = useState<Record<string, string>>({});
  const [categoryEmojisInput, setCategoryEmojisInput] = useState<Record<string, string>>({});
  const [customCategoriesInput, setCustomCategoriesInput] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Goal Form State
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

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

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [isGroupSelectorOpen, setIsGroupSelectorOpen] = useState(false);

  // Close group selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.group-selector')) {
        setIsGroupSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        const q = query(collection(db, 'users'), where('uid', 'in', memberIds));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
          profiles[doc.id] = doc.data() as UserProfile;
        });
        setMemberProfiles(profiles);
      } catch (error) {
        console.error("Error fetching members:", error);
      }
    };

    fetchMembers();
  }, [group?.members]);

  // Real-time transactions listener
  useEffect(() => {
    if (!profile?.groupId) return;

    const q = query(
      collection(db, 'transactions'),
      where('groupId', '==', profile.groupId),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Transaction));
      setTransactions(txs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return unsubscribe;
  }, [profile?.groupId]);

  // Real-time recurring expenses listener
  useEffect(() => {
    if (!profile?.groupId) return;

    const q = query(
      collection(db, 'recurring'),
      where('groupId', '==', profile.groupId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rec = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as RecurringExpense));
      setRecurringExpenses(rec);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'recurring');
    });

    return unsubscribe;
  }, [profile?.groupId]);

  // Real-time savings goals listener
  useEffect(() => {
    if (!profile?.groupId) return;

    const q = query(
      collection(db, 'goals'),
      where('groupId', '==', profile.groupId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const goals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SavingsGoal));
      setSavingsGoals(goals);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'goals');
    });

    return unsubscribe;
  }, [profile?.groupId]);

  // Process recurring expenses at the start of the month
  useEffect(() => {
    if (!profile?.groupId || recurringExpenses.length === 0 || hasProcessedRecurring) return;

    const processRecurring = async () => {
      const currentMonth = format(new Date(), 'yyyy-MM');
      const batch = writeBatch(db);
      let hasChanges = false;

      for (const rec of recurringExpenses) {
        if (!rec.active) continue;
        if (rec.lastProcessedMonth === currentMonth) continue;
        
        // Check if end date has passed
        if (rec.endDate && rec.endDate < format(new Date(), 'yyyy-MM-dd')) {
          batch.update(doc(db, 'recurring', rec.id), { active: false, status: 'finished' });
          hasChanges = true;
          continue;
        }

        // Create transaction for this month
        const txId = doc(collection(db, 'transactions')).id;
        const txDate = new Date();
        txDate.setDate(rec.dayOfMonth);
        
        // If dayOfMonth is 31 and month has 30, it will roll over to next month.
        // Let's adjust to last day of month if needed.
        if (isLastDayOfMonth(new Date())) {
          const lastDay = new Date(txDate.getFullYear(), txDate.getMonth() + 1, 0).getDate();
          if (rec.dayOfMonth > lastDay) {
            txDate.setDate(lastDay);
          }
        }

        const newTx: Transaction = {
          id: txId,
          groupId: profile.groupId,
          userId: 'system',
          userName: 'Sistema (Fijo)',
          amount: rec.amount,
          type: rec.type,
          category: rec.category,
          description: rec.description,
          paymentMethod: rec.paymentMethod,
          isRecurring: true,
          recurringId: rec.id,
          tags: rec.tags || [],
          date: Timestamp.fromDate(txDate),
          createdAt: serverTimestamp(),
        };

        batch.set(doc(db, 'transactions', txId), newTx);
        batch.update(doc(db, 'recurring', rec.id), { lastProcessedMonth: currentMonth });
        hasChanges = true;
      }

      if (hasChanges) {
        try {
          await batch.commit();
          console.log("Recurring expenses processed");
        } catch (error) {
          console.error("Error processing recurring:", error);
        }
      }
      setHasProcessedRecurring(true);
    };

    processRecurring();
  }, [profile?.groupId, recurringExpenses, hasProcessedRecurring]);

  const stats = useMemo(() => {
    const monthTxs = transactions.filter(tx => {
      const txDate = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
      return format(txDate, 'yyyy-MM') === selectedMonth;
    });

    const income = monthTxs.filter(tx => tx.type === 'income').reduce((acc, tx) => acc + tx.amount, 0);
    const expense = monthTxs.filter(tx => tx.type === 'expense').reduce((acc, tx) => acc + tx.amount, 0);
    const balance = income - expense;

    return { income, expense, balance };
  }, [transactions, selectedMonth]);

  const chartData = useMemo(() => {
    const daysInMonth = new Date(
      parseInt(selectedMonth.split('-')[0]),
      parseInt(selectedMonth.split('-')[1]),
      0
    ).getDate();

    const data = Array.from({ length: daysInMonth }, (_, i) => ({
      name: (i + 1).toString(),
      Ingresos: 0,
      Gastos: 0,
    }));

    transactions.forEach(tx => {
      const txDate = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
      if (format(txDate, 'yyyy-MM') === selectedMonth) {
        const day = txDate.getDate() - 1;
        if (data[day]) {
          if (tx.type === 'income') data[day].Ingresos += tx.amount;
          else data[day].Gastos += tx.amount;
        }
      }
    });

    return data;
  }, [transactions, selectedMonth]);

  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    transactions.forEach(tx => {
      const txDate = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
      if (format(txDate, 'yyyy-MM') === selectedMonth && tx.type === 'expense') {
        categories[tx.category] = (categories[tx.category] || 0) + tx.amount;
      }
    });

    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [transactions, selectedMonth]);

  const paymentMethodStats = useMemo(() => {
    const methods: Record<string, number> = {};
    transactions.forEach(tx => {
      const txDate = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
      if (format(txDate, 'yyyy-MM') === selectedMonth && tx.type === 'expense') {
        const method = tx.paymentMethod || 'Otros';
        methods[method] = (methods[method] || 0) + tx.amount;
      }
    });
    return Object.entries(methods).map(([name, value]) => ({ name, value }));
  }, [transactions, selectedMonth]);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter(tx => {
      const txDate = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
      return format(txDate, 'yyyy-MM') === selectedMonth;
    });

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.description.toLowerCase().includes(query) || 
        tx.category.toLowerCase().includes(query) ||
        (tx.tags || []).some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (selectedTagFilter) {
      filtered = filtered.filter(tx => (tx.tags || []).includes(selectedTagFilter));
    }

    return filtered;
  }, [transactions, selectedMonth, searchQuery, selectedTagFilter]);

  const reportTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
      const matchesPeriod = reportPeriod === 'month' 
        ? format(txDate, 'yyyy-MM') === selectedMonth
        : format(txDate, 'yyyy') === reportYear;
      
      const matchesType = tx.type === reportTransactionType;
      
      let matchesUnit = true;
      if (reportUnitFilter.length > 0) {
        if (reportType === 'category') {
          matchesUnit = reportUnitFilter.includes(tx.category);
        } else if (reportType === 'tag') {
          matchesUnit = (tx.tags || []).some(tag => reportUnitFilter.includes(tag));
        } else if (reportType === 'paymentMethod') {
          matchesUnit = reportUnitFilter.includes(tx.paymentMethod || 'Otros');
        }
      }

      return matchesPeriod && matchesType && matchesUnit;
    });
  }, [transactions, reportPeriod, selectedMonth, reportYear, reportTransactionType, reportUnitFilter, reportType]);

  const reportData = useMemo(() => {
    const data: Record<string, { amount: number, transactions: Transaction[] }> = {};
    
    reportTransactions.forEach(tx => {
      let units: string[] = [];
      if (reportType === 'category') {
        units = [tx.category];
      } else if (reportType === 'tag') {
        units = tx.tags || ['Sin etiqueta'];
      } else if (reportType === 'paymentMethod') {
        units = [tx.paymentMethod || 'Otros'];
      }

      units.forEach(unit => {
        if (!data[unit]) {
          data[unit] = { amount: 0, transactions: [] };
        }
        data[unit].amount += tx.amount;
        data[unit].transactions.push(tx);
      });
    });

    return Object.entries(data)
      .map(([name, info]) => ({ name, ...info }))
      .sort((a, b) => b.amount - a.amount);
  }, [reportTransactions, reportType]);

  const budgetProgress = useMemo(() => {
    if (!group?.budget) return null;
    const percentage = Math.min((stats.expense / group.budget) * 100, 100);
    const remaining = group.budget - stats.expense;
    return { percentage, remaining, isOver: remaining < 0 };
  }, [group?.budget, stats.expense]);

  const categoryBudgetProgress = useMemo(() => {
    if (!group?.categoryBudgets) return [];
    
    return Object.entries(group.categoryBudgets)
      .filter(([_, budget]) => budget > 0)
      .map(([category, budget]) => {
        const spent = transactions
          .filter(tx => {
            const txDate = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
            return format(txDate, 'yyyy-MM') === selectedMonth && 
                   tx.type === 'expense' && 
                   tx.category === category;
          })
          .reduce((acc, tx) => acc + tx.amount, 0);
        
        const percentage = Math.min((spent / budget) * 100, 100);
        const remaining = budget - spent;
        return { category, budget, spent, percentage, remaining, isOver: remaining < 0 };
      })
      .sort((a, b) => b.percentage - a.percentage);
  }, [group?.categoryBudgets, transactions, selectedMonth]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !profile?.groupId) return;

    const txData: any = {
      groupId: profile.groupId,
      userId: user.uid,
      userName: user.displayName || user.email,
      amount: parseFloat(amount),
      type,
      category,
      description,
      paymentMethod,
      tags,
      date: Timestamp.fromDate(fromZonedTime(date + 'T12:00:00', GUATEMALA_TZ)),
      createdAt: serverTimestamp(),
    };

    try {
      if (editingTransactionId) {
        await setDoc(doc(db, 'transactions', editingTransactionId), txData, { merge: true });
        toast.success('Transacción actualizada');
      } else {
        await addDoc(collection(db, 'transactions'), txData);
        toast.success('Transacción registrada');
      }

      if (isRecurring) {
        const recurringData: any = {
          groupId: profile.groupId,
          amount: parseFloat(amount),
          type,
          category,
          description,
          dayOfMonth: parseInt(dayOfMonth),
          paymentMethod,
          tags,
          active: true,
          endDate: endDate || null,
          createdAt: serverTimestamp(),
        };
        
        if (editingRecurringId) {
          await setDoc(doc(db, 'recurring', editingRecurringId), recurringData, { merge: true });
        } else {
          await addDoc(collection(db, 'recurring'), recurringData);
        }
      }

      // Reset form
      setIsAdding(false);
      setAmount('');
      setDescription('');
      setCategory('');
      setTags([]);
      setIsRecurring(false);
      setEditingTransactionId(null);
      setEditingRecurringId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'transactions');
    }
  };

  const handleDelete = async (id: string, isRecurringTx: boolean = false) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Transacción',
      message: '¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer.',
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, isRecurringTx ? 'recurring' : 'transactions', id));
          toast.success('Eliminado correctamente');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, isRecurringTx ? `recurring/${id}` : `transactions/${id}`);
        }
      }
    });
  };

  const handleUpdateBudget = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile?.groupId) return;

    const categoryBudgets: Record<string, number> = {};
    Object.entries(categoryBudgetsInput).forEach(([cat, val]) => {
      if (val) categoryBudgets[cat] = parseFloat(val);
    });

    try {
      await setDoc(doc(db, 'groups', profile.groupId), { 
        budget: budgetInput ? parseFloat(budgetInput) : null,
        categoryBudgets,
        categoryEmojis: categoryEmojisInput,
        customCategories: customCategoriesInput
      }, { merge: true });
      setIsBudgetModalOpen(false);
      toast.success('Presupuesto actualizado');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${profile.groupId}`);
    }
  };

  const handleGoalSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile?.groupId) return;

    const goalData = {
      groupId: profile.groupId,
      name: goalName,
      targetAmount: parseFloat(goalTarget),
      currentAmount: parseFloat(goalCurrent) || 0,
      deadline: goalDeadline || null,
      createdAt: serverTimestamp(),
    };

    try {
      if (editingGoalId) {
        await setDoc(doc(db, 'goals', editingGoalId), goalData, { merge: true });
        toast.success('Meta actualizada');
      } else {
        await addDoc(collection(db, 'goals'), goalData);
        toast.success('Meta creada');
      }
      setIsGoalModalOpen(false);
      setGoalName('');
      setGoalTarget('');
      setGoalCurrent('');
      setGoalDeadline('');
      setEditingGoalId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'goals');
    }
  };

  const handleAddAmountToGoal = async (goalId: string, amount: number, record: boolean) => {
    const goal = savingsGoals.find(g => g.id === goalId);
    if (!goal) return;

    const newAmount = goal.currentAmount + amount;

    try {
      await setDoc(doc(db, 'goals', goalId), { currentAmount: newAmount }, { merge: true });
      
      if (record && profile?.groupId && user) {
        await addDoc(collection(db, 'transactions'), {
          groupId: profile.groupId,
          userId: user.uid,
          userName: user.displayName || user.email,
          amount: amount,
          type: 'expense',
          category: 'Ahorro',
          description: `Ahorro para meta: ${goal.name}`,
          date: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      }

      setIsAddAmountModalOpen(false);
      setAmountToAddInput('');
      setSelectedGoalForAmount(null);
      toast.success('Monto añadido a la meta');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `goals/${goalId}`);
    }
  };

  const handleGroupAction = async (e: FormEvent) => {
    e.preventDefault();
    setIsGroupActionLoading(true);
    try {
      if (groupAction === 'create') {
        await createGroup(newGroupName);
        toast.success('Grupo creado correctamente');
      } else {
        await joinGroup(joinInviteCode);
        toast.success('Te has unido al grupo');
      }
      setIsGroupModalOpen(false);
      setNewGroupName('');
      setJoinInviteCode('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error en la operación');
    } finally {
      setIsGroupActionLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Usuario', 'Etiquetas'];
    const rows = filteredTransactions.map(tx => [
      format(tx.date?.toDate ? tx.date.toDate() : new Date(tx.date), 'yyyy-MM-dd'),
      tx.type === 'income' ? 'Ingreso' : 'Gasto',
      tx.category,
      tx.description,
      tx.amount,
      tx.userName,
      (tx.tags || []).join(';')
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `finanzas_${selectedMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCategoryEmoji = (cat: string) => {
    return group?.categoryEmojis?.[cat] || CATEGORY_EMOJIS[cat] || '✨';
  };

  const unitSuggestions = useMemo(() => {
    const suggestions = new Set<string>();
    if (reportType === 'category') {
      [...CATEGORIES.expense, ...CATEGORIES.income, ...(group?.customCategories || [])].forEach(c => suggestions.add(c));
    } else if (reportType === 'tag') {
      transactions.forEach(tx => (tx.tags || []).forEach(t => suggestions.add(t)));
    } else if (reportType === 'paymentMethod') {
      PAYMENT_METHODS.forEach(m => suggestions.add(m));
    }
    
    return Array.from(suggestions).filter(s => 
      s.toLowerCase().includes(unitSearchInput.toLowerCase()) && 
      !reportUnitFilter.includes(s)
    );
  }, [reportType, transactions, group, unitSearchInput, reportUnitFilter]);

  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-gray-950 pb-24 transition-colors duration-300">
      <AnimatePresence>
        {isSwitching && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-white/80 dark:bg-gray-950/80 backdrop-blur-md flex flex-col items-center justify-center"
          >
            <div className="w-16 h-16 bg-[#5A5A40] dark:bg-[#8B8B6B] rounded-2xl flex items-center justify-center text-white shadow-2xl mb-4">
              <Loader2 size={32} className="animate-spin" />
            </div>
            <p className="text-xs font-bold text-[#5A5A40] uppercase tracking-[0.3em] animate-pulse">Cambiando Presupuesto...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-[#E4E3E0] dark:border-gray-800 z-40 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#5A5A40] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#5A5A40]/20">
              <Wallet size={24} />
            </div>
            <div className="flex flex-col group-selector relative">
              <h1 className="text-lg font-bold tracking-tight leading-tight dark:text-white">BudgetBuddy</h1>
              <button 
                onClick={() => setIsGroupSelectorOpen(!isGroupSelectorOpen)}
                className="flex items-center gap-1 text-[10px] font-bold text-[#5A5A40] dark:text-[#8B8B6B] uppercase tracking-widest hover:underline transition-all"
              >
                <span>{group?.name || 'Cargando...'}</span>
                <Plus size={10} className={cn("transition-transform duration-300", isGroupSelectorOpen ? "rotate-45" : "")} />
              </button>

              <AnimatePresence>
                {isGroupSelectorOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-[#E4E3E0] dark:border-gray-800 overflow-hidden z-50"
                  >
                    <div className="p-2 border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                      <p className="px-3 py-1 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Mis Presupuestos</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-1">
                      {groups.map(g => (
                        <button
                          key={g.id}
                          onClick={() => {
                            switchGroup(g.id);
                            setIsGroupSelectorOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-bold transition-all",
                            profile?.groupId === g.id 
                              ? "bg-[#5A5A40] dark:bg-[#8B8B6B] text-white shadow-md" 
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              profile?.groupId === g.id ? "bg-white/20" : "bg-gray-100 dark:bg-gray-800"
                            )}>
                              <Users size={16} />
                            </div>
                            <span className="truncate max-w-[120px]">{g.name}</span>
                          </div>
                          {profile?.groupId === g.id && <Check size={16} />}
                        </button>
                      ))}
                    </div>
                    <div className="p-1 border-t border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                      <button 
                        onClick={() => {
                          setGroupAction('create');
                          setIsGroupModalOpen(true);
                          setIsGroupSelectorOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-bold text-[#5A5A40] dark:text-[#8B8B6B] hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-900 flex items-center justify-center border border-[#E4E3E0] dark:border-gray-800">
                          <Plus size={16} />
                        </div>
                        <span>Crear nuevo grupo</span>
                      </button>
                      <button 
                        onClick={() => {
                          setGroupAction('join');
                          setIsGroupModalOpen(true);
                          setIsGroupSelectorOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-900 flex items-center justify-center border border-[#E4E3E0] dark:border-gray-800">
                          <Plus size={16} className="rotate-45" />
                        </div>
                        <span>Unirse a un grupo</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-[#5A5A40] dark:text-[#8B8B6B] focus:ring-0 py-1"
              />
            </div>
            {isAdmin && (
              <button 
                onClick={() => setViewMode(viewMode === 'admin' ? 'personal' : 'admin')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                  viewMode === 'admin' 
                    ? "bg-[#5A5A40] text-white shadow-md" 
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                <LayoutDashboard size={14} />
                <span className="hidden xs:inline">{viewMode === 'admin' ? 'Admin' : 'Personal'}</span>
              </button>
            )}
            <button 
              onClick={() => setActiveTab('group')}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-xl transition-all",
                activeTab === 'group' ? "bg-[#5A5A40]/10 text-[#5A5A40] dark:text-[#8B8B6B]" : "bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-[#5A5A40] dark:hover:text-[#8B8B6B]"
              )}
              title="Familia"
            >
              <Users size={20} />
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-xl transition-all",
                activeTab === 'settings' ? "bg-[#5A5A40]/10 text-[#5A5A40] dark:text-[#8B8B6B]" : "bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-[#5A5A40] dark:hover:text-[#8B8B6B]"
              )}
              title="Ajustes"
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={() => setIsDarkMode(prev => !prev)}
              className="w-10 h-10 flex items-center justify-center bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-[#5A5A40] dark:hover:text-[#8B8B6B] rounded-xl transition-all"
              title={isDarkMode ? "Modo Claro" : "Modo Oscuro"}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              onClick={logout}
              className="w-10 h-10 flex items-center justify-center bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-white dark:bg-gray-900 p-5 rounded-[32px] shadow-sm border border-[#E4E3E0] dark:border-gray-800 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <Wallet size={48} />
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Balance Total</p>
                  <h2 className="text-3xl font-black tracking-tight dark:text-white">{formatCurrency(stats.balance)}</h2>
                </div>
                
                <div className="grid grid-cols-2 sm:contents gap-4">
                  <div className="bg-white dark:bg-gray-900 p-5 rounded-[32px] shadow-sm border border-[#E4E3E0] dark:border-gray-800 flex flex-col justify-between gap-2">
                    <div className="w-8 h-8 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center">
                      <Plus className="rotate-45" size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Ingresos</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(stats.income)}</p>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-900 p-5 rounded-[32px] shadow-sm border border-[#E4E3E0] dark:border-gray-800 flex flex-col justify-between gap-2">
                    <div className="w-8 h-8 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center">
                      <Plus size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Gastos</p>
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(stats.expense)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget Progress Card */}
              <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-[#E4E3E0] dark:border-gray-800">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-[#5A5A40]/10 text-[#5A5A40] dark:text-[#8B8B6B] rounded-xl flex items-center justify-center">
                      <Target size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold dark:text-white">Presupuesto Mensual</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Control de gastos del grupo</p>
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
                    {group?.budget ? 'Editar' : 'Establecer'}
                  </button>
                </div>

                {group?.budget ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-2xl font-bold dark:text-white">{formatCurrency(stats.expense)} <span className="text-sm font-normal text-gray-400">/ {formatCurrency(group.budget)}</span></p>
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
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${budgetProgress?.percentage}%` }}
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        budgetProgress?.isOver ? "bg-red-500" : "bg-[#5A5A40] dark:bg-[#8B8B6B]"
                      )}
                    />
                  </div>
                  </div>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Aún no has establecido un presupuesto para este grupo.</p>
                    <button 
                      onClick={() => {
                        setBudgetInput('');
                        const initialCategoryBudgets: Record<string, string> = {};
                        const initialCategoryEmojis: Record<string, string> = {};
                        [...CATEGORIES.expense, ...CATEGORIES.income].forEach(cat => {
                          initialCategoryBudgets[cat] = '';
                          initialCategoryEmojis[cat] = CATEGORY_EMOJIS[cat] || '';
                        });
                        setCategoryBudgetsInput(initialCategoryBudgets);
                        setCategoryEmojisInput(initialCategoryEmojis);
                        setCustomCategoriesInput([]);
                        setIsBudgetModalOpen(true);
                      }}
                      className="bg-[#5A5A40] dark:bg-[#8B8B6B] text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-[#4A4A30] transition-colors"
                    >
                      Establecer Presupuesto
                    </button>
                  </div>
                )}

                {categoryBudgetProgress.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-[#F0EFEA] dark:border-gray-800 space-y-6">
                    <h4 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Presupuesto por Categoría</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {categoryBudgetProgress.map((item) => (
                        <div key={item.category} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                              {getCategoryEmoji(item.category)} {item.category}
                            </p>
                            <p className="text-xs font-bold text-gray-400">{Math.round((item.spent / item.budget) * 100)}%</p>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
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
                <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-[#E4E3E0] dark:border-gray-800">
                  <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 dark:text-white">
                    <Plus className="rotate-45 text-gray-400" size={20} />
                    Actividad Mensual
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#374151" : "#F0F0F0"} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDarkMode ? '#6B7280' : '#999' }} />
                        <YAxis hide />
                        <Tooltip 
                          cursor={{ fill: isDarkMode ? '#1F2937' : '#F5F5F0' }}
                          contentStyle={{ 
                            borderRadius: '12px', 
                            border: 'none', 
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                            color: isDarkMode ? '#FFFFFF' : '#000000'
                          }}
                        />
                        <Bar dataKey="Ingresos" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="Gastos" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-[#E4E3E0] dark:border-gray-800">
                  <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 dark:text-white">
                    <BarChart3 size={20} className="text-gray-400" />
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
              <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-[#E4E3E0] dark:border-gray-800">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 dark:text-white">
                  <CreditCard size={20} className="text-gray-400" />
                  Cuadre por Forma de Pago
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {PAYMENT_METHODS.map(method => {
                    const amount = paymentMethodStats.find(s => s.name === method)?.value || 0;
                    return (
                      <div key={method} className="bg-[#F5F5F0] dark:bg-gray-800 p-4 rounded-2xl">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{method}</p>
                        <p className="text-lg font-black text-[#5A5A40] dark:text-[#8B8B6B]">{formatCurrency(amount)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-[#E4E3E0] dark:border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-[#E4E3E0] dark:border-gray-800 flex items-center justify-between">
                  <h3 className="text-lg font-semibold dark:text-white">Transacciones Recientes</h3>
                  <button 
                    onClick={() => setActiveTab('history')}
                    className="text-sm font-medium text-[#5A5A40] dark:text-[#8B8B6B] hover:underline"
                  >
                    Ver todo
                  </button>
                </div>
                <div className="divide-y divide-[#E4E3E0] dark:divide-gray-800">
                  {filteredTransactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-xl",
                          tx.type === 'income' ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"
                        )}>
                          {getCategoryEmoji(tx.category)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium dark:text-white">{tx.description || tx.category}</p>
                            {tx.isRecurring && (
                              <span className="bg-[#5A5A40]/10 text-[#5A5A40] dark:text-[#8B8B6B] text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-tighter flex items-center gap-0.5">
                                <Repeat size={8} /> Fijo
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
                              {format(tx.date?.toDate ? tx.date.toDate() : new Date(tx.date), 'dd MMM', { locale: es })} • {tx.userName}
                            </p>
                            {(tx.tags || []).map(tag => (
                              <span key={tag} className="text-[8px] text-[#5A5A40] dark:text-[#8B8B6B] font-bold">#{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className={cn(
                        "font-bold",
                        tx.type === 'income' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                      No hay transacciones en este mes.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <HistoryTab 
              transactions={transactions}
              filteredTransactions={filteredTransactions}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedTagFilter={selectedTagFilter}
              setSelectedTagFilter={setSelectedTagFilter}
              exportToCSV={exportToCSV}
              getCategoryEmoji={getCategoryEmoji}
              user={user}
              isAdmin={isAdmin}
              setEditingTransactionId={setEditingTransactionId}
              setAmount={setAmount}
              setType={setType}
              setCategory={setCategory}
              setDescription={setDescription}
              setTags={setTags}
              setPaymentMethod={setPaymentMethod}
              setDate={setDate}
              setIsAdding={setIsAdding}
              setIsRecurring={setIsRecurring}
              handleDelete={handleDelete}
              selectedMonth={selectedMonth}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsTab 
              reportPeriod={reportPeriod}
              setReportPeriod={setReportPeriod}
              reportType={reportType}
              setReportType={setReportType}
              reportTransactionType={reportTransactionType}
              setReportTransactionType={setReportTransactionType}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              reportYear={reportYear}
              setReportYear={setReportYear}
              reportDisplay={reportDisplay}
              setReportDisplay={setReportDisplay}
              reportUnitFilter={reportUnitFilter}
              setReportUnitFilter={setReportUnitFilter}
              unitSearchInput={unitSearchInput}
              setUnitSearchInput={setUnitSearchInput}
              isUnitDropdownOpen={isUnitDropdownOpen}
              setIsUnitDropdownOpen={setIsUnitDropdownOpen}
              unitSuggestions={unitSuggestions}
              reportTransactions={reportTransactions}
              reportData={reportData}
              getCategoryEmoji={getCategoryEmoji}
            />
          )}

          {activeTab === 'recurring' && (
            <RecurringTab 
              recurringExpenses={recurringExpenses}
              getCategoryEmoji={getCategoryEmoji}
              handleProcessRecurringManually={async (re) => {
                const currentMonth = format(new Date(), 'yyyy-MM');
                if (re.lastProcessedMonth === currentMonth) {
                  toast.error('Este gasto ya fue procesado este mes');
                  return;
                }
                
                try {
                  const txId = doc(collection(db, 'transactions')).id;
                  const txDate = new Date();
                  txDate.setDate(re.dayOfMonth);
                  
                  const newTx: Transaction = {
                    id: txId,
                    groupId: profile?.groupId || '',
                    userId: 'system',
                    userName: 'Sistema (Manual)',
                    amount: re.amount,
                    type: re.type,
                    category: re.category,
                    description: re.description,
                    paymentMethod: re.paymentMethod,
                    isRecurring: true,
                    recurringId: re.id,
                    tags: re.tags || [],
                    date: Timestamp.fromDate(txDate),
                    createdAt: serverTimestamp(),
                  };

                  await setDoc(doc(db, 'transactions', txId), newTx);
                  await setDoc(doc(db, 'recurring', re.id), { lastProcessedMonth: currentMonth }, { merge: true });
                  toast.success('Gasto procesado manualmente');
                } catch (error) {
                  handleFirestoreError(error, OperationType.WRITE, 'transactions');
                }
              }}
              setEditingRecurringId={setEditingRecurringId}
              setAmount={setAmount}
              setType={setType}
              setCategory={setCategory}
              setDescription={setDescription}
              setTags={setTags}
              setDayOfMonth={setDayOfMonth}
              setPaymentMethod={setPaymentMethod}
              setEndDate={setEndDate}
              setIsAdding={setIsAdding}
              setIsRecurring={setIsRecurring}
              handleDeleteRecurring={(id) => handleDelete(id, true)}
            />
          )}

          {activeTab === 'goals' && (
            <GoalsTab 
              savingsGoals={savingsGoals}
              setEditingGoalId={setEditingGoalId}
              setGoalName={setGoalName}
              setGoalTarget={setGoalTarget}
              setGoalCurrent={setGoalCurrent}
              setGoalDeadline={setGoalDeadline}
              setIsGoalModalOpen={setIsGoalModalOpen}
              setSelectedGoalForAmount={setSelectedGoalForAmount}
              setIsAddAmountModalOpen={setIsAddAmountModalOpen}
              handleDeleteGoal={async (id) => {
                setConfirmModal({
                  isOpen: true,
                  title: 'Eliminar Meta',
                  message: '¿Estás seguro de que deseas eliminar esta meta de ahorro?',
                  isDanger: true,
                  onConfirm: async () => {
                    try {
                      await deleteDoc(doc(db, 'goals', id));
                      toast.success('Meta eliminada');
                    } catch (error) {
                      handleFirestoreError(error, OperationType.DELETE, `goals/${id}`);
                    }
                  }
                });
              }}
            />
          )}

          {activeTab === 'group' && (
            <FamilyTab 
              group={group}
              groups={groups}
              user={user}
              memberProfiles={memberProfiles}
              setGroupAction={setGroupAction}
              setIsGroupModalOpen={setIsGroupModalOpen}
              handleRemoveMember={async (memberId) => {
                if (!group) return;
                setConfirmModal({
                  isOpen: true,
                  title: 'Eliminar Miembro',
                  message: '¿Estás seguro de que deseas eliminar a este miembro del grupo?',
                  isDanger: true,
                  onConfirm: async () => {
                    try {
                      const newMembers = group.members.filter(id => id !== memberId);
                      await setDoc(doc(db, 'groups', group.id), { members: newMembers }, { merge: true });
                      await setDoc(doc(db, 'users', memberId), { groupId: null }, { merge: true });
                      toast.success('Miembro eliminado');
                    } catch (error) {
                      handleFirestoreError(error, OperationType.UPDATE, `groups/${group.id}`);
                    }
                  }
                });
              }}
              handleDeleteGroup={async () => {
                if (!group) return;
                setConfirmModal({
                  isOpen: true,
                  title: 'Eliminar Grupo',
                  message: '¿Estás seguro de que deseas eliminar este grupo permanentemente? Se perderán todos los datos.',
                  isDanger: true,
                  onConfirm: async () => {
                    try {
                      // In a real app, we'd delete all sub-collections too
                      await deleteDoc(doc(db, 'groups', group.id));
                      toast.success('Grupo eliminado');
                      window.location.reload();
                    } catch (error) {
                      handleFirestoreError(error, OperationType.DELETE, `groups/${group.id}`);
                    }
                  }
                });
              }}
              switchGroup={switchGroup}
              profile={profile}
            />
          )}

          {activeTab === 'ai' && (
            <FinancialAssistant 
              transactions={transactions}
              savingsGoals={savingsGoals}
              group={group}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab 
              group={group}
              budgetInput={budgetInput}
              setBudgetInput={setBudgetInput}
              categoryBudgetsInput={categoryBudgetsInput}
              setCategoryBudgetsInput={setCategoryBudgetsInput}
              categoryEmojisInput={categoryEmojisInput}
              setCategoryEmojisInput={setCategoryEmojisInput}
              customCategoriesInput={customCategoriesInput}
              setCustomCategoriesInput={setCustomCategoriesInput}
              newCategoryInput={newCategoryInput}
              setNewCategoryInput={setNewCategoryInput}
              setIsBudgetModalOpen={setIsBudgetModalOpen}
              handleUpdateBudget={handleUpdateBudget}
              profile={profile}
              toggleAISharing={toggleAISharing}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Floating Action Button */}
      <button 
        onClick={() => {
          setEditingTransactionId(null);
          setEditingRecurringId(null);
          setAmount('');
          setDescription('');
          setCategory('');
          setTags([]);
          setIsRecurring(false);
          setIsAdding(true);
        }}
        className="fixed bottom-24 right-6 w-14 h-14 bg-[#5A5A40] dark:bg-[#8B8B6B] text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
      >
        <Plus size={32} />
      </button>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-[#E4E3E0] dark:border-gray-800 z-40 px-6 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                activeTab === 'dashboard' ? "text-[#5A5A40] dark:text-[#8B8B6B]" : "text-gray-400 dark:text-gray-500 hover:text-gray-600"
              )}
            >
              <LayoutDashboard size={24} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">Inicio</span>
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                activeTab === 'history' ? "text-[#5A5A40] dark:text-[#8B8B6B]" : "text-gray-400 dark:text-gray-500 hover:text-gray-600"
              )}
            >
              <History size={24} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">Historial</span>
            </button>
            <button 
              onClick={() => setActiveTab('recurring')}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                activeTab === 'recurring' ? "text-[#5A5A40] dark:text-[#8B8B6B]" : "text-gray-400 dark:text-gray-500 hover:text-gray-600"
              )}
            >
              <Repeat size={24} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">Fijos</span>
            </button>
          </div>

          <div className="w-12" /> {/* Spacer for FAB */}

          <div className="flex items-center gap-6">
            <button 
              onClick={() => setActiveTab('goals')}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                activeTab === 'goals' ? "text-[#5A5A40] dark:text-[#8B8B6B]" : "text-gray-400 dark:text-gray-500 hover:text-gray-600"
              )}
            >
              <Target size={24} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">Metas</span>
            </button>
            <button 
              onClick={() => setActiveTab('reports')}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                activeTab === 'reports' ? "text-[#5A5A40] dark:text-[#8B8B6B]" : "text-gray-400 dark:text-gray-500 hover:text-gray-600"
              )}
            >
              <BarChart3 size={24} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">Reportes</span>
            </button>
            <button 
              onClick={() => setActiveTab('ai')}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                activeTab === 'ai' ? "text-[#5A5A40] dark:text-[#8B8B6B]" : "text-gray-400 dark:text-gray-500 hover:text-gray-600"
              )}
            >
              <Sparkles size={24} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">IA</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Modals */}
      <TransactionModal 
        isOpen={isAdding}
        onClose={() => {
          setIsAdding(false);
          setEditingRecurringId(null);
          setEditingTransactionId(null);
        }}
        editingTransactionId={editingTransactionId}
        editingRecurringId={editingRecurringId}
        isRecurring={isRecurring}
        type={type}
        setType={setType}
        amount={amount}
        setAmount={setAmount}
        category={category}
        setCategory={setCategory}
        date={date}
        setDate={setDate}
        dayOfMonth={dayOfMonth}
        setDayOfMonth={setDayOfMonth}
        endDate={endDate}
        setEndDate={setEndDate}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        description={description}
        setDescription={setDescription}
        tagInput={tagInput}
        setTagInput={setTagInput}
        tags={tags}
        setTags={setTags}
        tagSuggestions={(() => {
          const suggestions = new Set<string>();
          transactions.forEach(tx => (tx.tags || []).forEach(t => suggestions.add(t)));
          return Array.from(suggestions).filter(s => 
            s.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(s)
          );
        })()}
        onSubmit={handleSubmit}
        getCategoryEmoji={getCategoryEmoji}
        group={group}
      />

      <BudgetModal 
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        budgetInput={budgetInput}
        setBudgetInput={setBudgetInput}
        categoryBudgetsInput={categoryBudgetsInput}
        setCategoryBudgetsInput={setCategoryBudgetsInput}
        categoryEmojisInput={categoryEmojisInput}
        setCategoryEmojisInput={setCategoryEmojisInput}
        customCategoriesInput={customCategoriesInput}
        setCustomCategoriesInput={setCustomCategoriesInput}
        newCategoryInput={newCategoryInput}
        setNewCategoryInput={setNewCategoryInput}
        handleUpdateBudget={handleUpdateBudget}
        downloadTemplate={() => {
          const headers = ['Categoría', 'Presupuesto Mensual', 'Emoji'];
          const rows = [...CATEGORIES.expense, ...customCategoriesInput].map(cat => [
            cat,
            group?.categoryBudgets?.[cat] || '0',
            group?.categoryEmojis?.[cat] || CATEGORY_EMOJIS[cat] || ''
          ]);
          const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = 'plantilla_presupuesto.csv';
          link.click();
        }}
        handleImportCSV={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n');
            const newBudgets: Record<string, string> = { ...categoryBudgetsInput };
            const newEmojis: Record<string, string> = { ...categoryEmojisInput };
            const newCustom: string[] = [...customCategoriesInput];

            lines.slice(1).forEach(line => {
              const [cat, budget, emoji] = line.split(',');
              if (cat) {
                const trimmedCat = cat.trim();
                newBudgets[trimmedCat] = budget?.trim() || '0';
                if (emoji) newEmojis[trimmedCat] = emoji.trim();
                if (!CATEGORIES.expense.includes(trimmedCat) && !CATEGORIES.income.includes(trimmedCat) && !newCustom.includes(trimmedCat)) {
                  newCustom.push(trimmedCat);
                }
              }
            });
            setCategoryBudgetsInput(newBudgets);
            setCategoryEmojisInput(newEmojis);
            setCustomCategoriesInput(newCustom);
            toast.success('CSV importado correctamente');
          };
          reader.readAsText(file);
        }}
      />

      <GoalModal 
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        editingGoalId={editingGoalId}
        goalName={goalName}
        setGoalName={setGoalName}
        goalTarget={goalTarget}
        setGoalTarget={setGoalTarget}
        goalCurrent={goalCurrent}
        setGoalCurrent={setGoalCurrent}
        goalDeadline={goalDeadline}
        setGoalDeadline={setGoalDeadline}
        onSubmit={handleGoalSubmit}
      />

      <GroupModal 
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        groupAction={groupAction}
        newGroupName={newGroupName}
        setNewGroupName={setNewGroupName}
        joinInviteCode={joinInviteCode}
        setJoinInviteCode={setJoinInviteCode}
        isGroupActionLoading={isGroupActionLoading}
        onSubmit={handleGroupAction}
      />

      <AddAmountModal 
        isOpen={isAddAmountModalOpen}
        onClose={() => setIsAddAmountModalOpen(false)}
        selectedGoal={selectedGoalForAmount}
        amountToAddInput={amountToAddInput}
        setAmountToAddInput={setAmountToAddInput}
        shouldRecordAsTransaction={shouldRecordAsTransaction}
        setShouldRecordAsTransaction={setShouldRecordAsTransaction}
        handleAddToGoal={handleAddAmountToGoal}
      />

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        confirmText={confirmModal.confirmText}
        type={confirmModal.isDanger ? 'danger' : 'warning'}
      />
    </div>
  );
}
