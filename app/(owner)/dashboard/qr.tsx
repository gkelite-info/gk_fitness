import React, { useState, useEffect, useRef } from 'react';
import { View, Pressable, Animated } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useUser } from '@/context/UserContext';
import QRCode from 'react-native-qrcode-svg';
import { ArrowLeft, Clock } from 'phosphor-react-native';
import { router } from 'expo-router';
import { triggerLightHaptic } from '@/lib/haptics';

export default function GymQRKioskScreen() {
  const { gymId } = useUser();
  const [qrValue, setQrValue] = useState('');
  const [timeLeft, setTimeLeft] = useState(15);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const generateNewQR = () => {
    if (!gymId) return;
    const timestamp = Date.now();
    const newQr = `gkfitness_checkin:${gymId}:${timestamp}`;

    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.3, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true })
    ]).start();

    setQrValue(newQr);
    setTimeLeft(15);
  };

  useEffect(() => {
    if (gymId) {
      generateNewQR();
    }
  }, [gymId]);

  useEffect(() => {
    if (!gymId) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generateNewQR();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gymId]);

  if (!gymId) {
    return (
      <View className="flex-1 bg-black items-center justify-center p-6">
        <Text className="text-white text-center">Loading gym details...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black pt-5 pb-28">
      <View className="px-6 flex-row items-center justify-between mb-12">
        <Pressable
          onPress={() => {
            triggerLightHaptic();
            router.back();
          }}
          className="bg-[#111622] border border-[#1F293D] p-3 rounded-full active:opacity-70"
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-xl font-semibold">Gym Check-In QR</Text>
        <View className="w-12" />
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-[#CCFF00] text-3xl font-black mb-4 text-center tracking-wider font-semibold">
          SCAN TO ENTER
        </Text>
        <Text className="text-[#888888] text-base mb-5 text-center px-4">
          Open your GK Fitness App and scan this code to mark your attendance.
        </Text>

        <Animated.View style={{ opacity: fadeAnim }} className="bg-white p-6 rounded-3xl mb-8">
          {qrValue ? (
            <QRCode
              value={qrValue}
              size={250}
              color="black"
              backgroundColor="white"
            />
          ) : (
            <View style={{ width: 250, height: 250 }} className="bg-gray-200 rounded-2xl items-center justify-center">
              <Text>Generating...</Text>
            </View>
          )}
        </Animated.View>

        <View className="w-full max-w-[250px] bg-[#111622] h-2 rounded-full mb-8 overflow-hidden border border-[#1F293D]">
          <View
            className="bg-[#CCFF00] h-full rounded-full"
            style={{ width: `${(timeLeft / 15) * 100}%` }}
          />
        </View>

        <View className="flex-row items-center bg-[#111622] border border-[#1F293D] rounded-full px-6 py-3">
          <Clock size={20} color="#CCFF00" weight="bold" />
          <Text className="text-white font-semibold ml-2 text-lg">
            Refreshing in {timeLeft}s
          </Text>
        </View>
      </View>
    </View>
  );
}
