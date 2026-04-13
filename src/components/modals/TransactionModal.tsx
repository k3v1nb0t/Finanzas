import React, { useState } from 'react';
import { X, Banknote, CreditCard, ArrowUpRight, PlusCircle, Repeat } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORIES, PAYMENT_METHODS } from '../../types';
import { cn } from '../../lib/utils';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTransactionId: string | null;
  editingRecurringId: string | null;
  isRecurring: boolean;
  setIsRecurring: (val: boolean) => void;
  type: 'expense' | 'income';
  setType: (type: 'expense' | 'income') => void;
  amount: string;
  setAmount: (amount: string) => void;
  category: string;
  setCategory: (cat: string) => void;
  date: string;
  setDate: (date: string) => void;
  dayOfMonth: string;
  setDayOfMonth: (day: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  paymentMethod: any;
  setPaymentMethod: (method: any) => void;
  description: string;
  setDescription: (desc: string) => void;
  tagInput: string;
  setTagInput: (input: string) => void;
  tags: string[];
  setTags: (tags: string[]) => void;
  tagSuggestions: string[];
  onSubmit: (e: React.FormEvent) => void;
  getCategoryEmoji: (cat: string) => string;
  group: any;
}

export function TransactionModal({
  isOpen,
  onClose,
  editingTransactionId,
  editingRecurringId,
  isRecurring,
  setIsRecurring,
  type,
  setType,
  amount,
  setAmount,
  category,
  setCategory,
  date,
  setDate,
  dayOfMonth,
  setDayOfMonth,
  endDate,
  setEndDate,
  paymentMethod,
  setPaymentMethod,
  description,
  setDescription,
  tagInput,
  setTagInput,
  tags,
  setTags,
  tagSuggestions,
  onSubmit,
  getCategoryEmoji,
  group
}: TransactionModalProps) {
  const [isTagInputFocused, setIsTagInputFocused] = useState(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
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
            className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] p-6 sm:p-8 relative shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-bold dark:text-white">
                {editingRecurringId ? 'Editar Fijo' : editingTransactionId ? 'Editar Transacción' : isRecurring ? 'Nuevo Fijo' : 'Nueva Transacción'}
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors dark:text-gray-400"
              >
                <X size={24} />
              </button>
            </div>
            <form 
              onSubmit={onSubmit} 
              className="space-y-5"
            >
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

              {!editingTransactionId && !editingRecurringId && (
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                      isRecurring ? "bg-[#5A5A40] text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                    )}>
                      <Repeat size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold dark:text-white">Gasto Fijo</p>
                      <p className="text-[10px] text-gray-500">Se repetirá mensualmente</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRecurring(!isRecurring)}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-colors duration-200",
                      isRecurring ? "bg-[#5A5A40]" : "bg-gray-200 dark:bg-gray-700"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200",
                      isRecurring ? "left-7" : "left-1"
                    )} />
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
                    {Array.from(new Set(type === 'expense' ? [...CATEGORIES.expense, ...(group?.customCategories || [])] : CATEGORIES.income)).map(cat => (
                      <option key={cat} value={cat} className="dark:bg-gray-900">
                        {getCategoryEmoji(cat)} {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    {isRecurring || editingRecurringId ? 'Primer Cobro' : 'Fecha'}
                  </label>
                  <input 
                    type="date" 
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-4 px-4 focus:ring-2 focus:ring-[#5A5A40] dark:text-white"
                  />
                </div>
              </div>

              {(isRecurring || editingRecurringId) && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Día de Cobro Mensual</label>
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
                  <p className="text-[10px] text-gray-400 px-2">Día en que se generará automáticamente el gasto cada mes.</p>
                </div>
              )}

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
                      onFocus={() => setIsTagInputFocused(true)}
                      onBlur={() => {
                        // Small delay to allow clicking suggestions
                        setTimeout(() => setIsTagInputFocused(false), 200);
                      }}
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
                  {tagSuggestions.length > 0 && (isTagInputFocused || tagInput.length > 0) && (
                    <div className="absolute z-50 top-full mt-1 left-0 w-full bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-[#E4E3E0] dark:border-gray-800 overflow-hidden">
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
  );
}
