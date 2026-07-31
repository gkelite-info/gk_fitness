import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { CheckCircle } from 'phosphor-react-native';
import { cn } from '@/lib/cn';

interface SelectableCardProps {
  selected: boolean;
  onPress: () => void;
  className?: string;
  children: React.ReactNode;
  checkPosition?: 'right' | 'top-right' | 'bottom' | 'none';
}

export function SelectableCard({
  selected,
  onPress,
  className,
  children,
  checkPosition = 'right',
}: SelectableCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'rounded-2xl border p-4',
        selected ? 'border-neon bg-[#151a15]' : 'border-gray-800 bg-[#111111]',
        checkPosition === 'right' ? 'flex-row items-center justify-between' : 'relative',
        className
      )}
    >
      {children}
      
      {checkPosition === 'right' && (
        <View>
          {selected ? (
            <CheckCircle weight="fill" color="#d4ff00" size={24} />
          ) : (
            <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#333' }} />
          )}
        </View>
      )}

      {checkPosition === 'top-right' && (
        <View className="absolute top-3 right-3">
          {selected ? (
            <CheckCircle weight="fill" color="#d4ff00" size={20} />
          ) : (
            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#333' }} />
          )}
        </View>
      )}

      {checkPosition === 'bottom' && (
        <View className="items-center mt-3">
          {selected ? (
            <CheckCircle weight="fill" color="#d4ff00" size={20} />
          ) : (
            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#333' }} />
          )}
        </View>
      )}
    </Pressable>
  );
}

