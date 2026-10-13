import React, { useState, useEffect } from 'react';
import { View, Image } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

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

  const normalizedGender = gender ? gender.trim().toLowerCase() : null;
  const isFemale = normalizedGender === 'female' || normalizedGender === 'f';
  const isMale = normalizedGender === 'male' || normalizedGender === 'm';

  const iconSize = Math.round(size * 0.6);

  return (
    <View className={`${className} bg-[#27272A] items-center justify-center overflow-hidden`}>
      {isFemale ? (
        <MaterialCommunityIcons name="face-woman" size={iconSize} color={iconColor} />
      ) : isMale ? (
        <MaterialCommunityIcons name="face-man" size={iconSize} color={iconColor} />
      ) : (
        <MaterialCommunityIcons name="account" size={iconSize} color={iconColor} />
      )}
    </View>
  );
}
