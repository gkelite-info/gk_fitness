import React, { useState, useImperativeHandle, useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { toastRef } from '@/lib/toast';
import { CheckCircle, XCircle, CircleNotch } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ToastProvider() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'success' | 'error' | 'loading'>('success');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const spinValue = useRef(new Animated.Value(0)).current;

  useImperativeHandle(toastRef, () => ({
    show: (msg, t, duration = 3000) => {
      setMessage(msg);
      setType(t);
      setVisible(true);
      
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();

      if (t !== 'loading') {
        // Clear any previous timeouts if we show a new toast
        const timer = setTimeout(() => {
          hideToast();
        }, duration);
        return () => clearTimeout(timer);
      }
    },
    hide: () => {
      hideToast();
    }
  }));

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (visible && type === 'loading') {
      spinValue.setValue(0);
      animation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      animation.start();
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [visible, type, spinValue]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -100, duration: 200, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={18} color="#D4FF00" weight="fill" />;
      case 'error':
        return <XCircle size={18} color="#FF3B30" weight="fill" />;
      case 'loading':
        return (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <CircleNotch size={18} color="#D4FF00" weight="bold" />
          </Animated.View>
        );
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 10,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
      pointerEvents="none"
    >
      <View className="bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3 flex-row items-center gap-3 shadow-2xl max-w-[280px] self-start">
        {getIcon()}
        <Text className="text-white text-xs font-semibold flex-1 leading-4">{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 9999,
  },
});
