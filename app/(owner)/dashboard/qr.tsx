import React, { useState, useEffect, useRef } from 'react';
import { View, Pressable, Animated, Image, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useUser } from '@/context/UserContext';
import QRCode from 'react-native-qrcode-svg';
import { ArrowLeft, Clock } from 'phosphor-react-native';
import { router } from 'expo-router';
import { triggerLightHaptic } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { fetchGymById } from '@/helpers/gym/gymHelper';

export default function GymQRKioskScreen() {
  const { gymId } = useUser();
  const [activeTab, setActiveTab] = useState<'dynamic' | 'static'>('dynamic');
  
  const [staticQrUrl, setStaticQrUrl] = useState<string | null>(null);
  const [isLoadingStatic, setIsLoadingStatic] = useState(false);

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
      if (activeTab === 'dynamic') {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            generateNewQR();
            return 15;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [gymId, activeTab]);

  useEffect(() => {
    async function loadStaticQr() {
      if (!gymId) return;
      setIsLoadingStatic(true);
      try {
        const gym = await fetchGymById(gymId);
        if (gym?.qrPath) {
          setStaticQrUrl(gym.qrPath);
        }
      } catch (err) {
        console.error('Failed to load static QR:', err);
      } finally {
        setIsLoadingStatic(false);
      }
    }
    loadStaticQr();
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
      <View className="px-6 flex-row items-center justify-between mb-2">
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

      <View className="px-6 mb-10 flex-row items-center justify-center">
        <View className="flex-row bg-[#111622] rounded-full p-1 border border-[#1F293D]">
          <Pressable
            onPress={() => {
              triggerLightHaptic();
              setActiveTab('dynamic');
            }}
            className={`px-6 py-2.5 rounded-full ${activeTab === 'dynamic' ? 'bg-[#CCFF00]' : 'bg-transparent'}`}
          >
            <Text className={`font-semibold ${activeTab === 'dynamic' ? 'text-black' : 'text-[#888888]'}`}>Dynamic</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              triggerLightHaptic();
              setActiveTab('static');
            }}
            className={`px-6 py-2.5 rounded-full ${activeTab === 'static' ? 'bg-[#CCFF00]' : 'bg-transparent'}`}
          >
            <Text className={`font-semibold ${activeTab === 'static' ? 'text-black' : 'text-[#888888]'}`}>Static</Text>
          </Pressable>
        </View>
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-[#CCFF00] text-3xl font-black mb-4 text-center tracking-wider font-semibold">
          SCAN TO ENTER
        </Text>
        <Text className="text-[#888888] text-base mb-5 text-center px-4">
          Open your GK Fitness App and scan this code to mark your attendance.
        </Text>

        {activeTab === 'dynamic' ? (
          <>
            <Animated.View style={{ opacity: fadeAnim }} className="bg-white p-6 rounded-3xl mb-2">
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
          </>
        ) : (
          <View className="bg-white p-6 rounded-3xl mb-8">
            {isLoadingStatic ? (
              <View style={{ width: 250, height: 250 }} className="bg-gray-200 rounded-2xl items-center justify-center">
                <ActivityIndicator size="large" color="#000" />
              </View>
            ) : staticQrUrl ? (
              <Image
                source={{ uri: staticQrUrl }}
                style={{ width: 250, height: 250 }}
                resizeMode="contain"
              />
            ) : (
              <View style={{ width: 250, height: 250 }} className="bg-gray-200 rounded-2xl items-center justify-center">
                <Text className="text-black font-semibold">No Static QR found</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
