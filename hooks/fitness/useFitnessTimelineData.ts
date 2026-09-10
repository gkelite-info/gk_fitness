import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { usePedometer } from '@/hooks/fitness/usePedometer';
import { getLocalDateString } from '@/lib/dateUtils';

export type TimeframeMode = 'D' | 'W' | 'M' | 'Y';

export interface TimelineBarData {
  label: string;
  value: number;
  goal: number;
  isCurrent?: boolean;
}

export function useFitnessTimelineData(
  userId: string | null,
  metricType: 'calories' | 'steps' | 'water',
  initialMode: TimeframeMode = 'D'
) {
  const [timeframe, setTimeframe] = useState<TimeframeMode>(initialMode);
  const [offset, setOffset] = useState<number>(0);
  const { steps: liveSteps, calories: liveCalories } = usePedometer();

  const handleSetTimeframe = (mode: TimeframeMode) => {
    setTimeframe(mode);
    setOffset(0);
  };

  const dateRange = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (timeframe === 'D') {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + offset);
      const dateStr = getLocalDateString(targetDate);

      let label = '';
      if (offset === 0) {
        label = `Today, ${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      } else if (offset === -1) {
        label = `Yesterday, ${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      } else {
        label = targetDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      }

      return {
        startDateStr: dateStr,
        endDateStr: dateStr,
        label,
        targetDate,
      };
    }

    if (timeframe === 'W') {
      const dayOfWeek = today.getDay();
      const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const thisMon = new Date(today);
      thisMon.setDate(today.getDate() + diffToMon + (offset * 7));

      const thisSun = new Date(thisMon);
      thisSun.setDate(thisMon.getDate() + 6);

      const startStr = getLocalDateString(thisMon);
      const endStr = getLocalDateString(thisSun);

      const startLabel = thisMon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endLabel = thisSun.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      return {
        startDateStr: startStr,
        endDateStr: endStr,
        label: `${startLabel} - ${endLabel}`,
        startOfWeek: thisMon,
        endOfWeek: thisSun,
      };
    }

    if (timeframe === 'M') {
      const targetMonthDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
      const endOfMonthDate = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth() + 1, 0);

      const startStr = getLocalDateString(targetMonthDate);
      const endStr = getLocalDateString(endOfMonthDate);

      const label = targetMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      return {
        startDateStr: startStr,
        endDateStr: endStr,
        label,
        targetMonthDate,
        endOfMonthDate,
      };
    }

    const targetYear = today.getFullYear() + offset;
    const startStr = `${targetYear}-01-01`;
    const endStr = `${targetYear}-12-31`;

    return {
      startDateStr: startStr,
      endDateStr: endStr,
      label: `${targetYear}`,
      targetYear,
    };
  }, [timeframe, offset]);

  const { data: summariesData, isLoading } = useQuery({
    queryKey: ['fitnessTimeline', userId, metricType, timeframe, dateRange.startDateStr, dateRange.endDateStr],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('daily_health_summaries')
        .select('*')
        .eq('userId', userId)
        .gte('date', dateRange.startDateStr)
        .lte('date', dateRange.endDateStr)
        .order('date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const processedData = useMemo(() => {
    const todayStr = getLocalDateString(new Date());
    const mapByDate = new Map<string, any>();
    (summariesData || []).forEach((item: any) => {
      mapByDate.set(item.date, item);
    });

    const defaultGoals = {
      calories: 500,
      steps: 10000,
      water: 2500,
    };

    let totalValue = 0;
    let goalValue = defaultGoals[metricType];
    let chartBars: TimelineBarData[] = [];
    let avgValue = 0;
    let daysCount = 1;

    const getValue = (item: any) => {
      if (!item) return 0;
      if (metricType === 'calories') return item.activeCalories || 0;
      if (metricType === 'steps') return item.steps || 0;
      if (metricType === 'water') return (item.waterIntake || 0) * 1000;
      return 0;
    };

    const getGoal = (item: any) => {
      if (!item) return defaultGoals[metricType];
      if (metricType === 'calories') return item.calorieGoal || defaultGoals.calories;
      if (metricType === 'steps') return item.stepGoal || defaultGoals.steps;
      if (metricType === 'water') return (item.waterGoal || 2.5) * 1000;
      return defaultGoals[metricType];
    };

    if (timeframe === 'D') {
      const dayRecord = mapByDate.get(dateRange.startDateStr);
      let dayVal = getValue(dayRecord);

      if (offset === 0) {
        if (metricType === 'steps' && liveSteps > dayVal) dayVal = liveSteps;
        if (metricType === 'calories' && liveCalories > dayVal) dayVal = liveCalories;
      }

      totalValue = dayVal;
      avgValue = dayVal;
      goalValue = getGoal(dayRecord);

      const hours = ['08:00', '12:00', '16:00', '20:00'];
      const fractions = totalValue > 0 ? [0.2, 0.35, 0.25, 0.2] : [0, 0, 0, 0];
      chartBars = hours.map((h, i) => ({
        label: h,
        value: Math.round(totalValue * fractions[i]),
        goal: goalValue / 4,
      }));
    } else if (timeframe === 'W') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      daysCount = 7;
      let sum = 0;

      chartBars = days.map((dayLabel, index) => {
        const d = new Date(dateRange.startOfWeek!);
        d.setDate(d.getDate() + index);
        const dStr = d.toISOString().split('T')[0];
        const record = mapByDate.get(dStr);
        let val = getValue(record);

        if (dStr === todayStr && offset === 0) {
          if (metricType === 'steps' && liveSteps > val) val = liveSteps;
          if (metricType === 'calories' && liveCalories > val) val = liveCalories;
        }

        sum += val;
        return {
          label: dayLabel,
          value: val,
          goal: getGoal(record),
          isCurrent: dStr === todayStr,
        };
      });

      totalValue = sum;
      avgValue = Math.round(sum / 7);
    } else if (timeframe === 'M') {
      const startDate = new Date(dateRange.startDateStr);
      const endDate = new Date(dateRange.endDateStr);
      const numDays = endDate.getDate();
      daysCount = numDays;

      let sum = 0;
      const weekSums: { label: string; value: number; goal: number }[] = [];

      for (let i = 1; i <= numDays; i++) {
        const dStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const record = mapByDate.get(dStr);
        let val = getValue(record);

        if (dStr === todayStr && offset === 0) {
          if (metricType === 'steps' && liveSteps > val) val = liveSteps;
          if (metricType === 'calories' && liveCalories > val) val = liveCalories;
        }

        sum += val;
        const weekIdx = Math.floor((i - 1) / 7);
        if (!weekSums[weekIdx]) {
          weekSums[weekIdx] = { label: `W${weekIdx + 1}`, value: 0, goal: goalValue * 7 };
        }
        weekSums[weekIdx].value += val;
      }

      totalValue = sum;
      avgValue = Math.round(sum / numDays);
      chartBars = weekSums;
    } else if (timeframe === 'Y') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      daysCount = 365;
      let sum = 0;

      const monthSums = months.map((mLabel, mIdx) => {
        let mSum = 0;
        const daysInM = new Date(dateRange.targetYear!, mIdx + 1, 0).getDate();

        for (let day = 1; day <= daysInM; day++) {
          const dStr = `${dateRange.targetYear}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const record = mapByDate.get(dStr);
          let val = getValue(record);

          if (dStr === todayStr && offset === 0) {
            if (metricType === 'steps' && liveSteps > val) val = liveSteps;
            if (metricType === 'calories' && liveCalories > val) val = liveCalories;
          }
          mSum += val;
        }

        sum += mSum;
        return {
          label: mLabel,
          value: mSum,
          goal: goalValue * daysInM,
        };
      });

      totalValue = sum;
      avgValue = Math.round(sum / 365);
      chartBars = monthSums;
    }

    return {
      totalValue,
      avgValue,
      goalValue,
      chartBars,
      daysCount,
    };
  }, [summariesData, timeframe, dateRange, metricType, offset, liveSteps, liveCalories]);

  return {
    timeframe,
    setTimeframe: handleSetTimeframe,
    offset,
    setOffset,
    label: dateRange.label,
    isLoading,
    dateRange,
    ...processedData,
  };
}
