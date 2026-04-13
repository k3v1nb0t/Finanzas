import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { GoogleGenAI } from "@google/genai";
import { motion } from 'motion/react';
import { 
  Sparkles, 
  Brain, 
  ShieldAlert, 
  Settings,
  Loader2
} from 'lucide-react';
import { Transaction, Group, SavingsGoal } from '../types';
import { Timestamp } from 'firebase/firestore';
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import Markdown from 'react-markdown';

export function FinancialAssistant({ 
  transactions, 
  group,
  savingsGoals 
}: { 
  transactions: Transaction[], 
  group: Group | null,
  savingsGoals: SavingsGoal[]
}) {
  const { toggleAISharing, profile } = useAuth();
  const [analysis, setAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const analyzeFinances = async () => {
    if (!profile?.aiSharingEnabled) return;
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
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
          className="flex items-center gap-2 bg-[#5A5A40] dark:bg-[#8B8B6B] text-white px-8 py-4 rounded-2xl font-bold hover:bg-[#4A4A30] transition-all shadow-lg"
        >
          <Sparkles size={20} />
          Habilitar Asistente IA
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-[#5A5A40] to-[#4A4A30] dark:from-[#8B8B6B] dark:to-[#6B6B4B] p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Brain size={120} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
              <Sparkles size={24} />
            </div>
            <h2 className="text-2xl font-bold">Asistente Financiero IA</h2>
          </div>
          <p className="text-white/80 max-w-xl mb-8 leading-relaxed">
            Analizo tus patrones de gasto y te brindo consejos personalizados para mejorar tu salud financiera.
          </p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={analyzeFinances}
              disabled={isLoading}
              className="flex items-center gap-2 bg-white text-[#5A5A40] px-8 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-lg disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />}
              {isLoading ? 'Analizando...' : 'Generar Análisis'}
            </button>
            <button 
              onClick={toggleAISharing}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-md text-white px-6 py-4 rounded-2xl font-bold hover:bg-white/20 transition-all border border-white/20"
            >
              <Settings size={20} />
              Configurar
            </button>
          </div>
        </div>
      </div>

      {analysis && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 p-8 rounded-[40px] shadow-xl border border-[#E4E3E0] dark:border-gray-800"
        >
          <div className="prose dark:prose-invert max-w-none">
            <Markdown>{analysis}</Markdown>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Play({ size }: { size: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}
