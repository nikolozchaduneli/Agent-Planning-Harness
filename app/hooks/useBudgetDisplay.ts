"use client";

import { useEffect, useRef, useState } from "react";

export default function useBudgetDisplay(totalPlanned: number, budget: number) {
  const [budgetPulse, setBudgetPulse] = useState(false);
  const [plannedTick, setPlannedTick] = useState(false);
  const [showBudgetOverride, setShowBudgetOverride] = useState(false);
  const [budgetOverrideDraft, setBudgetOverrideDraft] = useState("");

  const plannedTickTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const budgetPulseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPlannedRef = useRef(0);

  const isOverBudget = budget > 0 && totalPlanned > budget;
  const budgetPercent = budget > 0 ? Math.min(100, Math.round((totalPlanned / budget) * 100)) : 0;

  useEffect(() => {
    if (prevPlannedRef.current === totalPlanned) return;
    if (plannedTickTimeout.current) clearTimeout(plannedTickTimeout.current);
    if (budgetPulseTimeout.current) clearTimeout(budgetPulseTimeout.current);
    const startPulseTimeout = setTimeout(() => {
      setPlannedTick(true);
      setBudgetPulse(true);
    }, 0);
    plannedTickTimeout.current = setTimeout(() => setPlannedTick(false), 250);
    budgetPulseTimeout.current = setTimeout(() => setBudgetPulse(false), 250);
    prevPlannedRef.current = totalPlanned;
    return () => clearTimeout(startPulseTimeout);
  }, [totalPlanned]);

  return {
    budgetPulse,
    plannedTick,
    showBudgetOverride,
    setShowBudgetOverride,
    budgetOverrideDraft,
    setBudgetOverrideDraft,
    budgetPercent,
    isOverBudget,
  };
}
