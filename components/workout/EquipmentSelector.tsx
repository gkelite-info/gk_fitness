import React from 'react';
import { View, Pressable, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { Check } from 'phosphor-react-native';
import { EquipmentValue } from '@/hooks/customWorkout/useCustomWorkoutBuilder';

interface EquipmentItem {
  value: EquipmentValue;
  label: string;
  image: any;
  description: string;
}

const EQUIPMENT_LIST: EquipmentItem[] = [
  {
    value: 'BODY_ONLY',
    label: 'Bodyweight',
    image: require('@/assets/equipment-bodyweight.png'),
    description: 'No equipment needed',
  },
  {
    value: 'DUMBBELL',
    label: 'Dumbbell',
    image: require('@/assets/equipment-dumbbell.png'),
    description: 'Free weights',
  },
  {
    value: 'BARBELL',
    label: 'Barbell',
    image: require('@/assets/equipment-barbell.png'),
    description: 'Compound lifts',
  },
  {
    value: 'CABLE',
    label: 'Cable Machine',
    image: require('@/assets/equipment-cable.png'),
    description: 'Pulleys & crossovers',
  },
  {
    value: 'MACHINE',
    label: 'Gym Machines',
    image: require('@/assets/equipment-machine.png'),
    description: 'Guided & selectorized',
  },
  {
    value: 'KETTLEBELLS',
    label: 'Kettlebell',
    image: require('@/assets/equipment-kettlebell.png'),
    description: 'Dynamic training',
  },
  {
    value: 'BANDS',
    label: 'Resistance Band',
    image: require('@/assets/equipment-band.png'),
    description: 'Portable resistance',
  },
  {
    value: 'WEIGHT_PLATE',
    label: 'Weight Plate',
    image: require('@/assets/equipment-plate.png'),
    description: 'Plate exercises',
  },
  {
    value: 'PULLUP_BAR',
    label: 'Pull-up Bar',
    image: require('@/assets/equipment-pullupbar.png'),
    description: 'Upper body pulls',
  },
  {
    value: 'BENCH',
    label: 'Bench',
    image: require('@/assets/equipment-bench.png'),
    description: 'Press & support',
  },
];

interface EquipmentSelectorProps {
  selectedEquipment: EquipmentValue[];
  onToggle: (eq: EquipmentValue) => void;
  onClear: () => void;
  onSelectAll: () => void;
}

export function EquipmentSelector({
  selectedEquipment,
  onToggle,
  onClear,
  onSelectAll,
}: EquipmentSelectorProps) {
  const allSelected = selectedEquipment.length === EQUIPMENT_LIST.length;

  return (
    <View className="w-full">
      {/* Header actions */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-[#8E8E8E] text-sm">
          {selectedEquipment.length > 0
            ? `${selectedEquipment.length} selected`
            : 'Select available equipment'}
        </Text>
        <View className="flex-row gap-3">
          {selectedEquipment.length > 0 && (
            <Pressable onPress={onClear} className="active:opacity-70">
              <Text className="text-[#8E8E8E] text-sm underline">Clear</Text>
            </Pressable>
          )}
          <Pressable onPress={allSelected ? onClear : onSelectAll} className="active:opacity-70">
            <Text className="text-[#C4EF00] text-sm font-semibold">
              {allSelected ? 'Deselect All' : 'Select All'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Equipment grid */}
      <View className="flex-row flex-wrap gap-3">
        {EQUIPMENT_LIST.map((item) => {
          const isSelected = selectedEquipment.includes(item.value);
          return (
            <Pressable
              key={item.value}
              onPress={() => onToggle(item.value)}
              className={`
                items-center justify-center rounded-2xl border p-3 active:opacity-80
                ${isSelected
                  ? 'border-[#C4EF00] bg-[#1A2000]'
                  : 'border-[#27272A] bg-[#111111]'}
              `}
              style={{ width: '47%' }}
            >
              {/* Selected check badge */}
              {isSelected && (
                <View className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#C4EF00] items-center justify-center z-10">
                  <Check size={12} color="black" weight="bold" />
                </View>
              )}

              {/* Active dot */}
              <View
                className={`absolute top-2.5 left-2.5 w-2 h-2 rounded-full ${isSelected ? 'bg-[#C4EF00]' : 'bg-[#333]'}`}
              />

              {/* Equipment image */}
              <Image
                source={item.image}
                style={{ width: 72, height: 60, marginBottom: 8 }}
                resizeMode="contain"
              />

              {/* Label */}
              <Text
                className={`text-xs font-semibold text-center ${isSelected ? 'text-[#C4EF00]' : 'text-white'}`}
              >
                {item.label}
              </Text>

              {/* Description */}
              <Text className="text-[#555] text-[10px] text-center mt-0.5" numberOfLines={1}>
                {item.description}
              </Text>

              {/* Lime bottom bar when selected */}
              {isSelected && (
                <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C4EF00] rounded-b-2xl" />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export { EQUIPMENT_LIST };
