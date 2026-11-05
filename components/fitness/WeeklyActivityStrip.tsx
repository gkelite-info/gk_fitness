import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { MiniActivityRings } from './AppleActivityRings';
import { triggerLightHaptic } from '@/lib/haptics';

export interface DayActivityData {
  dayName: string; // 'M', 'T', 'W', 'T', 'F', 'S', 'S'
  fullDate: Date;
  moveProgress: number; // 0 to 1
  exerciseProgress: number; // 0 to 1
  standProgress: number; // 0 to 1
  isToday: boolean;
}

export interface WeeklyActivityStripProps {
  days: DayActivityData[];
  selectedIndex: number;
  onSelectDay: (index: number) => void;
}

export function WeeklyActivityStrip({
  days,
  selectedIndex,
  onSelectDay,
}: WeeklyActivityStripProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {days.map((item, index) => {
          const isSelected = index === selectedIndex;

          return (
            <Pressable
              key={index}
              onPress={() => {
                triggerLightHaptic();
                onSelectDay(index);
              }}
              style={styles.dayCol}
            >
              {/* Day Letter Badge */}
              <View
                style={[
                  styles.badge,
                  isSelected && styles.selectedBadge,
                  !isSelected && item.isToday && styles.todayBadge,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    isSelected ? styles.selectedDayText : styles.unselectedDayText,
                  ]}
                >
                  {item.dayName}
                </Text>
              </View>

              {/* Mini Concentric Rings */}
              <View style={styles.ringsContainer}>
                <MiniActivityRings
                  moveProgress={item.moveProgress}
                  exerciseProgress={item.exerciseProgress}
                  standProgress={item.standProgress}
                  size={34}
                  strokeWidth={3.2}
                  spacing={1.2}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F1F24',
    backgroundColor: '#000000',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  dayCol: {
    alignItems: 'center',
    flex: 1,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  selectedBadge: {
    backgroundColor: '#FA114F',
  },
  todayBadge: {
    backgroundColor: '#262629',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '700',
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  unselectedDayText: {
    color: '#8E8E93',
  },
  ringsContainer: {
    marginTop: 2,
  },
});

