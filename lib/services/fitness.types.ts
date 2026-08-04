export interface DailyFitnessStats {
  date: string; // YYYY-MM-DD format
  steps: number;
  calories: number;
  waterGoalML: number;
}

export interface WaterLogEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  timestamp: number; // exact time logged
  amountML: number;
}

export interface FitnessRepository {
  // Steps & Calories
  getDailyStats(userId: string, date: string): Promise<DailyFitnessStats>;
  updateSteps(userId: string, date: string, steps: number, calories: number): Promise<void>;
  
  // Water
  getWaterGoal(userId: string): Promise<number>;
  setWaterGoal(userId: string, goalML: number): Promise<void>;
  logWater(userId: string, amountML: number, date: string): Promise<WaterLogEntry>;
  getWaterLogs(userId: string, date: string): Promise<WaterLogEntry[]>;
  getDailyTotalWater(userId: string, date: string): Promise<number>;
}
