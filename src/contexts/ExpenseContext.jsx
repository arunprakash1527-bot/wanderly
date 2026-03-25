import React, { createContext, useContext, useState } from "react";
import { supabase } from "../supabaseClient";
import { getCatInfo } from "../constants/expenses";
import { useAuth } from "./AuthContext";
import { useNavigation } from "./NavigationContext";
import { useTrip } from "./TripContext";

const ExpenseContext = createContext(null);

export function ExpenseProvider({ children }) {
  const { user } = useAuth();
  const { showToast } = useNavigation();
  const { logActivity } = useTrip();
  // ─── Expense Tracking State ───
  const [expenses, setExpenses] = useState([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('food');
  const [expensePaidBy, setExpensePaidBy] = useState('');
  const [expenseSplitMethod, setExpenseSplitMethod] = useState('equal');
  const [expenseParticipants, setExpenseParticipants] = useState([]);
  const [expenseCustomSplits, setExpenseCustomSplits] = useState({});
  const [showSettlement, setShowSettlement] = useState(false);
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);

  // ─── Expense Functions ───
  const loadExpenses = async (tripDbId) => {
    if (!tripDbId) return;
    try {
      const { data } = await supabase.from('expenses').select('*, expense_splits(*)').eq('trip_id', tripDbId).order('created_at', { ascending: false });
      setExpenses((data || []).map(e => ({ ...e, splits: e.expense_splits || [] })));
    } catch (e) { setExpenses([]); }
  };

  const resetExpenseForm = () => {
    setExpenseDesc(''); setExpenseAmount(''); setExpenseCategory('food');
    setExpensePaidBy(''); setExpenseSplitMethod('equal'); setExpenseParticipants([]);
    setExpenseCustomSplits({}); setShowAddExpense(false); setEditingExpense(null);
    setExpenseDate(new Date().toISOString().split('T')[0]);
  };

  const saveExpense = async (trip, { selectedCreatedTrip, createdTrips } = {}) => {
    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) { showToast("Enter an amount", "error"); return; }
    if (!expenseDesc.trim()) { showToast("Add a description", "error"); return; }
    if (!expensePaidBy) { showToast("Select who paid", "error"); return; }
    if (expenseParticipants.length === 0) { showToast("Select who to split with", "error"); return; }
    const tripDbId = trip.dbId || trip.id;
    let splits;
    const selected = expenseParticipants;
    if (expenseSplitMethod === 'equal') {
      const share = Math.round((amount / selected.length) * 100) / 100;
      splits = selected.map((name, i) => ({
        participant_name: name,
        share_amount: i === selected.length - 1 ? Math.round((amount - share * (selected.length - 1)) * 100) / 100 : share,
      }));
    } else if (expenseSplitMethod === 'percentage') {
      const totalPct = selected.reduce((s, n) => s + (parseFloat(expenseCustomSplits[n]) || 0), 0);
      if (Math.abs(totalPct - 100) > 0.5) { showToast("Percentages must add up to 100%", "error"); return; }
      splits = selected.map(name => ({
        participant_name: name,
        share_amount: Math.round(amount * (parseFloat(expenseCustomSplits[name]) || 0) / 100 * 100) / 100,
        share_percentage: parseFloat(expenseCustomSplits[name]) || 0,
      }));
    } else {
      const totalCustom = selected.reduce((s, n) => s + (parseFloat(expenseCustomSplits[n]) || 0), 0);
      if (Math.abs(totalCustom - amount) > 0.01) { showToast(`Custom amounts must add up to \u00A3${amount.toFixed(2)}`, "error"); return; }
      splits = selected.map(name => ({
        participant_name: name,
        share_amount: parseFloat(expenseCustomSplits[name]) || 0,
      }));
    }
    if (editingExpense) {
      const updatedExpense = { ...editingExpense, description: expenseDesc.trim(), amount, category: expenseCategory, paid_by: expensePaidBy, split_method: expenseSplitMethod, expense_date: expenseDate, updated_at: new Date().toISOString(), splits };
      setExpenses(prev => prev.map(e => e.id === editingExpense.id ? updatedExpense : e));
      try {
        await supabase.from('expense_splits').delete().eq('expense_id', editingExpense.id);
        await supabase.from('expenses').update({
          description: expenseDesc.trim(), amount, category: expenseCategory,
          paid_by: expensePaidBy, split_method: expenseSplitMethod, expense_date: expenseDate, updated_at: new Date().toISOString(),
        }).eq('id', editingExpense.id);
        await supabase.from('expense_splits').insert(splits.map(s => ({ expense_id: editingExpense.id, ...s })));
      } catch (e) { /* local state already updated */ }
      showToast("Expense updated");
    } else {
      const localExpense = {
        id: `local_${Date.now()}`, trip_id: tripDbId, description: expenseDesc.trim(), amount, category: expenseCategory,
        paid_by: expensePaidBy, split_method: expenseSplitMethod, expense_date: expenseDate, created_at: new Date().toISOString(),
        created_by: user?.user_metadata?.full_name || user?.email || 'You', splits,
      };
      setExpenses(prev => [localExpense, ...prev]);
      try {
        const { data: exp } = await supabase.from('expenses').insert({
          trip_id: tripDbId, description: expenseDesc.trim(), amount, category: expenseCategory,
          paid_by: expensePaidBy, split_method: expenseSplitMethod, expense_date: expenseDate,
          created_by: user?.user_metadata?.full_name || user?.email || 'You',
        }).select().single();
        if (exp) {
          await supabase.from('expense_splits').insert(splits.map(s => ({ expense_id: exp.id, ...s })));
          setExpenses(prev => prev.map(e => e.id === localExpense.id ? { ...exp, splits: splits.map(s => ({ expense_id: exp.id, ...s })) } : e));
        }
      } catch (e) { /* local state already has the expense */ }
      showToast("Expense added");
      const expTrip = selectedCreatedTrip || (createdTrips && createdTrips[0]);
      if (expTrip?.id && logActivity) logActivity(expTrip.id, "\uD83D\uDCB0", `Added expense: ${expenseDesc.trim()} (\u00A3${amount.toFixed(2)})`, "expense");
    }
    resetExpenseForm();
  };

  const deleteExpense = async (expenseId, tripDbId) => {
    try {
      await supabase.from('expense_splits').delete().eq('expense_id', expenseId);
      await supabase.from('expenses').delete().eq('id', expenseId);
      showToast("Expense removed");
      loadExpenses(tripDbId);
    } catch (e) { showToast("Failed to delete", "error"); }
  };

  const calculateSettlement = (expensesList) => {
    const balances = {};
    expensesList.forEach(exp => {
      balances[exp.paid_by] = (balances[exp.paid_by] || 0) + exp.amount;
      (exp.splits || []).forEach(s => {
        balances[s.participant_name] = (balances[s.participant_name] || 0) - s.share_amount;
      });
    });
    const creditors = [], debtors = [];
    Object.entries(balances).forEach(([name, bal]) => {
      if (bal > 0.01) creditors.push({ name, amount: bal });
      else if (bal < -0.01) debtors.push({ name, amount: -bal });
    });
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);
    const settlements = [];
    let ci = 0, di = 0;
    while (ci < creditors.length && di < debtors.length) {
      const amt = Math.min(creditors[ci].amount, debtors[di].amount);
      if (amt > 0.01) settlements.push({ from: debtors[di].name, to: creditors[ci].name, amount: Math.round(amt * 100) / 100 });
      creditors[ci].amount -= amt; debtors[di].amount -= amt;
      if (creditors[ci].amount < 0.01) ci++;
      if (debtors[di].amount < 0.01) di++;
    }
    return settlements;
  };

  const getCategoryBreakdown = (expensesList) => {
    const byCategory = {};
    expensesList.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
    const total = Object.values(byCategory).reduce((a, b) => a + b, 0);
    return Object.entries(byCategory).map(([cat, amount]) => ({
      ...getCatInfo(cat), amount, percentage: total > 0 ? (amount / total) * 100 : 0,
    })).sort((a, b) => b.amount - a.amount);
  };

  return (
    <ExpenseContext.Provider value={{
      // State
      expenses, setExpenses,
      showAddExpense, setShowAddExpense,
      editingExpense, setEditingExpense,
      expenseDesc, setExpenseDesc,
      expenseAmount, setExpenseAmount,
      expenseCategory, setExpenseCategory,
      expensePaidBy, setExpensePaidBy,
      expenseSplitMethod, setExpenseSplitMethod,
      expenseParticipants, setExpenseParticipants,
      expenseCustomSplits, setExpenseCustomSplits,
      showSettlement, setShowSettlement,
      expenseDate, setExpenseDate,
      // Functions
      resetExpenseForm,
      saveExpense,
      deleteExpense,
      calculateSettlement,
      getCategoryBreakdown,
      loadExpenses,
    }}>
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses() {
  const context = useContext(ExpenseContext);
  if (!context) throw new Error("useExpenses must be used within an ExpenseProvider");
  return context;
}
