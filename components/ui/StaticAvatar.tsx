import { supabase } from '@/lib/supabase';
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
  userId?: string | null;
}

export function StaticAvatar({
  uri,
  name,
  className = '',
  size = 24,
  gender,
  iconColor = '#8E8E93',
  userId,
}: StaticAvatarProps) {
  const [hasError, setHasError] = useState(false);

  let cleanUri =
    uri && typeof uri === 'string' && uri.trim() !== '' && uri !== 'null' && uri !== 'undefined'
      ? uri.trim()
      : null;

  if (cleanUri && !cleanUri.startsWith('http://') && !cleanUri.startsWith('https://') && !cleanUri.startsWith('file:') && !cleanUri.startsWith('data:')) {
    const pathInBucket = cleanUri.includes('/') ? cleanUri : (userId ? `${userId}/${cleanUri}` : cleanUri);
    const { data } = supabase.storage.from('profile_photos').getPublicUrl(pathInBucket);
    if (data?.publicUrl) {
      cleanUri = data.publicUrl;
    }
  }
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
