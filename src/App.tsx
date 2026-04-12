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
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  Loader2,
  Target,
  X,
  ChevronDown,
  CreditCard,
  Banknote,
  Repeat,
  CalendarDays,
  Play,
  Search,
  Moon,
  Sun,
  PiggyBank,
  Sparkles,
  Brain,
  ShieldCheck,
  ShieldAlert,
  Settings
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
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
  getDoc,
  Timestamp,
  setDoc,
  limit,
  writeBatch,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';
import { Transaction, CATEGORIES, CATEGORY_EMOJIS, TransactionType, Group, UserProfile, PaymentMethod, PAYMENT_METHODS, RecurringExpense, SavingsGoal } from './types';
import { formatCurrency, cn } from './lib/utils';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';
import { format, isLastDayOfMonth, parse, subMonths } from 'date-fns';
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
  Legend,
  PieChart as RePieChart,
  Pie
} from 'recharts';
import { toast } from 'sonner';

function FinancialAssistant({ transactions, group }: { transactions: Transaction[], group: Group | null }) {
  const { toggleAISharing, profile } = useAuth();
  const [analysis, setAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const analyzeFinances = async () => {
    if (!profile?.aiSharingEnabled) return;
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const monthsLookback = profile.aiMonthsLookback || 1;
      const cutoffDate = subMonths(new Date(), monthsLookback);

      const filteredTransactions = transactions.filter(t => {
        const tDate = t.date instanceof Timestamp ? t.date.toDate() : new Date(t.date);
        return tDate >= cutoffDate;
      });

      const recentTransactions = filteredTransactions.slice(0, 50).map(t => ({
        tipo: t.type,
        categoria: t.category,
        monto: t.amount,
        descripcion: t.description,
        etiquetas: t.tags || [],
        fecha: format(t.date instanceof Timestamp ? t.date.toDate() : new Date(t.date), 'dd/MM/yyyy')
      }));

      const prompt = `Actúa como un asesor financiero experto. Analiza los siguientes movimientos financieros de los últimos ${monthsLookback} mes(es) de un grupo/familia y proporciona:
      1. Un resumen rápido de la situación.
      2. 3 consejos específicos para ahorrar o mejorar la gestión.
      3. Una observación sobre la categoría en la que más se gasta.
      
      IMPORTANTE: La fecha actual es ${format(new Date(), 'dd/MM/yyyy')}. 
      Ten en cuenta que el mes de ${format(new Date(), 'MMMM', { locale: es })} aún está en curso (en ejecución), por lo que es normal que los gastos o ingresos parezcan bajos o incompletos para este mes. No lo trates como un mes cerrado.
      
      Responde en español, de forma amigable y motivadora. Usa formato Markdown.
      
      Movimientos:
      ${JSON.stringify(recentTransactions, null, 2)}
      
      Presupuesto mensual total: ${group?.budget || 'No definido'}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setAnalysis(response.text || 'No se pudo generar el análisis.');
    } catch (error) {
      console.error("AI Error:", error);
      toast.error('Error al conectar con la IA');
    } finally {
      setIsLoading(false);
    }
  };

  if (!profile?.aiSharingEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400 mb-6">
          <ShieldAlert size={40} />
        </div>
        <h2 className="text-2xl font-bold mb-4 dark:text-white">Privacidad de IA</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
          Para utilizar el Asistente Financiero con IA, necesitamos tu permiso para procesar tus transacciones de forma segura y privada.
        </p>
        <button 
          onClick={toggleAISharing}
          className="bg-[#5A5A40] dark:bg-[#8B8B6B] text-white px-8 py-4 rounded-2xl font-bold shadow-lg hover:bg-[#4A4A30] transition-colors flex items-center gap-2"
        >
          <ShieldCheck size={20} />
          Habilitar IA y Compartir Datos
        </button>
        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 max-w-xs">
          Tus datos solo se envían a la IA para este análisis específico y no se utilizan para entrenar modelos externos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-[#5A5A40] to-[#3A3A20] rounded-[40px] p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Sparkles size={24} />
            </div>
            <h2 className="text-2xl font-bold">Asistente Inteligente</h2>
          </div>
          <p className="text-white/80 max-w-md mb-6">
            Analizo tus patrones de gasto para darte consejos personalizados y ayudarte a alcanzar tus metas.
          </p>
          <button 
            onClick={analyzeFinances}
            disabled={isLoading}
            className="bg-white text-[#5A5A40] px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Brain size={18} />}
            {isLoading ? 'Analizando...' : 'Generar Análisis Ahora'}
          </button>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
      </div>

      {analysis && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-[40px] p-8 shadow-xl border border-[#E4E3E0] dark:border-gray-800"
        >
          <div className="prose dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
              {analysis}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function SettingsTab() {
  const { profile, toggleAISharing, updateAISettings } = useAuth();
  
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="bg-white dark:bg-gray-900 rounded-[40px] p-8 shadow-xl border border-[#E4E3E0] dark:border-gray-800">
        <h2 className="text-2xl font-bold mb-6 dark:text-white flex items-center gap-2">
          <Settings size={24} className="text-[#5A5A40] dark:text-[#8B8B6B]" />
          Configuración
        </h2>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-transparent hover:border-[#5A5A40]/30 transition-all">
            <div className="flex gap-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/20 rounded-2xl text-amber-600 dark:text-amber-400 h-fit">
                <Brain size={24} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold dark:text-white">Análisis con IA</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Permitir que la IA analice tus transacciones para darte consejos.</p>
              </div>
            </div>
            <button 
              onClick={toggleAISharing}
              className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 flex-shrink-0 ${profile?.aiSharingEnabled ? 'bg-[#5A5A40]' : 'bg-gray-300 dark:bg-gray-700'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${profile?.aiSharingEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {profile?.aiSharingEnabled && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-transparent"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-[#5A5A40] dark:text-[#8B8B6B]">
                  <CalendarDays size={20} />
                  <h3 className="font-bold">Historial de Análisis</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">¿Cuántos meses atrás quieres que la IA analice?</p>
                <div className="grid grid-cols-3 gap-3">
                  {[1, 3, 6].map((months) => (
                    <button
                      key={months}
                      onClick={() => updateAISettings(months)}
                      className={cn(
                        "py-3 rounded-2xl font-bold transition-all border-2",
                        (profile.aiMonthsLookback || 1) === months
                          ? "bg-[#5A5A40] border-[#5A5A40] text-white shadow-lg"
                          : "bg-white dark:bg-gray-900 border-[#E4E3E0] dark:border-gray-800 text-gray-500 hover:border-[#5A5A40]/30"
                      )}
                    >
                      {months} {months === 1 ? 'Mes' : 'Meses'}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
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
    link.setAttribute("download", `BudgetBuddy_Historial_Completo_${group.name}.csv`);
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
    link.setAttribute("download", "BudgetBuddy_Plantilla_Presupuesto.csv");
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

  // Real-time savings goals listener
  useEffect(() => {
    if (!profile?.groupId) return;
    const q = query(
      collection(db, 'groups', profile.groupId, 'savingsGoals'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const goalsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavingsGoal));
      setSavingsGoals(goalsList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `groups/${profile.groupId}/savingsGoals`);
    });
    return unsubscribe;
  }, [profile?.groupId]);

  const getCategoryEmoji = (cat: string) => {
    return group?.categoryEmojis?.[cat] || CATEGORY_EMOJIS[cat] || '✨';
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      const isMonthMatch = formatInTimeZone(tDate, GUATEMALA_TZ, 'yyyy-MM') === selectedMonth;
      
      const matchesTag = !selectedTagFilter || (t.tags || []).includes(selectedTagFilter);
      
      if (!searchQuery) return isMonthMatch && matchesTag;
      
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        (t.description || '').toLowerCase().includes(searchLower) ||
        (t.category || '').toLowerCase().includes(searchLower) ||
        (t.userName || '').toLowerCase().includes(searchLower) ||
        (t.tags || []).some(tag => tag.toLowerCase().includes(searchLower));
        
      return isMonthMatch && matchesSearch && matchesTag;
    });
  }, [transactions, selectedMonth, searchQuery, selectedTagFilter]);

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

  const allGroupTags = useMemo(() => {
    const tagSet = new Set<string>();
    transactions.forEach(t => (t.tags || []).forEach(tag => tagSet.add(tag)));
    recurringExpenses.forEach(re => (re.tags || []).forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [transactions, recurringExpenses]);

  const tagSuggestions = useMemo(() => {
    if (!tagInput.trim()) return [];
    const input = tagInput.toLowerCase().replace('#', '');
    return allGroupTags.filter(tag => 
      tag.toLowerCase().includes(input) && !tags.includes(tag)
    ).slice(0, 5);
  }, [tagInput, allGroupTags, tags]);

  const reportTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      const tYear = formatInTimeZone(tDate, GUATEMALA_TZ, 'yyyy');
      const tMonth = formatInTimeZone(tDate, GUATEMALA_TZ, 'yyyy-MM');
      
      const periodMatch = reportPeriod === 'month' 
        ? tMonth === selectedMonth 
        : tYear === reportYear;
        
      if (!periodMatch || t.type !== reportTransactionType) return false;

      if (reportUnitFilter.length > 0) {
        if (reportType === 'category') {
          return reportUnitFilter.includes(t.category);
        } else if (reportType === 'tag') {
          return (t.tags || []).some(tag => reportUnitFilter.includes(tag));
        } else if (reportType === 'paymentMethod') {
          return reportUnitFilter.includes(t.paymentMethod || 'Otros');
        }
      }

      return true;
    }).sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
  }, [transactions, reportPeriod, selectedMonth, reportYear, reportTransactionType, reportUnitFilter, reportType]);

  const reportData = useMemo(() => {
    if (reportType === 'category') {
      const categories: Record<string, number> = {};
      reportTransactions.forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
      });
      return Object.entries(categories).map(([name, value]) => ({ 
        name: `${getCategoryEmoji(name)} ${name}`, 
        value 
      })).sort((a, b) => b.value - a.value);
    } else if (reportType === 'tag') {
      const tags: Record<string, number> = {};
      reportTransactions.forEach(t => {
        const tTags = t.tags || [];
        if (tTags.length === 0) {
          tags['Sin etiqueta'] = (tags['Sin etiqueta'] || 0) + t.amount;
        } else {
          tTags.forEach(tag => {
            tags[tag] = (tags[tag] || 0) + t.amount;
          });
        }
      });
      return Object.entries(tags).map(([name, value]) => ({ 
        name: name === 'Sin etiqueta' ? name : `#${name}`, 
        value 
      })).sort((a, b) => b.value - a.value);
    } else {
      const methods: Record<string, number> = {};
      reportTransactions.forEach(t => {
        const method = t.paymentMethod || 'Otros';
        methods[method] = (methods[method] || 0) + t.amount;
      });
      return Object.entries(methods).map(([name, value]) => ({ 
        name, 
        value 
      })).sort((a, b) => b.value - a.value);
    }
  }, [reportTransactions, reportType, getCategoryEmoji]);

  const reportUnitOptions = useMemo(() => {
    let options: string[] = [];
    if (reportType === 'category') {
      options = reportTransactionType === 'expense' 
        ? [...CATEGORIES.expense, ...(group?.customCategories || [])] 
        : CATEGORIES.income;
    } else if (reportType === 'tag') {
      options = allGroupTags;
    } else if (reportType === 'paymentMethod') {
      options = PAYMENT_METHODS;
    }
    return options;
  }, [reportType, reportTransactionType, group?.customCategories, allGroupTags]);

  const unitSuggestions = useMemo(() => {
    const input = unitSearchInput.toLowerCase();
    const filtered = reportUnitOptions.filter(opt => 
      opt.toLowerCase().includes(input) && !reportUnitFilter.includes(opt)
    );
    
    if (isUnitDropdownOpen) return filtered;
    if (unitSearchInput.trim()) return filtered.slice(0, 5);
    return [];
  }, [unitSearchInput, reportUnitOptions, reportUnitFilter, isUnitDropdownOpen]);

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
    return Object.entries(categories).map(([name, value]) => ({ 
      name: `${getCategoryEmoji(name)} ${name}`, 
      value 
    }));
  }, [filteredTransactions]);

  const handleAddTransaction = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile?.groupId || !user) return;

    try {
      const commonData = {
        groupId: profile.groupId,
        amount: parseFloat(amount),
        type,
        category,
        description,
        tags,
        paymentMethod: type === 'expense' ? paymentMethod : null,
        date: Timestamp.fromDate(fromZonedTime(date, GUATEMALA_TZ)),
        updatedAt: serverTimestamp(),
      };

      if (editingTransactionId) {
        await setDoc(doc(db, 'groups', profile.groupId, 'transactions', editingTransactionId), commonData, { merge: true });
        toast.success('Transacción actualizada');
      } else {
        await addDoc(collection(db, 'groups', profile.groupId, 'transactions'), {
          ...commonData,
          userId: user.uid,
          userName: user.displayName || 'Usuario',
          createdAt: serverTimestamp(),
        });
        toast.success('Transacción agregada');
      }

      setIsAdding(false);
      setEditingTransactionId(null);
      setEditingRecurringId(null);
      setAmount('');
      setCategory('');
      setDescription('');
      setTags([]);
      setIsRecurring(false);
      setDate(format(new Date(), 'yyyy-MM-dd'));
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
        tags: re.tags || [],
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
        tags,
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
      setTags([]);
      setEndDate('');
    } catch (error) {
      handleFirestoreError(error, editingRecurringId ? OperationType.UPDATE : OperationType.WRITE, `groups/${profile.groupId}/recurringExpenses`);
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    if (!profile?.groupId) return;
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Gasto Fijo',
      message: '¿Estás seguro de que deseas eliminar este gasto fijo? Ya no se generarán transacciones automáticas.',
      isDanger: true,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'groups', profile.groupId, 'recurringExpenses', id));
          toast.success('Gasto fijo eliminado');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `groups/${profile.groupId}/recurringExpenses/${id}`);
        }
      }
    });
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
        categoryEmojis: categoryEmojisInput,
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
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Transacción',
      message: '¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer.',
      isDanger: true,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'groups', profile.groupId, 'transactions', id));
          toast.success('Transacción eliminada');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `groups/${profile.groupId}/transactions/${id}`);
        }
      }
    });
  };

  const handleAddToGoal = async (goalId: string, amountToAdd: number, recordTransaction: boolean) => {
    if (!profile?.groupId || !user || isNaN(amountToAdd) || amountToAdd <= 0) return;
    
    try {
      const goalRef = doc(db, 'groups', profile.groupId, 'savingsGoals', goalId);
      const goalSnap = await getDoc(goalRef);
      if (!goalSnap.exists()) return;
      
      const goalData = goalSnap.data() as SavingsGoal;
      const newAmount = goalData.currentAmount + amountToAdd;
      
      const batch = writeBatch(db);
      
      // Update goal amount
      batch.set(goalRef, { currentAmount: newAmount }, { merge: true });
      
      if (recordTransaction) {
        const txRef = doc(collection(db, 'groups', profile.groupId, 'transactions'));
        batch.set(txRef, {
          groupId: profile.groupId,
          userId: user.uid,
          userName: user.displayName || 'Usuario',
          amount: amountToAdd,
          type: 'expense',
          category: 'Ahorro',
          description: `Ahorro para meta: ${goalData.name}`,
          paymentMethod: 'Otros',
          date: serverTimestamp(),
          createdAt: serverTimestamp()
        });
      }
      
      await batch.commit();
      toast.success(`Se agregaron ${formatCurrency(amountToAdd)} a la meta${recordTransaction ? ' y al historial' : ''}`);
      setIsAddAmountModalOpen(false);
      setAmountToAddInput('');
      setSelectedGoalForAmount(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${profile.groupId}/savingsGoals/${goalId}`);
    }
  };

  const handleSaveGoal = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile?.groupId || !goalName || !goalTarget) return;

    const goalData: Partial<SavingsGoal> = {
      name: goalName,
      targetAmount: parseFloat(goalTarget),
      currentAmount: parseFloat(goalCurrent) || 0,
      deadline: goalDeadline || undefined,
      groupId: profile.groupId,
      createdAt: serverTimestamp()
    };

    try {
      if (editingGoalId) {
        await setDoc(doc(db, 'groups', profile.groupId, 'savingsGoals', editingGoalId), goalData, { merge: true });
        toast.success('Meta actualizada');
      } else {
        await addDoc(collection(db, 'groups', profile.groupId, 'savingsGoals'), goalData);
        toast.success('Meta creada');
      }
      setIsGoalModalOpen(false);
      setEditingGoalId(null);
      setGoalName('');
      setGoalTarget('');
      setGoalCurrent('');
      setGoalDeadline('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `groups/${profile.groupId}/savingsGoals`);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!profile?.groupId) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Meta',
      message: '¿Estás seguro de que deseas eliminar esta meta de ahorro?',
      isDanger: true,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'groups', profile.groupId, 'savingsGoals', goalId));
          toast.success('Meta eliminada');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `groups/${profile.groupId}/savingsGoals/${goalId}`);
        }
      }
    });
  };

  const handleDeleteGroup = async () => {
    if (!group || !profile || group.ownerId !== user?.uid) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Grupo',
      message: `¿Estás seguro de que deseas eliminar el grupo "${group.name}"? Se eliminarán todos los datos permanentemente.`,
      isDanger: true,
      confirmText: 'Eliminar Grupo',
      onConfirm: async () => {
        try {
          // 1. Delete all transactions
          const txsSnapshot = await getDocs(collection(db, 'groups', group.id, 'transactions'));
          const batch = writeBatch(db);
          txsSnapshot.forEach(d => batch.delete(d.ref));
          
          // 2. Delete all recurring expenses
          const recSnapshot = await getDocs(collection(db, 'groups', group.id, 'recurringExpenses'));
          recSnapshot.forEach(d => batch.delete(d.ref));
          
          // 3. Delete the group itself
          batch.delete(doc(db, 'groups', group.id));
          
          await batch.commit();

          // 4. Update all members' profiles
          for (const memberId of group.members) {
            const memberDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', memberId)));
            if (!memberDoc.empty) {
              const mData = memberDoc.docs[0].data() as UserProfile;
              const newGroupIds = (mData.groupIds || []).filter(id => id !== group.id);
              const nextGroupId = newGroupIds.length > 0 ? newGroupIds[0] : '';
              
              await setDoc(memberDoc.docs[0].ref, {
                groupId: nextGroupId,
                groupIds: newGroupIds
              }, { merge: true });
            }
          }

          toast.success('Grupo eliminado correctamente');
          setActiveTab('dashboard');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `groups/${group.id}`);
        }
      }
    });
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!group || group.ownerId !== user?.uid) return;
    if (memberId === user.uid) {
      toast.error('No puedes eliminarte a ti mismo. Elimina el grupo si deseas salir.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Miembro',
      message: '¿Estás seguro de que deseas eliminar a este miembro del grupo?',
      isDanger: true,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          const newMembers = group.members.filter(id => id !== memberId);
          await setDoc(doc(db, 'groups', group.id), { members: newMembers }, { merge: true });
          
          // Update member's profile
          const memberDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', memberId)));
          if (!memberDoc.empty) {
            const mData = memberDoc.docs[0].data() as UserProfile;
            const newGroupIds = (mData.groupIds || []).filter(id => id !== group.id);
            const nextGroupId = mData.groupId === group.id ? (newGroupIds.length > 0 ? newGroupIds[0] : '') : mData.groupId;
            
            await setDoc(memberDoc.docs[0].ref, {
              groupId: nextGroupId,
              groupIds: newGroupIds
            }, { merge: true });
          }

          toast.success('Miembro eliminado del grupo');
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `groups/${group.id}`);
        }
      }
    });
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
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-gray-950 text-[#1A1A1A] dark:text-gray-100 font-sans relative transition-colors duration-300">
      {/* Switching Overlay */}
      <AnimatePresence>
        {isSwitching && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white/40 backdrop-blur-md flex flex-col items-center justify-center"
          >
            <div className="w-16 h-16 bg-[#5A5A40] rounded-2xl flex items-center justify-center text-white shadow-2xl mb-4">
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
                          <ArrowDownRight size={16} />
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

      <main className={cn(
        "max-w-5xl mx-auto px-4 pt-6 pb-32 transition-all duration-500",
        isSwitching ? "blur-xl scale-[0.98] opacity-50" : "blur-0 scale-100 opacity-100"
      )}>
        <div className="sm:hidden mb-6">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Mes Seleccionado</label>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full bg-white dark:bg-gray-900 border border-[#E4E3E0] dark:border-gray-800 rounded-2xl py-3 px-4 text-sm font-bold text-[#5A5A40] dark:text-[#8B8B6B] focus:ring-2 focus:ring-[#5A5A40]"
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
                <div className="bg-white dark:bg-gray-900 p-5 rounded-[32px] shadow-sm border border-[#E4E3E0] dark:border-gray-800 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <Wallet size={48} />
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Balance Total</p>
                  <h2 className="text-3xl font-black tracking-tight">{formatCurrency(stats.balance)}</h2>
                </div>
                
                <div className="grid grid-cols-2 sm:contents gap-4">
                  <div className="bg-white dark:bg-gray-900 p-5 rounded-[32px] shadow-sm border border-[#E4E3E0] dark:border-gray-800 flex flex-col justify-between gap-2">
                    <div className="w-8 h-8 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center">
                      <TrendingUp size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Ingresos</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(stats.income)}</p>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-900 p-5 rounded-[32px] shadow-sm border border-[#E4E3E0] dark:border-gray-800 flex flex-col justify-between gap-2">
                    <div className="w-8 h-8 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center">
                      <TrendingDown size={18} />
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
                      <h3 className="font-bold">Presupuesto Mensual</h3>
                      <p className="text-xs text-gray-500">Control de gastos del grupo</p>
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
                    <p className="text-sm text-gray-500 mb-4">Aún no has establecido un presupuesto para este grupo.</p>
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
                  <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <TrendingUp size={20} className="text-gray-400" />
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
              <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-[#E4E3E0] dark:border-gray-800">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
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
                            <p className="font-medium">{tx.description || tx.category}</p>
                            {tx.isRecurring && (
                              <span className="bg-[#5A5A40]/10 text-[#5A5A40] text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-tighter flex items-center gap-0.5">
                                <Repeat size={8} /> Fijo
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            <p className="text-[10px] text-gray-500">
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
              <div className="flex flex-col gap-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold">Historial del Mes</h2>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:w-64">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text"
                        placeholder="Buscar descripción o etiqueta..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-[#E4E3E0] dark:border-gray-800 rounded-xl text-sm focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all dark:text-white"
                      />
                    </div>
                    <button 
                      onClick={exportToCSV}
                      className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-[#E4E3E0] dark:border-gray-800 rounded-xl text-xs font-bold text-[#5A5A40] dark:text-[#8B8B6B] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
                            !selectedTagFilter ? "bg-[#5A5A40] text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
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
                              selectedTagFilter === tag ? "bg-[#5A5A40] text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
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
                            <div key={tag} className="flex-shrink-0 bg-white dark:bg-gray-900 px-4 py-3 rounded-2xl border border-[#E4E3E0] dark:border-gray-800 shadow-sm">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">#{tag}</p>
                              <p className="text-sm font-black text-[#5A5A40] dark:text-[#8B8B6B]">{formatCurrency(amount)}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-[#E4E3E0] dark:border-gray-800 overflow-hidden">
                <div className="divide-y divide-[#E4E3E0] dark:divide-gray-800">
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
                            <p className="font-medium text-sm sm:text-base truncate">{tx.description || tx.category}</p>
                            <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center gap-1">
                              {getCategoryEmoji(tx.category)} {tx.category}
                            </span>
                            {tx.isRecurring && (
                              <span className="bg-[#5A5A40]/10 text-[#5A5A40] text-[7px] sm:text-[8px] font-black uppercase px-1 py-0.5 rounded tracking-tighter flex-shrink-0 flex items-center gap-0.5">
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
                              {(tx.tags || []).map(tag => (
                                <span key={tag} className="text-[8px] sm:text-[9px] text-[#5A5A40] dark:text-[#8B8B6B] font-bold">#{tag}</span>
                              ))}
                            </div>
                          </div>
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
                          {(tx.userId === user?.uid || isAdmin) && (
                            <button 
                              onClick={() => {
                                setEditingTransactionId(tx.id);
                                setAmount(tx.amount.toString());
                                setType(tx.type);
                                setCategory(tx.category);
                                setDescription(tx.description || '');
                                setTags(tx.tags || []);
                                setPaymentMethod(tx.paymentMethod || 'Efectivo');
                                setDate(formatInTimeZone(tx.date?.toDate ? tx.date.toDate() : new Date(tx.date), GUATEMALA_TZ, 'yyyy-MM-dd'));
                                setIsAdding(true);
                                setIsRecurring(false);
                              }}
                              className="p-1.5 sm:p-2 text-gray-300 hover:text-[#5A5A40]"
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
          )}

          {activeTab === 'group' && (
            <motion.div 
              key="group"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-[#E4E3E0] dark:border-gray-800">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold dark:text-white">{group?.name}</h2>
                    <p className="text-gray-500 dark:text-gray-400">Gestiona los miembros de tu familia o grupo.</p>
                  </div>
                  <div className="bg-[#5A5A40]/10 dark:bg-[#8B8B6B]/10 text-[#5A5A40] dark:text-[#8B8B6B] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {group?.ownerId === user?.uid ? 'Propietario' : 'Miembro'}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                  <div className="w-full sm:w-auto flex items-center gap-3 p-4 bg-[#F5F5F0] dark:bg-gray-800 rounded-2xl border border-[#E4E3E0] dark:border-gray-700">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40] dark:text-[#8B8B6B]">Código de Invitación</p>
                      <p className="text-xl font-mono font-bold dark:text-white">{group?.inviteCode}</p>
                    </div>
                    <button 
                      onClick={() => {
                        const shareUrl = `${window.location.origin}${window.location.pathname}?join=${group?.inviteCode}`;
                        const message = `¡Hola! Únete a mi grupo "${group?.name}" en Finanza para gestionar nuestros gastos juntos.\n\nCódigo: ${group?.inviteCode}\n\nÚnete aquí: ${shareUrl}`;
                        navigator.clipboard.writeText(message);
                        toast.success('Invitación copiada');
                      }}
                      className="ml-auto p-2 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-[#E4E3E0] dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors dark:text-white"
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
                      className="flex-1 sm:flex-none bg-[#5A5A40] dark:bg-[#8B8B6B] text-white px-4 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-[#4A4A30] dark:hover:bg-[#7A7A5B] transition-colors"
                    >
                      Nuevo Grupo
                    </button>
                    <button 
                      onClick={() => {
                        setGroupAction('join');
                        setIsGroupModalOpen(true);
                      }}
                      className="flex-1 sm:flex-none bg-white dark:bg-gray-900 text-[#5A5A40] dark:text-[#8B8B6B] border border-[#E4E3E0] dark:border-gray-800 px-4 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Unirse a Grupo
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold mb-4 dark:text-white">Miembros ({group?.members.length})</h3>
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
                            className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-gray-800"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold">
                            {displayName.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate dark:text-white">
                            {memberId === user?.uid ? `${displayName} (Tú)` : displayName}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{memberId === group.ownerId ? 'Propietario' : 'Colaborador'}</p>
                        </div>
                        {group.ownerId === user?.uid && memberId !== user?.uid && (
                          <button 
                            onClick={() => handleRemoveMember(memberId)}
                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                            title="Eliminar miembro"
                          >
                            <User size={18} className="text-red-400" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {group?.ownerId === user?.uid && (
                  <div className="mt-12 pt-8 border-t border-red-50 dark:border-red-900/20">
                    <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-4">Zona de Peligro</h4>
                    <button 
                      onClick={handleDeleteGroup}
                      className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <Trash2 size={20} />
                      Eliminar este Grupo Permanentemente
                    </button>
                  </div>
                )}
              </div>

              {groups.length > 1 && (
                <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-[#E4E3E0] dark:border-gray-800">
                  <h3 className="text-lg font-bold mb-4 dark:text-white">Mis Otros Presupuestos</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {groups.filter(g => g.id !== profile?.groupId).map(g => (
                      <button
                        key={g.id}
                        onClick={() => switchGroup(g.id)}
                        className="flex items-center justify-between p-4 rounded-2xl border border-[#E4E3E0] dark:border-gray-800 hover:border-[#5A5A40] dark:hover:border-[#8B8B6B] hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-[#5A5A40] dark:text-[#8B8B6B]">
                            <Users size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-sm dark:text-white">{g.name}</p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                              {g.ownerId === user?.uid ? 'Propietario' : 'Miembro'}
                            </p>
                          </div>
                        </div>
                        <ArrowUpRight size={16} className="text-gray-300 dark:text-gray-600" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
          {activeTab === 'goals' && (
            <motion.div 
              key="goals"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Metas de Ahorro</h2>
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
                  className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md"
                >
                  Nueva Meta
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {savingsGoals.map((goal) => {
                  const progress = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
                  return (
                    <div key={goal.id} className="bg-white dark:bg-gray-900 p-6 rounded-[32px] shadow-sm border border-[#E4E3E0] dark:border-gray-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                            <PiggyBank size={24} />
                          </div>
                          <div>
                            <h3 className="font-bold">{goal.name}</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                              {goal.deadline ? `Meta: ${goal.deadline}` : 'Sin fecha límite'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedGoalForAmount(goal);
                              setAmountToAddInput('');
                              setShouldRecordAsTransaction(true);
                              setIsAddAmountModalOpen(true);
                            }}
                            className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-colors z-10"
                            title="Agregar ahorro"
                          >
                            <PlusCircle size={20} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              setEditingGoalId(goal.id);
                              setGoalName(goal.name);
                              setGoalTarget(goal.targetAmount.toString());
                              setGoalCurrent(goal.currentAmount.toString());
                              setGoalDeadline(goal.deadline || '');
                              setIsGoalModalOpen(true);
                            }}
                            className="p-2 text-gray-300 hover:text-[#5A5A40]"
                          >
                            <Pencil size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="p-2 text-gray-300 hover:text-red-500"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <p className="text-lg font-black text-[#5A5A40]">
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
                  <div key={re.id} className="bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-[32px] shadow-sm border border-[#E4E3E0] dark:border-gray-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#F5F5F0] dark:bg-gray-800 rounded-2xl flex-shrink-0 flex items-center justify-center text-lg sm:text-xl">
                        {getCategoryEmoji(re.category)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold truncate">{re.description || re.category}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">
                            Día {re.dayOfMonth} • {re.paymentMethod}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {(re.tags || []).map(tag => (
                              <span key={tag} className="text-[8px] text-[#5A5A40] dark:text-[#8B8B6B] font-bold">#{tag}</span>
                            ))}
                          </div>
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
                            setTags(re.tags || []);
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
          {activeTab === 'reports' && (
            <motion.div 
              key="reports"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">Reportes</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Análisis detallado de tus finanzas</p>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    <button 
                      onClick={() => setReportPeriod('month')}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                        reportPeriod === 'month' ? "bg-white dark:bg-gray-700 shadow-sm text-[#5A5A40] dark:text-[#8B8B6B]" : "text-gray-500"
                      )}
                    >
                      Mensual
                    </button>
                    <button 
                      onClick={() => setReportPeriod('year')}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                        reportPeriod === 'year' ? "bg-white dark:bg-gray-700 shadow-sm text-[#5A5A40] dark:text-[#8B8B6B]" : "text-gray-500"
                      )}
                    >
                      Anual
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-[#E4E3E0] dark:border-gray-800 shadow-sm">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tipo de Reporte</label>
                    <select 
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value as any)}
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-[#5A5A40] dark:text-white"
                    >
                      <option value="category">Por Categoría</option>
                      <option value="tag">Por Etiqueta</option>
                      <option value="paymentMethod">Por Forma de Pago</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Transacciones</label>
                    <select 
                      value={reportTransactionType}
                      onChange={(e) => setReportTransactionType(e.target.value as any)}
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-[#5A5A40] dark:text-white"
                    >
                      <option value="expense">Gastos</option>
                      <option value="income">Ingresos</option>
                    </select>
                  </div>

                  {reportPeriod === 'month' ? (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mes</label>
                      <input 
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-[#5A5A40] dark:text-white"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Año</label>
                      <select 
                        value={reportYear}
                        onChange={(e) => setReportYear(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-[#5A5A40] dark:text-white"
                      >
                        {Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString()).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Vista</label>
                    <div className="flex bg-gray-50 dark:bg-gray-800 p-1 rounded-xl">
                      <button 
                        onClick={() => setReportDisplay('grouped')}
                        className={cn(
                          "flex-1 py-1 rounded-lg text-[10px] font-bold transition-all",
                          reportDisplay === 'grouped' ? "bg-white dark:bg-gray-700 shadow-sm text-[#5A5A40] dark:text-[#8B8B6B]" : "text-gray-500"
                        )}
                      >
                        Agrupado
                      </button>
                      <button 
                        onClick={() => setReportDisplay('detailed')}
                        className={cn(
                          "flex-1 py-1 rounded-lg text-[10px] font-bold transition-all",
                          reportDisplay === 'detailed' ? "bg-white dark:bg-gray-700 shadow-sm text-[#5A5A40] dark:text-[#8B8B6B]" : "text-gray-500"
                        )}
                      >
                        Detallado
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Filtrar {reportType === 'category' ? 'Categorías' : reportType === 'tag' ? 'Etiquetas' : 'Pagos'}
                    </label>
                    <div className="relative">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {reportUnitFilter.map(unit => (
                          <button 
                            key={unit} 
                            onClick={() => setReportUnitFilter(prev => prev.filter(u => u !== unit))}
                            className="bg-[#5A5A40]/10 text-[#5A5A40] dark:text-[#8B8B6B] px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors group"
                          >
                            {reportType === 'tag' ? `#${unit}` : unit}
                            <X size={10} className="group-hover:scale-110 transition-transform" />
                          </button>
                        ))}
                        {reportUnitFilter.length === 0 && (
                          <span className="text-[10px] text-gray-400 font-medium italic">Todos seleccionados</span>
                        )}
                      </div>
                      <div className="relative flex gap-2">
                        <div className="relative flex-1">
                          <input 
                            type="text" 
                            value={unitSearchInput}
                            onChange={(e) => {
                              setUnitSearchInput(e.target.value);
                              if (!isUnitDropdownOpen) setIsUnitDropdownOpen(true);
                            }}
                            onFocus={() => setIsUnitDropdownOpen(true)}
                            placeholder={`Buscar ${reportType === 'category' ? 'categoría' : reportType === 'tag' ? 'etiqueta' : 'pago'}...`}
                            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2 pl-3 pr-10 text-sm focus:ring-2 focus:ring-[#5A5A40] dark:text-white"
                          />
                          <button 
                            type="button"
                            onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#5A5A40] transition-colors"
                          >
                            <ChevronDown size={16} className={cn("transition-transform", isUnitDropdownOpen && "rotate-180")} />
                          </button>
                        </div>
                        {reportUnitFilter.length > 0 && (
                          <button 
                            onClick={() => setReportUnitFilter([])}
                            className="text-[10px] font-bold text-red-500 hover:underline"
                          >
                            Limpiar
                          </button>
                        )}
                      </div>

                      {/* Unit Suggestions */}
                      {isUnitDropdownOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setIsUnitDropdownOpen(false)}
                          />
                          <div className="absolute z-50 top-full mt-1 left-0 w-full bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-[#E4E3E0] dark:border-gray-800 overflow-hidden max-h-60 overflow-y-auto scrollbar-hide">
                            {unitSuggestions.length > 0 ? (
                              unitSuggestions.map(suggestion => (
                                <button
                                  key={suggestion}
                                  type="button"
                                  onClick={() => {
                                    setReportUnitFilter(prev => [...prev, suggestion]);
                                    setUnitSearchInput('');
                                    // Keep open if user wants to select more? 
                                    // Usually select one and close is standard for dropdowns, 
                                    // but multi-select might want to stay open.
                                    // Let's close it to be safe or keep it open for multi-select.
                                    // User said "dropdown autocomplete", I'll keep it open for multi-select convenience.
                                  }}
                                  className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors dark:text-white"
                                >
                                  {reportType === 'tag' ? `#${suggestion}` : suggestion}
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-xs text-gray-400 italic text-center">
                                No hay más opciones disponibles
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-[#E4E3E0] dark:border-gray-800 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total {reportTransactionType === 'expense' ? 'Gastado' : 'Ingresado'}</p>
                    <p className={cn(
                      "text-2xl font-black",
                      reportTransactionType === 'expense' ? "text-red-600" : "text-green-600"
                    )}>
                      {formatCurrency(reportTransactions.reduce((acc, t) => acc + t.amount, 0))}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-[#E4E3E0] dark:border-gray-800 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Transacciones</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">
                      {reportTransactions.length}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-[#E4E3E0] dark:border-gray-800 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Promedio por Tx</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">
                      {formatCurrency(reportTransactions.length > 0 ? reportTransactions.reduce((acc, t) => acc + t.amount, 0) / reportTransactions.length : 0)}
                    </p>
                  </div>
                </div>

                {reportDisplay === 'grouped' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-[#E4E3E0] dark:border-gray-800 shadow-sm">
                      <h3 className="text-lg font-bold mb-6">Distribución por {reportType === 'category' ? 'Categoría' : reportType === 'tag' ? 'Etiqueta' : 'Forma de Pago'}</h3>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <RePieChart>
                            <Pie
                              data={reportData}
                              innerRadius={80}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {reportData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={['#5A5A40', '#8B8B6B', '#A8A88F', '#C4C4B3', '#E1E1D7'][index % 5]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              formatter={(value: number) => formatCurrency(value)}
                            />
                            <Legend />
                          </RePieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-[#E4E3E0] dark:border-gray-800 shadow-sm">
                      <h3 className="text-lg font-bold mb-6">Ranking por {reportType === 'category' ? 'Categoría' : reportType === 'tag' ? 'Etiqueta' : 'Forma de Pago'}</h3>
                      <div className="space-y-4 max-h-80 overflow-y-auto pr-2 scrollbar-hide">
                        {reportData.map((item, index) => (
                          <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 flex items-center justify-center bg-white dark:bg-gray-900 rounded-full text-[10px] font-black text-[#5A5A40] dark:text-[#8B8B6B] shadow-sm">
                                {index + 1}
                              </span>
                              <p className="text-sm font-bold">{item.name}</p>
                            </div>
                            <p className="text-sm font-black text-[#5A5A40] dark:text-[#8B8B6B]">{formatCurrency(item.value)}</p>
                          </div>
                        ))}
                        {reportData.length === 0 && (
                          <div className="py-12 text-center">
                            <p className="text-gray-400 text-sm">No hay datos para este periodo</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-900 rounded-3xl border border-[#E4E3E0] dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="divide-y divide-[#E4E3E0] dark:divide-gray-800">
                      {reportTransactions.map(tx => (
                        <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center text-xl",
                              tx.type === 'income' ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"
                            )}>
                              {getCategoryEmoji(tx.category)}
                            </div>
                            <div>
                              <p className="font-bold text-sm">{tx.description || tx.category}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[10px] text-gray-400">
                                  {format(tx.date?.toDate ? tx.date.toDate() : new Date(tx.date), 'dd MMM yyyy', { locale: es })}
                                </p>
                                <div className="flex gap-1">
                                  {(tx.tags || []).map(tag => (
                                    <span key={tag} className="text-[8px] font-bold text-[#5A5A40] dark:text-[#8B8B6B]">#{tag}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                          <p className={cn(
                            "font-black text-sm",
                            tx.type === 'income' ? "text-green-600" : "text-red-600"
                          )}>
                            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </p>
                        </div>
                      ))}
                      {reportTransactions.length === 0 && (
                        <div className="py-20 text-center">
                          <BarChart3 size={48} className="mx-auto text-gray-200 mb-4" />
                          <p className="text-gray-400 font-medium">No hay transacciones para este periodo</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
          {activeTab === 'ai' && (
            <motion.div 
              key="ai"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <FinancialAssistant transactions={transactions} group={group} />
            </motion.div>
          )}
          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <SettingsTab />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-[#E4E3E0] dark:border-gray-800 px-6 py-3 pb-8 z-30">
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
              activeTab === 'history' ? "text-[#5A5A40] dark:text-[#8B8B6B] scale-110" : "text-gray-400"
            )}
          >
            <div className={cn(
              "p-1 rounded-xl transition-colors",
              activeTab === 'history' ? "bg-[#5A5A40]/10 dark:bg-[#8B8B6B]/10" : ""
            )}>
              <History size={22} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">Historial</span>
          </button>

          <button 
            onClick={() => setActiveTab('recurring')}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-all duration-300",
              activeTab === 'recurring' ? "text-[#5A5A40] dark:text-[#8B8B6B] scale-110" : "text-gray-400"
            )}
          >
            <div className={cn(
              "p-1 rounded-xl transition-colors",
              activeTab === 'recurring' ? "bg-[#5A5A40]/10 dark:bg-[#8B8B6B]/10" : ""
            )}>
              <Repeat size={22} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">Fijos</span>
          </button>
          
          {/* Floating Action Button */}
          <div className="relative -top-8">
            <button 
              onClick={() => {
                setIsRecurring(false);
                setIsAdding(true);
              }}
              className="w-16 h-16 bg-[#5A5A40] dark:bg-[#8B8B6B] text-white rounded-[24px] flex items-center justify-center shadow-2xl shadow-[#5A5A40]/40 dark:shadow-black/40 border-4 border-white dark:border-gray-900 hover:scale-110 active:scale-95 transition-all"
            >
              <Plus size={32} strokeWidth={3} />
            </button>
          </div>

          <button 
            onClick={() => setActiveTab('goals')}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-all duration-300",
              activeTab === 'goals' ? "text-[#5A5A40] dark:text-[#8B8B6B] scale-110" : "text-gray-400"
            )}
          >
            <div className={cn(
              "p-1 rounded-xl transition-colors",
              activeTab === 'goals' ? "bg-[#5A5A40]/10 dark:bg-[#8B8B6B]/10" : ""
            )}>
              <Target size={22} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">Metas</span>
          </button>

          <button 
            onClick={() => setActiveTab('reports')}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-all duration-300",
              activeTab === 'reports' ? "text-[#5A5A40] dark:text-[#8B8B6B] scale-110" : "text-gray-400"
            )}
          >
            <div className={cn(
              "p-1 rounded-xl transition-colors",
              activeTab === 'reports' ? "bg-[#5A5A40]/10 dark:bg-[#8B8B6B]/10" : ""
            )}>
              <BarChart3 size={22} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">Reportes</span>
          </button>

          <button 
            onClick={() => setActiveTab('ai')}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-all duration-300",
              activeTab === 'ai' ? "text-[#5A5A40] dark:text-[#8B8B6B] scale-110" : "text-gray-400"
            )}
          >
            <div className={cn(
              "p-1 rounded-xl transition-colors",
              activeTab === 'ai' ? "bg-[#5A5A40]/10 dark:bg-[#8B8B6B]/10" : ""
            )}>
              <Sparkles size={22} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">IA</span>
          </button>
        </div>
      </nav>

      {/* Add Amount to Goal Modal */}
      <AnimatePresence>
        {isAddAmountModalOpen && selectedGoalForAmount && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold dark:text-white">Agregar Ahorro</h3>
                  <button onClick={() => setIsAddAmountModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Meta: <span className="font-bold text-gray-900 dark:text-white">{selectedGoalForAmount.name}</span></p>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Monto a agregar</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Q</span>
                      <input 
                        type="number"
                        value={amountToAddInput}
                        onChange={(e) => setAmountToAddInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-xl font-black focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all dark:text-white"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-xl text-amber-600 dark:text-amber-400">
                          <History size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold dark:text-white">¿Registrar en historial?</p>
                          <p className="text-[10px] text-gray-500">Afectará tu presupuesto mensual disponible.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShouldRecordAsTransaction(!shouldRecordAsTransaction)}
                        className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${shouldRecordAsTransaction ? 'bg-[#5A5A40]' : 'bg-gray-300 dark:bg-gray-700'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${shouldRecordAsTransaction ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => setIsAddAmountModalOpen(false)}
                      className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                    >
                      No
                    </button>
                    <button 
                      onClick={() => handleAddToGoal(selectedGoalForAmount.id, parseFloat(amountToAddInput), shouldRecordAsTransaction)}
                      disabled={!amountToAddInput || parseFloat(amountToAddInput) <= 0}
                      className="flex-1 py-4 bg-[#5A5A40] text-white rounded-2xl font-bold shadow-lg hover:bg-[#4A4A30] transition-colors disabled:opacity-50"
                    >
                      Sí, Agregar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Goal Modal */}
      <AnimatePresence>
        {isGoalModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black tracking-tight dark:text-white">
                    {editingGoalId ? 'Editar Meta' : 'Nueva Meta de Ahorro'}
                  </h2>
                  <button onClick={() => setIsGoalModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors dark:text-gray-400">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSaveGoal} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Nombre de la Meta</label>
                    <input 
                      type="text" 
                      required
                      value={goalName}
                      onChange={(e) => setGoalName(e.target.value)}
                      placeholder="Ej: Viaje a la playa"
                      className="w-full bg-[#F5F5F0] dark:bg-gray-800 border-none rounded-2xl py-4 px-6 font-bold text-[#5A5A40] dark:text-[#8B8B6B] focus:ring-2 focus:ring-[#5A5A40] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Monto Objetivo</label>
                      <input 
                        type="number" 
                        required
                        step="0.01"
                        value={goalTarget}
                        onChange={(e) => setGoalTarget(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#F5F5F0] dark:bg-gray-800 border-none rounded-2xl py-4 px-6 font-bold text-[#5A5A40] dark:text-[#8B8B6B] focus:ring-2 focus:ring-[#5A5A40] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Monto Actual</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={goalCurrent}
                        onChange={(e) => setGoalCurrent(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#F5F5F0] dark:bg-gray-800 border-none rounded-2xl py-4 px-6 font-bold text-[#5A5A40] dark:text-[#8B8B6B] focus:ring-2 focus:ring-[#5A5A40] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Fecha Límite (Opcional)</label>
                    <input 
                      type="date" 
                      value={goalDeadline}
                      onChange={(e) => setGoalDeadline(e.target.value)}
                      className="w-full bg-[#F5F5F0] dark:bg-gray-800 border-none rounded-2xl py-4 px-6 font-bold text-[#5A5A40] dark:text-[#8B8B6B] focus:ring-2 focus:ring-[#5A5A40] outline-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-[#5A5A40] dark:bg-[#8B8B6B] text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-[#5A5A40]/20 hover:bg-[#4A4A30] active:scale-[0.98] transition-all"
                  >
                    {editingGoalId ? 'Guardar Cambios' : 'Crear Meta'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6",
                  confirmModal.isDanger ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                )}>
                  {confirmModal.isDanger ? <Trash2 size={32} /> : <X size={32} />}
                </div>
                <h3 className="text-xl font-bold mb-2 dark:text-white">{confirmModal.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">{confirmModal.message}</p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      confirmModal.onConfirm();
                      setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    }}
                    className={cn(
                      "w-full py-4 rounded-2xl font-bold transition-all shadow-lg",
                      confirmModal.isDanger ? "bg-red-600 text-white hover:bg-red-700" : "bg-[#5A5A40] dark:bg-[#8B8B6B] text-white hover:bg-[#4A4A30]"
                    )}
                  >
                    {confirmModal.confirmText || 'Confirmar'}
                  </button>
                  <button 
                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                    className="w-full py-4 rounded-2xl font-bold text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Group Action Modal */}
      <AnimatePresence>
        {isGroupModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold dark:text-white">
                    {groupAction === 'create' ? 'Crear Nuevo Grupo' : 'Unirse a un Grupo'}
                  </h2>
                  <button onClick={() => setIsGroupModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors dark:text-gray-400">
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
                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-[#5A5A40] dark:text-white"
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
                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-[#5A5A40] dark:text-white"
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
              className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-[40px] sm:rounded-[40px] shadow-2xl border border-[#E4E3E0] dark:border-gray-800 overflow-hidden"
            >
              <div className="p-8 max-h-[85vh] overflow-y-auto pb-12">
                <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-6 sm:hidden" />
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight dark:text-white">Presupuesto</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Configuración mensual</p>
                  </div>
                  <button onClick={() => setIsBudgetModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full text-gray-400 hover:text-gray-600">
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
                        className="w-full pl-8 pr-4 py-4 bg-[#F5F5F0] dark:bg-gray-800 rounded-2xl border-none focus:ring-2 focus:ring-[#5A5A40] font-bold text-lg dark:text-white"
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
                        className="flex-1 bg-[#F5F5F0] dark:bg-gray-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#5A5A40] dark:text-white"
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
                      {[...CATEGORIES.expense, ...CATEGORIES.income, ...customCategoriesInput].map(cat => (
                        <div key={cat} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="block text-[10px] font-bold text-gray-500">{cat}</label>
                            <input 
                              type="text"
                              maxLength={2}
                              value={categoryEmojisInput[cat] || ''}
                              onChange={(e) => setCategoryEmojisInput(prev => ({ ...prev, [cat]: e.target.value }))}
                              placeholder="Emoji"
                              className="w-10 h-8 text-center bg-gray-50 dark:bg-gray-800 rounded-lg border-none focus:ring-2 focus:ring-[#5A5A40] text-sm"
                            />
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Q</span>
                            <input 
                              type="number" 
                              value={categoryBudgetsInput[cat] || ''}
                              onChange={(e) => setCategoryBudgetsInput(prev => ({ ...prev, [cat]: e.target.value }))}
                              placeholder="0.00"
                              className="w-full pl-6 pr-3 py-2 bg-[#F5F5F0] dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-[#5A5A40] text-sm font-bold dark:text-white"
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
              className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] p-6 sm:p-8 relative shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-bold dark:text-white">
                  {editingRecurringId ? 'Editar Fijo' : editingTransactionId ? 'Editar Transacción' : isRecurring ? 'Nuevo Fijo' : 'Nueva Transacción'}
                </h2>
                <button 
                  onClick={() => {
                    setIsAdding(false);
                    setEditingRecurringId(null);
                    setEditingTransactionId(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors dark:text-gray-400"
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
                  <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setType('expense')}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
                        type === 'expense' ? "bg-white dark:bg-gray-700 shadow-sm text-red-600 dark:text-red-400" : "text-gray-500"
                      )}
                    >
                      Gasto
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('income')}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
                        type === 'income' ? "bg-white dark:bg-gray-700 shadow-sm text-green-600 dark:text-green-400" : "text-gray-500"
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
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-4 pl-10 pr-4 text-2xl font-bold focus:ring-2 focus:ring-[#5A5A40] placeholder:text-gray-400 dark:text-white"
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
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-4 px-4 focus:ring-2 focus:ring-[#5A5A40] dark:text-white"
                    >
                      <option value="" className="dark:bg-gray-900">Seleccionar</option>
                      {(type === 'expense' ? [...CATEGORIES.expense, ...(group?.customCategories || [])] : CATEGORIES.income).map(cat => (
                        <option key={cat} value={cat} className="dark:bg-gray-900">
                          {getCategoryEmoji(cat)} {cat}
                        </option>
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
                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-4 px-4 focus:ring-2 focus:ring-[#5A5A40] dark:text-white"
                      />
                    </div>
                  ) : (isRecurring || editingRecurringId) ? (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Día del Mes</label>
                      <select 
                        required
                        value={dayOfMonth}
                        onChange={(e) => setDayOfMonth(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-4 px-4 focus:ring-2 focus:ring-[#5A5A40] dark:text-white"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day} className="dark:bg-gray-900">{day}</option>
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
                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-4 px-4 focus:ring-2 focus:ring-[#5A5A40] dark:text-white"
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
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-4 px-4 focus:ring-2 focus:ring-[#5A5A40] dark:text-white"
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
                              ? "bg-[#5A5A40] dark:bg-[#8B8B6B] text-white border-[#5A5A40] dark:border-[#8B8B6B] shadow-md" 
                              : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-[#5A5A40] dark:hover:border-[#8B8B6B]"
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
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-4 px-4 focus:ring-2 focus:ring-[#5A5A40] dark:text-white"
                    placeholder={isRecurring ? "Ej. Pago de Hipoteca" : "Ej. Almuerzo en el trabajo"}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Etiquetas (Opcional)</label>
                  <div className="relative">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (tagInput.trim() && !tags.includes(tagInput.trim())) {
                              setTags([...tags, tagInput.trim()]);
                              setTagInput('');
                            }
                          }
                        }}
                        className="flex-1 bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-[#5A5A40] dark:text-white"
                        placeholder="Ej. #restaurante, #dominguito"
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          if (tagInput.trim() && !tags.includes(tagInput.trim())) {
                            setTags([...tags, tagInput.trim()]);
                            setTagInput('');
                          }
                        }}
                        className="bg-[#5A5A40] text-white px-4 rounded-xl text-xs font-bold"
                      >
                        Añadir
                      </button>
                    </div>

                    {/* Tag Suggestions */}
                    {tagSuggestions.length > 0 && (
                      <div className="absolute z-50 bottom-full mb-2 left-0 w-full bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-[#E4E3E0] dark:border-gray-800 overflow-hidden">
                        <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                          <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Sugerencias</p>
                        </div>
                        <div className="max-h-32 overflow-y-auto">
                          {tagSuggestions.map(suggestion => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => {
                                setTags([...tags, suggestion]);
                                setTagInput('');
                              }}
                              className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors dark:text-white"
                            >
                              #{suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <button 
                        key={tag} 
                        type="button"
                        onClick={() => setTags(tags.filter(t => t !== tag))}
                        className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors group"
                      >
                        #{tag}
                        <X size={10} className="group-hover:scale-110 transition-transform" />
                      </button>
                    ))}
                  </div>
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
  const { signIn, createGroup, joinGroup, profile, loading, user, isDarkMode, setIsDarkMode } = useAuth();
  const [step, setStep] = useState<'login' | 'choice' | 'create' | 'join'>('login');
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    if (user && !profile && !loading && step === 'login') {
      setStep('choice');
    }
  }, [user, profile, loading, step]);

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
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-black flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-6 right-6">
        <button 
          onClick={() => setIsDarkMode(prev => !prev)}
          className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-[#5A5A40] dark:hover:text-[#8B8B6B] rounded-xl shadow-sm border border-[#E4E3E0] dark:border-gray-800 transition-all"
          title={isDarkMode ? "Modo Claro" : "Modo Oscuro"}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 p-8 rounded-[40px] shadow-xl border border-[#E4E3E0] dark:border-gray-800 text-center"
      >
        <div className="w-16 h-16 bg-[#5A5A40] dark:bg-[#8B8B6B] rounded-2xl flex items-center justify-center text-white mx-auto mb-6">
          <Wallet size={32} />
        </div>
        
        <AnimatePresence mode="wait">
          {step === 'login' && (
            <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h1 className="text-3xl font-bold mb-2 dark:text-white">Bienvenido a Finanza</h1>
              <p className="text-gray-500 dark:text-gray-400 mb-8">Toma el control de tu presupuesto personal y familiar de forma sencilla.</p>
              <button 
                disabled={isActionLoading}
                onClick={async () => {
                  setIsActionLoading(true);
                  try {
                    await signIn();
                    // The signIn function in AuthContext updates the user state.
                    // If the user already has a profile, the AppContent will handle the redirect.
                    // We only set step to 'choice' if we are sure they need to create/join.
                  } catch (error) {
                    toast.error('Error al iniciar sesión');
                  } finally {
                    setIsActionLoading(false);
                  }
                }}
                className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-800 border border-[#E4E3E0] dark:border-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:text-white"
              >
                {isActionLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#5A5A40] dark:text-[#8B8B6B]" />
                ) : (
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                )}
                {isActionLoading ? 'Iniciando sesión...' : 'Continuar con Google'}
              </button>
            </motion.div>
          )}

          {step === 'choice' && (
            <motion.div key="choice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold mb-2 dark:text-white">Casi listo</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">¿Cómo quieres empezar a gestionar tu presupuesto?</p>
              <div className="space-y-4">
                <button 
                  onClick={() => setStep('create')}
                  className="w-full bg-[#5A5A40] dark:bg-[#8B8B6B] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#4A4A30] transition-colors"
                >
                  Crear nuevo grupo
                </button>
                <button 
                  onClick={() => setStep('join')}
                  className="w-full bg-white dark:bg-gray-800 border border-[#E4E3E0] dark:border-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white"
                >
                  Unirse a un grupo existente
                </button>
              </div>
            </motion.div>
          )}

          {step === 'create' && (
            <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold mb-2 dark:text-white">Crear Grupo</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">Dale un nombre a tu presupuesto familiar o personal.</p>
              <form onSubmit={handleCreate} className="space-y-4">
                <input 
                  type="text" 
                  required
                  disabled={isActionLoading}
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ej. Familia Pérez o Mi Presupuesto"
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-[#5A5A40] disabled:opacity-50 dark:text-white"
                />
                <button 
                  type="submit"
                  disabled={isActionLoading}
                  className="w-full bg-[#5A5A40] dark:bg-[#8B8B6B] text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
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
              <h2 className="text-2xl font-bold mb-2 dark:text-white">Unirse a Grupo</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">Ingresa el código que te compartieron.</p>
              <form onSubmit={handleJoin} className="space-y-4">
                <input 
                  type="text" 
                  required
                  disabled={isActionLoading}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="CÓDIGO"
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-4 px-6 text-center text-2xl font-mono font-bold focus:ring-2 focus:ring-[#5A5A40] disabled:opacity-50 dark:text-white"
                />
                <button 
                  type="submit"
                  disabled={isActionLoading}
                  className="w-full bg-[#5A5A40] dark:bg-[#8B8B6B] text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
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
  const { logout, isDarkMode, setIsDarkMode } = useAuth();
  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-black flex flex-col items-center justify-center p-4 text-center relative transition-colors duration-300">
      <div className="absolute top-6 right-6">
        <button 
          onClick={() => setIsDarkMode(prev => !prev)}
          className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-[#5A5A40] dark:hover:text-[#8B8B6B] rounded-xl shadow-sm border border-[#E4E3E0] dark:border-gray-800 transition-all"
          title={isDarkMode ? "Modo Claro" : "Modo Oscuro"}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 p-10 rounded-[40px] shadow-xl border border-[#E4E3E0] dark:border-gray-800"
      >
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-3xl flex items-center justify-center text-red-600 dark:text-red-400 mx-auto mb-8">
          <X size={40} />
        </div>
        <h1 className="text-3xl font-bold mb-4 dark:text-white">Cuenta Bloqueada</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Lo sentimos, tu acceso a Finanza ha sido restringido por incumplimiento de nuestras normas de uso.</p>
        
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl text-red-800 dark:text-red-400 text-sm font-medium">
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
  const { logout, setViewMode, isDarkMode, setIsDarkMode } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    
    setConfirmModal({
      isOpen: true,
      title: newStatus === 'blocked' ? 'Bloquear Usuario' : 'Desbloquear Usuario',
      message: `¿Estás seguro de que deseas ${newStatus === 'blocked' ? 'bloquear' : 'desbloquear'} a este usuario?`,
      isDanger: newStatus === 'blocked',
      confirmText: newStatus === 'blocked' ? 'Bloquear' : 'Desbloquear',
      onConfirm: async () => {
        try {
          await setDoc(doc(db, 'users', userId), { status: newStatus }, { merge: true });
          toast.success(`Usuario ${newStatus === 'blocked' ? 'bloqueado' : 'desbloqueado'} correctamente`);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
        }
      }
    });
  };

  if (loading) return null;

  const pendingGroups = groups.filter(g => g.status === 'pending');
  const activeGroups = groups.filter(g => g.status === 'active');

  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-gray-950 p-6 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#5A5A40] dark:text-[#8B8B6B]">Panel de Administración</h1>
            <p className="text-gray-500 dark:text-gray-400">Gestión global de Finanza</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setViewMode('personal')}
              className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-[#E4E3E0] dark:border-gray-800 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors dark:text-white"
            >
              <LayoutDashboard size={18} />
              <span>Vista Personal</span>
            </button>
            <button 
              onClick={() => setIsDarkMode(prev => !prev)}
              className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-[#5A5A40] dark:hover:text-[#8B8B6B] rounded-xl shadow-sm border border-[#E4E3E0] dark:border-gray-800 transition-all"
              title={isDarkMode ? "Modo Claro" : "Modo Oscuro"}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={logout} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
              <LogOut size={20} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-[#E4E3E0] dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Total Usuarios</p>
            <p className="text-3xl font-bold dark:text-white">{users.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-[#E4E3E0] dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Grupos Activos</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{activeGroups.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-[#E4E3E0] dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Pendientes</p>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{pendingGroups.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-[40px] shadow-xl border border-[#E4E3E0] dark:border-gray-800 overflow-hidden">
          <div className="p-8 border-b border-[#F0EFEA] dark:border-gray-800">
            <h2 className="text-xl font-bold dark:text-white">Solicitudes de Autorización</h2>
          </div>
          <div className="divide-y divide-[#F0EFEA] dark:divide-gray-800">
            {pendingGroups.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                No hay solicitudes pendientes
              </div>
            ) : (
              pendingGroups.map(g => {
                const owner = users.find(u => u.uid === g.ownerId);
                return (
                  <div key={g.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors gap-4">
                    <div className="min-w-0">
                      <h3 className="font-bold text-lg truncate dark:text-white">{g.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">Solicitado por: {owner?.displayName || owner?.email || 'Desconocido'}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">ID: {g.id}</p>
                    </div>
                    <button 
                      onClick={() => authorizeGroup(g.id)}
                      className="bg-[#5A5A40] dark:bg-[#8B8B6B] text-white px-4 sm:px-6 py-2 rounded-xl font-bold hover:bg-[#4A4A30] transition-colors flex-shrink-0 text-sm"
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
          <div className="bg-white dark:bg-gray-900 rounded-[40px] shadow-xl border border-[#E4E3E0] dark:border-gray-800 overflow-hidden">
            <div className="p-8 border-b border-[#F0EFEA] dark:border-gray-800">
              <h2 className="text-xl font-bold dark:text-white">Gestión de Usuarios</h2>
            </div>
            <div className="divide-y divide-[#F0EFEA] dark:divide-gray-800">
              {users.map(u => (
                <div key={u.uid} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    {u.photoURL ? (
                      <img src={u.photoURL} alt={u.displayName || ''} className="w-10 h-10 rounded-full flex-shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex-shrink-0 flex items-center justify-center text-gray-400 dark:text-gray-500">
                        <User size={20} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-bold truncate dark:text-white">{u.displayName || 'Usuario'}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <span className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase whitespace-nowrap ${u.status === 'blocked' ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'}`}>
                      {u.status === 'blocked' ? 'Bloqueado' : 'Activo'}
                    </span>
                    {u.email !== 'kevinboteo@gmail.com' && (
                      <button 
                        onClick={() => toggleUserStatus(u.uid, u.status || 'active')}
                        className={`p-2 rounded-xl transition-colors flex-shrink-0 ${u.status === 'blocked' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'}`}
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

          <div className="bg-white dark:bg-gray-900 rounded-[40px] shadow-xl border border-[#E4E3E0] dark:border-gray-800 overflow-hidden">
            <div className="p-8 border-b border-[#F0EFEA] dark:border-gray-800">
              <h2 className="text-xl font-bold dark:text-white">Registro de Notificaciones</h2>
            </div>
            <div className="divide-y divide-[#F0EFEA] dark:divide-gray-800">
              {notifications.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  Sin notificaciones recientes
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] sm:text-xs font-bold uppercase text-[#5A5A40] dark:text-[#8B8B6B] bg-[#F0EFEA] dark:bg-gray-800 px-2 py-0.5 rounded whitespace-nowrap">
                        {n.type === 'group_join' ? 'Unión a Grupo' : 'Notificación'}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {n.createdAt?.toDate ? format(n.createdAt.toDate(), 'HH:mm') : ''}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 break-words">{n.message}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 truncate">Enviado a: {n.to}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6",
                  confirmModal.isDanger ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                )}>
                  {confirmModal.isDanger ? <Trash2 size={32} /> : <X size={32} />}
                </div>
                <h3 className="text-xl font-bold mb-2 dark:text-white">{confirmModal.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">{confirmModal.message}</p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      confirmModal.onConfirm();
                      setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    }}
                    className={cn(
                      "w-full py-4 rounded-2xl font-bold transition-all shadow-lg",
                      confirmModal.isDanger ? "bg-red-600 text-white hover:bg-red-700" : "bg-[#5A5A40] dark:bg-[#8B8B6B] text-white hover:bg-[#4A4A30]"
                    )}
                  >
                    {confirmModal.confirmText || 'Confirmar'}
                  </button>
                  <button 
                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                    className="w-full py-4 rounded-2xl font-bold text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PendingAuthorization() {
  const { logout, group, isDarkMode, setIsDarkMode } = useAuth();
  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-black flex flex-col items-center justify-center p-4 text-center transition-colors duration-300 relative">
      <div className="absolute top-6 right-6">
        <button 
          onClick={() => setIsDarkMode(prev => !prev)}
          className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-[#5A5A40] dark:hover:text-[#8B8B6B] rounded-xl shadow-sm border border-[#E4E3E0] dark:border-gray-800 transition-all"
          title={isDarkMode ? "Modo Claro" : "Modo Oscuro"}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 p-10 rounded-[40px] shadow-xl border border-[#E4E3E0] dark:border-gray-800"
      >
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/20 rounded-3xl flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-8">
          <Loader2 size={40} className="animate-spin" />
        </div>
        <h1 className="text-3xl font-bold mb-4 dark:text-white">Esperando Autorización</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-2">Tu grupo <span className="font-bold text-[#5A5A40] dark:text-[#8B8B6B]">"{group?.name}"</span> ha sido creado con éxito.</p>
        <p className="text-gray-500 dark:text-gray-400 mb-8">El administrador debe autorizar tu solicitud antes de que puedas comenzar a registrar transacciones. Se te notificará automáticamente.</p>
        
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl text-amber-800 dark:text-amber-400 text-sm font-medium">
            Estado: Pendiente de revisión
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 font-medium transition-colors"
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
  const { user, profile, group, isAdmin, viewMode, loading, isDarkMode, setIsDarkMode } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] dark:bg-gray-950 flex flex-col items-center justify-center p-4 transition-colors duration-300">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <div className="w-20 h-20 bg-[#5A5A40] dark:bg-[#8B8B6B] rounded-[24px] flex items-center justify-center text-white shadow-2xl shadow-[#5A5A40]/30 dark:shadow-black/30 mb-6">
            <Wallet size={40} />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-[#1A1A1A] dark:text-white mb-1">BudgetBuddy</h1>
          <div className="flex items-center gap-2">
            <Loader2 size={14} className="animate-spin text-[#5A5A40] dark:text-[#8B8B6B]" />
            <p className="text-[10px] font-bold text-[#5A5A40] dark:text-[#8B8B6B] uppercase tracking-[0.2em]">Cargando...</p>
          </div>
        </motion.div>
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
