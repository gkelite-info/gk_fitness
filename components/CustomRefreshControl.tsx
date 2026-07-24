import React from 'react';
import { RefreshControl, RefreshControlProps } from 'react-native';

interface CustomRefreshControlProps extends Omit<RefreshControlProps, 'tintColor' | 'colors'> {
  refreshing: boolean;
  onRefresh: () => void;
}

export function CustomRefreshControl({ refreshing, onRefresh, ...props }: CustomRefreshControlProps) {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#C4EF00"
      colors={['#C4EF00']}
      progressBackgroundColor="#121212"
      {...props}
    />
  );
}
