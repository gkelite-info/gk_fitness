import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { Camera, CameraView } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { useMarkAttendance } from '@/hooks/attendance/useMarkAttendance';
import { ArrowLeft, CheckCircle, WarningCircle, Camera as CameraIcon, Lightning } from 'phosphor-react-native';
import { toast } from '@/lib/toast';


export default function CustomerScanScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const { customerId } = useUser();
  const { mutateAsync: logAttendance, isPending: isLoggingAttendance } = useMarkAttendance();

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      setScanResult(null);
    }, [])
  );

  const handleBack = () => {
    router.push('/(customer)/home');
  }

  const handleBarCodeScanned = async (event: any) => {
    if (!customerId) {
      toast.error('Customer ID missing. Please ensure you are registered in a gym.');
      return;
    }

    const { type, data } = event;

    setScanned(true);

    try {
      const result = await logAttendance({ qrString: data, customerId });
      setScanResult(result);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (e: any) {
      setScanResult({ success: false, message: e.message || 'Something went wrong.' });
    }
  };

  if (hasPermission === null) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <Text className="text-white">Requesting camera permission...</Text>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View className="flex-1 bg-black items-center justify-center p-6">
        <View className="mb-4">
          <WarningCircle size={48} color="#EF4444" weight="fill" />
        </View>
        <Text className="text-white text-center text-lg mb-4">No access to camera</Text>
        <Pressable onPress={() => handleBack()} className="bg-[#111622] px-6 py-3 rounded-xl border border-[#1F293D] w-full items-center">
          <Text className="text-white">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <View className="absolute top-16 left-6 z-50">
        <Pressable
          onPress={() => handleBack()}
          className="bg-black/50 p-3 rounded-full border border-white/20 active:opacity-70"
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
      </View>
      <View className="absolute top-16 right-6 z-50">
        <Pressable
          onPress={() => setFlashOn(!flashOn)}
          className={`p-3 rounded-full border active:opacity-70 ${flashOn ? 'bg-[#CCFF00] border-[#CCFF00]' : 'bg-black/50 border-white/20'}`}
        >
          <Lightning size={24} color={flashOn ? "#000000" : "#FFFFFF"} weight={flashOn ? "fill" : "regular"} />
        </Pressable>
      </View>

      {!scanResult ? (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={flashOn}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        >
          <View className="flex-1 bg-black/40 items-center justify-center">
            <View className="w-64 h-64 border-2 border-[#CCFF00] rounded-3xl items-center justify-center bg-transparent">
              {isLoggingAttendance && <Text className="text-[#CCFF00] font-semibold">Verifying...</Text>}
            </View>
            <View className="absolute bottom-32 items-center">
              <View className="mb-3 opacity-80">
                <CameraIcon size={32} color="#FFFFFF" />
              </View>
              <Text className="text-white text-lg font-semibold tracking-wider">SCAN GYM QR CODE</Text>
              <Text className="text-gray-400 text-sm mt-2 px-8 text-center">
                Point your camera at the gym's QR screen to mark attendance.
              </Text>
            </View>
          </View>
        </CameraView>
      ) : (
        <View className="flex-1 items-center justify-center p-6 bg-black">
          {scanResult.success ? (
            <View className="mb-6"><CheckCircle size={80} color="#CCFF00" weight="fill" /></View>
          ) : (
            <View className="mb-6"><WarningCircle size={80} color="#EF4444" weight="fill" /></View>
          )}

          <Text className="text-white text-2xl font-semibold text-center mb-4">
            {scanResult.success ? 'Attendance Logged!' : 'Scan Failed'}
          </Text>
          <Text className="text-[#888888] text-center mb-12 text-base">
            {scanResult.message}
          </Text>

          <Pressable
            onPress={() => {
              if (scanResult.success) {
                handleBack();
              } else {
                setScanned(false);
                setScanResult(null);
              }
            }}
            className="w-full bg-[#111622] border border-[#1F293D] py-4 rounded-xl items-center active:opacity-70"
          >
            <Text className="text-white font-semibold text-base">
              {scanResult.success ? 'Done' : 'Try Again'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
