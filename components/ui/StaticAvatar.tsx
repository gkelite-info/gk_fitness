import React from 'react';
import { View, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { User } from 'phosphor-react-native';

interface StaticAvatarProps {
  uri?: string | null;
  name?: string;
  className?: string;
  size?: number;
}

export function StaticAvatar({ uri, name, className = "", size = 24 }: StaticAvatarProps) {
  // If we have a valid URI that is not pravatar, use it.
  if (uri && !uri.includes('pravatar.cc')) {
    return (
      <Image 
        source={{ uri }} 
        className={`${className} bg-[#27272A]`} 
      />
    );
  }

  // Pure fallback (SVG Icon)
  return (
    <View className={`${className} bg-[#27272A] items-center justify-center`}>
      <User size={size * 0.6} color="#71717A" weight="fill" />
    </View>
  );
}
