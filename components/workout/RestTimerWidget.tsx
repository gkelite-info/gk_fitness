import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Pressable, Modal, TouchableOpacity } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Timer, X, Minus, Plus } from 'phosphor-react-native';


const STORAGE_KEY_DURATION = '@restTimer_duration';
const STORAGE_KEY_ENABLED = '@restTimer_enabled';

interface RestTimerWidgetProps {
  /** Call this to imperatively start the timer after a set is completed */
  startRef?: React.MutableRefObject<(() => void) | null>;
}

export function RestTimerWidget({ startRef }: RestTimerWidgetProps) {
  const [enabled, setEnabled] = useState(true);
  const [durationSeconds, setDurationSeconds] = useState(90); // default 1:30
  const [remaining, setRemaining] = useState<number | null>(null);
  const [showSheet, setShowSheet] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remainingRef = useRef<number | null>(null);

  // Load persisted settings
  useEffect(() => {
    (async () => {
      const [storedDuration, storedEnabled] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_DURATION),
        AsyncStorage.getItem(STORAGE_KEY_ENABLED),
      ]);
      if (storedDuration) setDurationSeconds(parseInt(storedDuration, 10));
      if (storedEnabled !== null) setEnabled(storedEnabled === 'true');
    })();
  }, []);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRemaining(null);
    remainingRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    if (!enabled) return;
    // Stop any running timer first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    const dur = durationSeconds;
    remainingRef.current = dur;
    setRemaining(dur);

    intervalRef.current = setInterval(() => {
      if (remainingRef.current === null) return;
      remainingRef.current -= 1;
      setRemaining(remainingRef.current);
      if (remainingRef.current <= 0) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        remainingRef.current = null;
        setRemaining(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 1000);
  }, [enabled, durationSeconds]);

  // Expose startTimer via ref for parent to call
  useEffect(() => {
    if (startRef) {
      startRef.current = startTimer;
    }
  }, [startTimer, startRef]);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleDurationChange = async (val: number) => {
    const rounded = Math.round(val);
    setDurationSeconds(rounded);
    await AsyncStorage.setItem(STORAGE_KEY_DURATION, rounded.toString());
  };

  const handleToggleEnabled = async () => {
    const next = !enabled;
    setEnabled(next);
    await AsyncStorage.setItem(STORAGE_KEY_ENABLED, next.toString());
    if (!next) stopTimer();
  };

  const isActive = remaining !== null && remaining > 0;
  const progress = isActive ? remaining / durationSeconds : 0;

  return (
    <>
      {/* Green pill */}
      <Pressable
        onPress={() => setShowSheet(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isActive ? '#1A3300' : '#1A1A1A',
          borderRadius: 20,
          paddingVertical: 8,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: isActive ? '#5A9900' : '#2A2A2A',
          gap: 6,
        }}
      >
        <Timer size={16} color={isActive ? '#DFFF00' : '#8E8E8E'} weight="fill" />
        <Text
          style={{
            color: isActive ? '#DFFF00' : '#8E8E8E',
            fontSize: 14,
            fontWeight: '700',
          }}
        >
          {isActive ? formatTime(remaining!) : formatTime(durationSeconds)}
        </Text>
      </Pressable>

      {/* Bottom sheet */}
      <Modal
        visible={showSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSheet(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
          onPress={() => setShowSheet(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                backgroundColor: '#161616',
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                paddingHorizontal: 24,
                paddingTop: 20,
                paddingBottom: 48,
                borderTopWidth: 1,
                borderColor: '#2A2A2A',
              }}
            >
              {/* Handle */}
              <View style={{ alignSelf: 'center', width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, marginBottom: 24 }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '700' }}>Rest Timer</Text>
                <Pressable onPress={() => setShowSheet(false)} hitSlop={12}>
                  <X size={22} color="#555" />
                </Pressable>
              </View>

              {/* Large time display */}
              <View style={{ alignItems: 'center', marginBottom: 32 }}>
                <Text
                  style={{
                    color: isActive ? '#DFFF00' : '#FFFFFF',
                    fontSize: 64,
                    fontWeight: '800',
                    letterSpacing: -2,
                  }}
                >
                  {isActive ? formatTime(remaining!) : formatTime(durationSeconds)}
                </Text>
                {isActive && (
                  <Text style={{ color: '#8E8E8E', fontSize: 13, marginTop: 4 }}>resting...</Text>
                )}
              </View>

              {/* Slider — step buttons */}
              <Text style={{ color: '#8E8E8E', fontSize: 12, fontWeight: '600', marginBottom: 12, letterSpacing: 0.8 }}>
                DEFAULT DURATION
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 28 }}>
                <TouchableOpacity
                  onPress={() => handleDurationChange(Math.max(10, durationSeconds - 15))}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: '#1E1E1E',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: '#2A2A2A',
                  }}
                >
                  <Minus size={20} color="#FFF" />
                </TouchableOpacity>

                <View style={{ alignItems: 'center', minWidth: 80 }}>
                  <Text style={{ color: '#DFFF00', fontSize: 28, fontWeight: '800' }}>{formatTime(durationSeconds)}</Text>
                  <Text style={{ color: '#555', fontSize: 11, marginTop: 2 }}>15s steps</Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleDurationChange(Math.min(300, durationSeconds + 15))}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: '#1E1E1E',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: '#2A2A2A',
                  }}
                >
                  <Plus size={20} color="#FFF" />
                </TouchableOpacity>
              </View>


              {/* Enable toggle */}
              <Pressable
                onPress={handleToggleEnabled}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#1E1E1E',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: '#2A2A2A',
                }}
              >
                <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '600' }}>Auto-start after set</Text>
                <View
                  style={{
                    width: 48,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: enabled ? '#DFFF00' : '#2A2A2A',
                    padding: 3,
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: '#000',
                      alignSelf: enabled ? 'flex-end' : 'flex-start',
                    }}
                  />
                </View>
              </Pressable>

              {/* Manual start/stop */}
              <Pressable
                onPress={isActive ? stopTimer : startTimer}
                style={{
                  backgroundColor: isActive ? '#220A00' : '#1A2D00',
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: isActive ? '#FF4D4D40' : '#DFFF0040',
                }}
              >
                <Text
                  style={{
                    color: isActive ? '#FF4D4D' : '#DFFF00',
                    fontSize: 15,
                    fontWeight: '700',
                  }}
                >
                  {isActive ? 'Cancel Timer' : 'Start Now'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
