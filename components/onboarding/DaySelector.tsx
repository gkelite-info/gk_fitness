import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { CheckCircle } from 'phosphor-react-native';
import { cn } from '@/lib/cn';

const DAYS = [
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: 'Sat' },
  { id: 'sun', label: 'Sun' },
];

interface DaySelectorProps {
  selectedDays: string[];
  onChange: (days: string[]) => void;
}

export function DaySelector({ selectedDays, onChange }: DaySelectorProps) {
  const toggleDay = (dayId: string) => {
    if (selectedDays.includes(dayId)) {
      onChange(selectedDays.filter((d) => d !== dayId));
    } else {
      onChange([...selectedDays, dayId]);
    }
  };

  return (
    <View className="flex-row flex-wrap gap-2">
      {DAYS.map((day) => {
        const isSelected = selectedDays.includes(day.id);
        return (
          <Pressable
            key={day.id}
            onPress={() => toggleDay(day.id)}
            className={cn(
              'w-[48px] h-[64px] rounded-xl items-center justify-center border',
              isSelected ? 'bg-neon border-neon' : 'bg-[#111] border-gray-800'
            )}
          >
            <Text
              className={cn(
                'font-semibold text-xs mb-2',
                isSelected ? 'text-black' : 'text-gray-400'
              )}
            >
              {day.label}
            </Text>
            {isSelected ? (
              <CheckCircle weight="fill" color="#000" size={16} />
            ) : (
              <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: '#555' }} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

