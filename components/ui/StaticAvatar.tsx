import React, { useState, useEffect } from 'react';
import { View, Image } from 'react-native';
import { User } from 'phosphor-react-native';

interface StaticAvatarProps {
  uri?: string | null;
  name?: string;
  className?: string;
  size?: number;
  gender?: string | null;
  iconColor?: string;
}

export function StaticAvatar({
  uri,
  name,
  className = '',
  size = 24,
  gender,
  iconColor = '#8E8E93',
}: StaticAvatarProps) {
  const [hasError, setHasError] = useState(false);

  const cleanUri =
    uri && typeof uri === 'string' && uri.trim() !== '' && uri !== 'null' && uri !== 'undefined'
      ? uri.trim()
      : null;
  const isPravatar = cleanUri ? cleanUri.includes('pravatar.cc') : false;

  useEffect(() => {
    setHasError(false);
  }, [cleanUri]);

  if (cleanUri && !isPravatar && !hasError) {
    return (
      <Image
        source={{ uri: cleanUri }}
        className={`${className} bg-[#27272A]`}
        onError={() => setHasError(true)}
      />
    );
  }

  const iconSize = Math.round(size * 0.55);

  return (
    <View className={`${className} bg-[#27272A] items-center justify-center overflow-hidden`}>
      <User size={iconSize} color={iconColor} weight="regular" />
    </View>
  );
}
