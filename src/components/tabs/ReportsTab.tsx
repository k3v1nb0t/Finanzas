import { X, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';
import { 
  PieChart as RePieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Transaction } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';

const GUATEMALA_TZ = 'America/Guatemala';

interface ReportsTabProps {
  reportPeriod: 'month' | 'year';
  setReportPeriod: (period: 'month' | 'year') => void;
  reportType: 'category' | 'tag' | 'paymentMethod';
  setReportType: (type: 'category' | 'tag' | 'paymentMethod') => void;
  reportTransactionType: 'expense' | 'income';
  setReportTransactionType: (type: 'expense' | 'income') => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  reportYear: string;
  setReportYear: (year: string) => void;
  reportDisplay: 'grouped' | 'detailed';
  setReportDisplay: (display: 'grouped' | 'detailed') => void;
  reportUnitFilter: string[];
  setReportUnitFilter: (filter: string[] | ((prev: string[]) => string[])) => void;
  unitSearchInput: string;
  setUnitSearchInput: (input: string) => void;
  isUnitDropdownOpen: boolean;
  setIsUnitDropdownOpen: (open: boolean) => void;
  unitSuggestions: string[];
  reportTransactions: Transaction[];
  reportData: any[];
  getCategoryEmoji: (cat: string) => string;
}

export function ReportsTab({
  reportPeriod,
  setReportPeriod,
  reportType,
  setReportType,
  reportTransactionType,
  setReportTransactionType,
  selectedMonth,
  setSelectedMonth,
  reportYear,
  setReportYear,
  reportDisplay,
  setReportDisplay,
  reportUnitFilter,
  setReportUnitFilter,
  unitSearchInput,
  setUnitSearchInput,
  isUnitDropdownOpen,
  setIsUnitDropdownOpen,
  unitSuggestions,
  reportTransactions,
  reportData,
  getCategoryEmoji
}: ReportsTabProps) {
  return (
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
            <h2 className="text-2xl font-bold dark:text-white">Reportes</h2>
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
                            setReportUnitFilter(prev => prev.includes(suggestion) ? prev : [...prev, suggestion]);
                            setUnitSearchInput('');
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
              <h3 className="text-lg font-bold mb-6 dark:text-white">Distribución por {reportType === 'category' ? 'Categoría' : reportType === 'tag' ? 'Etiqueta' : 'Forma de Pago'}</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={reportData.map(d => ({ name: d.name, value: d.amount }))}
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
              <h3 className="text-lg font-bold mb-6 dark:text-white">Ranking por {reportType === 'category' ? 'Categoría' : reportType === 'tag' ? 'Etiqueta' : 'Forma de Pago'}</h3>
              <div className="space-y-4 max-h-80 overflow-y-auto pr-2 scrollbar-hide">
                {reportData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center bg-white dark:bg-gray-900 rounded-full text-[10px] font-black text-[#5A5A40] dark:text-[#8B8B6B] shadow-sm">
                        {index + 1}
                      </span>
                      <p className="text-sm font-bold dark:text-white">{item.name}</p>
                    </div>
                    <p className="text-sm font-black text-[#5A5A40] dark:text-[#8B8B6B]">{formatCurrency(item.amount)}</p>
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
                      <p className="font-bold text-sm dark:text-white">{tx.description || tx.category}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-gray-400">
                          {formatInTimeZone(tx.date?.toDate ? tx.date.toDate() : new Date(tx.date), GUATEMALA_TZ, 'dd MMM yyyy', { locale: es })}
                        </p>
                        <div className="flex gap-1">
                          {Array.from(new Set(tx.tags || [])).map(tag => (
                            <span key={tag} className="text-[8px] font-bold text-[#5A5A40] dark:text-[#8B8B6B]">#{tag}</span>
                          ))}
                        </div>
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
              {reportTransactions.length === 0 && (
                <div className="p-12 text-center text-gray-400">
                  No hay transacciones para el periodo seleccionado.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
