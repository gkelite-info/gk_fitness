/**
 * Membership Payment & Upgrade Logic
 * Calculates duration, daily rate, remaining days, unused credit, and net payable amount for upgrades.
 */

export interface UpgradeCalculationResult {
  isUpgrade: boolean;
  unusedCredit: number;
  newPlanPrice: number;
  payableAmount: number;
  remainingDays: number;
}

export function calculateRemainingDays(endDate?: string | null): number {
  if (!endDate) return 0;
  const end = new Date(endDate).getTime();
  const now = Date.now();
  if (isNaN(end)) return 0;
  const diffTime = end - now;
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

export function parseDurationMonths(duration?: string | number | null): number {
  if (!duration) return 1;
  if (typeof duration === 'number') return duration > 0 ? duration : 1;
  const parsed = parseInt(String(duration).replace(/\D+/g, ''), 10);
  return !isNaN(parsed) && parsed > 0 ? parsed : 1;
}

export function calculatePlanStats({
  planPrice,
  durationMonths,
  startDate,
  endDate,
  isActive,
}: {
  planPrice: number;
  durationMonths: number;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
}) {
  const months = durationMonths > 0 ? durationMonths : 1;
  const totalDays = months * 30; // standard 30 days per billing month
  const dailyRate = totalDays > 0 && planPrice > 0 ? Math.round(planPrice / totalDays) : 0;
  const remainingDays = calculateRemainingDays(endDate);
  const isExpired = remainingDays === 0 && Boolean(endDate);
  const isPlanActive = isActive && remainingDays > 0 && Boolean(startDate);
  const unusedCredit = isPlanActive && dailyRate > 0 ? Math.min(planPrice, remainingDays * dailyRate) : 0;

  return {
    dailyRate,
    standardRemainingDays: remainingDays,
    isExpired,
    isPlanActive,
    unusedCredit,
  };
}

export function computeUpgradeCalculation(
  currentPlan: any,
  newPlan: { price: number; durationMonths?: number | string | null }
): UpgradeCalculationResult | null {
  if (!currentPlan) return null;

  const currentPrice = Number(currentPlan.plan?.price ?? currentPlan.customAmount ?? currentPlan.price ?? 0);
  const currentMonths = parseDurationMonths(currentPlan.plan?.durationMonths || currentPlan.durationMonths || 1);
  const stats = calculatePlanStats({
    planPrice: currentPrice,
    durationMonths: currentMonths,
    startDate: currentPlan.startDate,
    endDate: currentPlan.endDate,
    isActive: Boolean(currentPlan.is_Active ?? currentPlan.isActive),
  });

  const isCurrentActive = stats.isPlanActive && currentPlan.status !== 'pending';
  const newPrice = Number(newPlan.price) || 0;

  if (!isCurrentActive) {
    return {
      isUpgrade: false,
      unusedCredit: 0,
      newPlanPrice: newPrice,
      payableAmount: newPrice,
      remainingDays: 0,
    };
  }

  // A plan is an upgrade only when the new tier price is greater than the current active plan price
  const isHigherTier = newPrice > currentPrice;
  const unusedCredit = isHigherTier ? Math.min(stats.unusedCredit, newPrice) : 0;
  const payableAmount = isHigherTier ? Math.max(0, newPrice - unusedCredit) : newPrice;

  return {
    isUpgrade: isHigherTier,
    unusedCredit,
    newPlanPrice: newPrice,
    payableAmount,
    remainingDays: stats.standardRemainingDays,
  };
}
