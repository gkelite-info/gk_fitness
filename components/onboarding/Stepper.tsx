import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Check } from 'phosphor-react-native';
import { cn } from '@/lib/cn';
import { router } from 'expo-router';

interface StepperProps {
  currentStep: number;
}

const STEPS = [
  { id: 1, label: 'Info' },
  { id: 2, label: 'Goal' },
  { id: 3, label: 'Workout' },
  { id: 4, label: 'Nutrition' },
  { id: 5, label: 'Review' },
];

export function Stepper({ currentStep }: StepperProps) {
  return (
    <View className="mb-10 pt-2">
      <Text className="text-[#d4ff00] font-semibold text-sm tracking-widest uppercase mb-6">
        Step {currentStep} of {STEPS.length}
      </Text>
      
      <View className="flex-row items-center justify-between relative">
        {/* Background Track Line */}
        <View className="absolute left-0 right-0 h-[2px] bg-[#27272A] top-4 z-0 rounded-full" />
        
        {/* Active Track Line (Animated or static fill) */}
        <View 
          className="absolute left-0 h-[2px] bg-[#d4ff00] top-4 z-0 rounded-full transition-all duration-300"
          style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
        />

        {STEPS.map((step) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;

          return (
            <Pressable 
              key={step.id} 
              className="items-center z-10 w-12"
              onPress={() => {
                if (isCompleted) {
                  router.push(`/(customer)/(onboarding)/step${step.id}` as any);
                }
              }}
            >
              <View
                className={cn(
                  'w-8 h-8 rounded-full items-center justify-center border-2 bg-[#09090b]',
                  isActive ? 'border-[#d4ff00]' : isCompleted ? 'border-[#d4ff00] bg-[#d4ff00]' : 'border-[#27272A]'
                )}
              >
                {isCompleted ? (
                  <Check weight="bold" size={16} color="#000" />
                ) : (
                  <View 
                    className={cn(
                      'w-2.5 h-2.5 rounded-full',
                      isActive ? 'bg-[#d4ff00]' : 'bg-[#27272A]'
                    )}
                  />
                )}
              </View>
              <Text
                className={cn(
                  'text-[10px] mt-2 font-medium text-center',
                  isActive ? 'text-[#d4ff00]' : isCompleted ? 'text-white' : 'text-[#71717A]'
                )}
              >
                {step.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
