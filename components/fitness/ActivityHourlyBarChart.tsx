import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/nativewindui/Text';

export interface HourlyDataPoint {
  hour: number; // 0 to 23
  value: number;
}

export interface ActivityHourlyBarChartProps {
  title: string; // 'Move' | 'Exercise' | 'Stand'
  currentValue: number | string;
  goalValue: number | string;
  unit: string; // 'KCAL' | 'MIN' | 'HRS' | 'STEPS'
  color: string; // e.g. '#FA114F', '#A1FF00', '#00F0FF'
  hourlyData?: HourlyDataPoint[];
  totalLabel?: string; // e.g. 'TOTAL 2 769 KCAL'
  peakLabel?: string;
  height?: number;
}

export function ActivityHourlyBarChart({
  title,
  currentValue,
  goalValue,
  unit,
  color,
  hourlyData,
  totalLabel,
  peakLabel,
  height = 96,
}: ActivityHourlyBarChartProps) {
  // Generate 24 hourly data points (00:00 to 23:00)
  const normalizedHours = useMemo(() => {
    const dataMap = new Map<number, number>();
    if (hourlyData) {
      hourlyData.forEach((d) => dataMap.set(d.hour, d.value));
    }

    const currentHour = new Date().getHours();
    const result: { hour: number; value: number }[] = [];

    for (let h = 0; h < 24; h++) {
      let val = dataMap.get(h) ?? 0;
      // If no data provided and it's daytime, provide a natural sample curve
      if (!hourlyData || hourlyData.length === 0) {
        if (h <= currentHour && h >= 6) {
          const numCurrent = typeof currentValue === 'number' ? currentValue : parseFloat(String(currentValue)) || 100;
          const peakHour = 8;
          const factor = Math.max(0, 1 - Math.abs(h - peakHour) * 0.18);
          val = Math.round((numCurrent / 7) * factor + (h % 3 === 0 ? numCurrent * 0.08 : 0));
        } else {
          val = 0;
        }
      }
      result.push({ hour: h, value: val });
    }
    return result;
  }, [hourlyData, currentValue]);

  const maxVal = useMemo(() => {
    const values = normalizedHours.map((d) => d.value);
    const m = Math.max(...values, 1);
    return m;
  }, [normalizedHours]);

  const peakDisplay = peakLabel || `${Math.round(maxVal)}${unit}`;

  return (
    <View style={styles.container}>
      {/* Metric Header */}
      <View style={styles.header}>
        <Text style={styles.titleText}>{title}</Text>
        <Text style={[styles.valueText, { color }]}>
          {typeof currentValue === 'number' ? currentValue.toLocaleString() : currentValue}/
          {typeof goalValue === 'number' ? goalValue.toLocaleString() : goalValue}
          <Text style={[styles.unitText, { color }]}>{unit}</Text>
        </Text>
      </View>

      {/* Peak Label */}
      <View style={styles.peakContainer}>
        <Text style={styles.peakText}>{peakDisplay}</Text>
      </View>

      {/* 24-Hour Vertical Bar Chart */}
      <View style={[styles.chartArea, { height }]}>
        {/* Subtle Horizontal Grid Line */}
        <View style={styles.horizontalDottedLine} />

        {/* 24 Hourly Vertical Bars */}
        <View style={styles.barsRow}>
          {normalizedHours.map((item) => {
            const ratio = Math.min(item.value / maxVal, 1);
            const barHeight = Math.max(item.value > 0 ? ratio * (height - 10) : 3, 3);
            const isZero = item.value <= 0;

            return (
              <View key={item.hour} style={styles.barColumn}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: isZero ? '#222224' : color,
                      opacity: isZero ? 0.6 : 1,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>

      {/* Time Axis (00:00, 06:00, 12:00, 18:00) */}
      <View style={styles.timeAxis}>
        <Text style={styles.timeLabel}>00:00</Text>
        <Text style={styles.timeLabel}>06:00</Text>
        <Text style={styles.timeLabel}>12:00</Text>
        <Text style={styles.timeLabel}>18:00</Text>
      </View>

      {/* Total / Subtitle */}
      {totalLabel && (
        <View style={styles.totalContainer}>
          <Text style={[styles.totalText, { color }]}>{totalLabel}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'column',
    marginBottom: 4,
  },
  titleText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  valueText: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  unitText: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 2,
  },
  peakContainer: {
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  peakText: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  chartArea: {
    width: '100%',
    justifyContent: 'flex-end',
    position: 'relative',
    marginVertical: 4,
  },
  horizontalDottedLine: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#262626',
    borderStyle: 'dashed',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
    height: '100%',
    paddingBottom: 2,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  bar: {
    width: 6,
    borderRadius: 3,
  },
  timeAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1F1F22',
    paddingTop: 4,
  },
  timeLabel: {
    color: '#636366',
    fontSize: 11,
    fontWeight: '500',
  },
  totalContainer: {
    marginTop: 6,
  },
  totalText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

