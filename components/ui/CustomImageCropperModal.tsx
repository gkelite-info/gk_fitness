import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  Image,
  ActivityIndicator,
  Dimensions,
  PanResponder,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Check,
  ArrowClockwise,
  ArrowCounterClockwise,
  FlipHorizontal,
  FlipVertical,
  ArrowUUpLeft,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
} from 'phosphor-react-native';
import * as ImageManipulator from 'expo-image-manipulator';

export interface CustomImageCropperModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onApply: (croppedUri: string) => void;
}

type AspectRatioOption = {
  label: string;
  ratio: number | null;
};

const ASPECT_RATIO_OPTIONS: AspectRatioOption[] = [
  { label: 'Original', ratio: null },
  { label: '1:1', ratio: 1 },
  { label: '3:4', ratio: 3 / 4 },
  { label: '4:5', ratio: 4 / 5 },
  { label: '16:9', ratio: 16 / 9 },
];

export function CustomImageCropperModal({
  visible,
  imageUri,
  onClose,
  onApply,
}: CustomImageCropperModalProps) {
  const insets = useSafeAreaInsets();
  const screen = Dimensions.get('window');

  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({
    width: 1,
    height: 1,
  });

  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [selectedRatio, setSelectedRatio] = useState<number | null>(null);

  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoomRef = useRef<number>(1.0);
  const initialTouchDistRef = useRef<number | null>(null);
  const initialZoomAtTouchRef = useRef<number>(1.0);

  panRef.current = pan;
  zoomRef.current = zoom;

  const viewportWidth = screen.width - 32;
  const viewportHeight = Math.min(380, screen.height * 0.44);

  useEffect(() => {
    if (visible && imageUri) {
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setSelectedRatio(null);
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      setIsProcessing(false);

      Image.getSize(
        imageUri,
        (w, h) => {
          setNaturalSize({ width: Math.max(1, w), height: Math.max(1, h) });
        },
        (err) => {
          console.warn('[CustomImageCropperModal] Failed to get image size:', err);
          setNaturalSize({ width: 1000, height: 1000 });
        }
      );
    }
  }, [visible, imageUri]);

  const isRotated90 = rotation === 90 || rotation === 270;
  const effectiveW = isRotated90 ? naturalSize.height : naturalSize.width;
  const effectiveH = isRotated90 ? naturalSize.width : naturalSize.height;

  const activeRatio = selectedRatio !== null ? selectedRatio : effectiveW / effectiveH;

  const { cropW, cropH } = useMemo(() => {
    let w = viewportWidth;
    let h = w / activeRatio;
    if (h > viewportHeight) {
      h = viewportHeight;
      w = h * activeRatio;
    }
    return { cropW: Math.round(w), cropH: Math.round(h) };
  }, [viewportWidth, viewportHeight, activeRatio]);

  const { baseDisplayW, baseDisplayH } = useMemo(() => {
    const scale = Math.max(cropW / effectiveW, cropH / effectiveH);
    return {
      baseDisplayW: effectiveW * scale,
      baseDisplayH: effectiveH * scale,
    };
  }, [cropW, cropH, effectiveW, effectiveH]);

  const currentDisplayW = baseDisplayW * zoom;
  const currentDisplayH = baseDisplayH * zoom;

  const clampPan = (px: number, py: number, currentZ: number) => {
    const dispW = baseDisplayW * currentZ;
    const dispH = baseDisplayH * currentZ;
    const maxX = Math.max(0, (dispW - cropW) / 2);
    const maxY = Math.max(0, (dispH - cropH) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, px)),
      y: Math.max(-maxY, Math.min(maxY, py)),
    };
  };

  useEffect(() => {
    const clamped = clampPan(panRef.current.x, panRef.current.y, zoom);
    setPan(clamped);
  }, [zoom, cropW, cropH, baseDisplayW, baseDisplayH]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          if (evt.nativeEvent.touches.length === 2) {
            const [t1, t2] = evt.nativeEvent.touches;
            const dist = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
            initialTouchDistRef.current = dist;
            initialZoomAtTouchRef.current = zoomRef.current;
          } else {
            initialTouchDistRef.current = null;
          }
        },
        onPanResponderMove: (evt, gestureState) => {
          if (evt.nativeEvent.touches.length === 2 && initialTouchDistRef.current) {
            const [t1, t2] = evt.nativeEvent.touches;
            const dist = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
            const factor = dist / initialTouchDistRef.current;
            const newZoom = Math.max(1.0, Math.min(3.5, initialZoomAtTouchRef.current * factor));
            setZoom(newZoom);
          } else if (evt.nativeEvent.touches.length === 1) {
            const targetX = panRef.current.x + gestureState.dx;
            const targetY = panRef.current.y + gestureState.dy;
            const clamped = clampPan(targetX, targetY, zoomRef.current);
            setPan(clamped);
          }
        },
        onPanResponderRelease: () => {
          initialTouchDistRef.current = null;
        },
      }),
    [cropW, cropH, baseDisplayW, baseDisplayH]
  );

  const handleZoomIn = () => {
    setZoom((z) => Math.min(3.5, Number((z + 0.25).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(1.0, Number((z - 0.25).toFixed(2))));
  };

  const handleRotateRight = () => {
    setRotation((r) => (r + 90) % 360);
    setPan({ x: 0, y: 0 });
  };

  const handleRotateLeft = () => {
    setRotation((r) => (r - 90 + 360) % 360);
    setPan({ x: 0, y: 0 });
  };

  const handleReset = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setSelectedRatio(null);
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const handleApply = async () => {
    if (!imageUri || isProcessing) return;
    setIsProcessing(true);

    try {
      const preActions: ImageManipulator.Action[] = [];
      if (rotation !== 0) {
        preActions.push({ rotate: rotation });
      }
      if (flipH) {
        preActions.push({ flip: ImageManipulator.FlipType.Horizontal });
      }
      if (flipV) {
        preActions.push({ flip: ImageManipulator.FlipType.Vertical });
      }

      let currentUri = imageUri;
      let orientedW = naturalSize.width;
      let orientedH = naturalSize.height;

      if (preActions.length > 0) {
        const preResult = await ImageManipulator.manipulateAsync(
          imageUri,
          preActions,
          { format: ImageManipulator.SaveFormat.JPEG }
        );
        currentUri = preResult.uri;
        orientedW = preResult.width;
        orientedH = preResult.height;
      } else if (isRotated90) {
        orientedW = naturalSize.height;
        orientedH = naturalSize.width;
      }

      const imgLeft = (cropW - currentDisplayW) / 2 + pan.x;
      const imgTop = (cropH - currentDisplayH) / 2 + pan.y;

      const relX = Math.max(0, -imgLeft / currentDisplayW);
      const relY = Math.max(0, -imgTop / currentDisplayH);
      const relW = Math.min(1 - relX, cropW / currentDisplayW);
      const relH = Math.min(1 - relY, cropH / currentDisplayH);

      const originX = Math.max(0, Math.round(relX * orientedW));
      const originY = Math.max(0, Math.round(relY * orientedH));
      const finalW = Math.max(10, Math.min(orientedW - originX, Math.round(relW * orientedW)));
      const finalH = Math.max(10, Math.min(orientedH - originY, Math.round(relH * orientedH)));

      const cropResult = await ImageManipulator.manipulateAsync(
        currentUri,
        [
          {
            crop: {
              originX,
              originY,
              width: finalW,
              height: finalH,
            },
          },
        ],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );

      onApply(cropResult.uri);
      onClose();
    } catch (err) {
      console.error('[CustomImageCropperModal] Crop processing error:', err);
      onApply(imageUri);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  if (!visible || !imageUri) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View
        className="flex-1 bg-[#09090B] pt-5"
        style={{
          paddingBottom: Math.max(insets.bottom, 16),
        }}
      >
        <View className="px-5 py-3 flex-row items-center justify-between border-b border-[#2A2A2D]/60">
          <Pressable
            onPress={onClose}
            disabled={isProcessing}
            className="w-9 h-9 rounded-full bg-[#1C1C1E] items-center justify-center active:opacity-70"
          >
            <X size={18} color="#8E8E93" weight="bold" />
          </Pressable>

          <Text className="text-white text-base font-semibold tracking-tight">Edit Photo</Text>

          <Pressable
            onPress={handleApply}
            disabled={isProcessing}
            className="bg-[#D4FF00] px-4 py-2 rounded-full flex-row items-center gap-1.5 active:opacity-80"
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#09090B" />
            ) : (
              <>
                <Check size={16} color="#09090B" weight="bold" />
                <Text className="text-[#09090B] font-semibold text-sm tracking-wide">Apply</Text>
              </>
            )}
          </Pressable>
        </View>

        <View className="flex-1 items-center justify-center px-4">
          <View
            style={{ width: cropW, height: cropH }}
            className="relative bg-black rounded-xl overflow-hidden border-2 border-[#D4FF00]/80 shadow-2xl"
            {...panResponder.panHandlers}
          >
            <View
              style={{
                position: 'absolute',
                left: (cropW - currentDisplayW) / 2 + pan.x,
                top: (cropH - currentDisplayH) / 2 + pan.y,
                width: currentDisplayW,
                height: currentDisplayH,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Image
                source={{ uri: imageUri }}
                style={{
                  width: isRotated90 ? currentDisplayH : currentDisplayW,
                  height: isRotated90 ? currentDisplayW : currentDisplayH,
                  transform: [
                    { rotate: `${rotation}deg` },
                    { scaleX: flipH ? -1 : 1 },
                    { scaleY: flipV ? -1 : 1 },
                  ],
                }}
                resizeMode="contain"
              />
            </View>

            <View pointerEvents="none" className="absolute inset-0">
              <View className="absolute left-0 right-0 top-[33.3%] h-[1px] bg-white/25" />
              <View className="absolute left-0 right-0 top-[66.6%] h-[1px] bg-white/25" />
              <View className="absolute top-0 bottom-0 left-[33.3%] w-[1px] bg-white/25" />
              <View className="absolute top-0 bottom-0 left-[66.6%] w-[1px] bg-white/25" />

              <View className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#D4FF00]" />
              <View className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#D4FF00]" />
              <View className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#D4FF00]" />
              <View className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#D4FF00]" />
            </View>
          </View>

          <View className="flex-row items-center gap-4 mt-3 bg-[#1C1C1E] px-4 py-1.5 rounded-full border border-[#2A2A2D]/50">
            <Pressable
              onPress={handleZoomOut}
              className="p-1 active:opacity-70"
              disabled={zoom <= 1.0}
            >
              <MagnifyingGlassMinus size={18} color={zoom <= 1.0 ? '#555555' : '#FFFFFF'} />
            </Pressable>
            <Text className="text-white text-xs font-semibold w-10 text-center">
              {zoom.toFixed(1)}x
            </Text>
            <Pressable
              onPress={handleZoomIn}
              className="p-1 active:opacity-70"
              disabled={zoom >= 3.5}
            >
              <MagnifyingGlassPlus size={18} color={zoom >= 3.5 ? '#555555' : '#FFFFFF'} />
            </Pressable>
          </View>
        </View>

        <View className="px-5 pt-3 border-t border-[#2A2A2D]/60 bg-[#121214]">
          <View className="mb-3">
            <Text className="text-[#8E8E93] text-[11px] uppercase tracking-wider font-semibold mb-2">
              Aspect Ratio
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {ASPECT_RATIO_OPTIONS.map((opt) => {
                const isActive = selectedRatio === opt.ratio;
                return (
                  <Pressable
                    key={opt.label}
                    onPress={() => setSelectedRatio(opt.ratio)}
                    className={`px-3 py-1.5 rounded-xl border ${isActive
                      ? 'bg-[#D4FF00] border-[#D4FF00]'
                      : 'bg-[#1C1C1E] border-[#2A2A2D]'
                      } active:opacity-80`}
                  >
                    <Text
                      className={`text-xs font-semibold ${isActive ? 'text-[#09090B]' : 'text-white'
                        }`}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View className="flex-row items-center justify-around py-2 mb-3 bg-[#1C1C1E] rounded-2xl border border-[#2A2A2D]/50">
            <Pressable
              onPress={handleRotateLeft}
              className="items-center justify-center p-2 active:opacity-70"
            >
              <ArrowCounterClockwise size={22} color="#FFFFFF" />
              <Text className="text-[#8E8E93] text-[10px] mt-1 font-medium">Rotate -90°</Text>
            </Pressable>

            <Pressable
              onPress={handleRotateRight}
              className="items-center justify-center p-2 active:opacity-70"
            >
              <ArrowClockwise size={22} color="#FFFFFF" />
              <Text className="text-[#8E8E93] text-[10px] mt-1 font-medium">Rotate +90°</Text>
            </Pressable>

            <Pressable
              onPress={() => setFlipH((f) => !f)}
              className="items-center justify-center p-2 active:opacity-70"
            >
              <FlipHorizontal size={22} color={flipH ? '#D4FF00' : '#FFFFFF'} />
              <Text
                className={`text-[10px] mt-1 font-medium ${flipH ? 'text-[#D4FF00]' : 'text-[#8E8E93]'
                  }`}
              >
                Flip H
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setFlipV((f) => !f)}
              className="items-center justify-center p-2 active:opacity-70"
            >
              <FlipVertical size={22} color={flipV ? '#D4FF00' : '#FFFFFF'} />
              <Text
                className={`text-[10px] mt-1 font-medium ${flipV ? 'text-[#D4FF00]' : 'text-[#8E8E93]'
                  }`}
              >
                Flip V
              </Text>
            </Pressable>

            <Pressable
              onPress={handleReset}
              className="items-center justify-center p-2 active:opacity-70"
            >
              <ArrowUUpLeft size={22} color="#8E8E93" />
              <Text className="text-[#8E8E93] text-[10px] mt-1 font-medium">Reset</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleApply}
            disabled={isProcessing}
            className="w-full bg-[#D4FF00] py-3.5 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-90 shadow-lg shadow-[#D4FF00]/20 mb-1"
          >
            {isProcessing ? (
              <ActivityIndicator color="#09090B" />
            ) : (
              <>
                <Check size={20} color="#09090B" weight="bold" />
                <Text className="text-[#09090B] font-semibold text-base tracking-wide">Apply Changes</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

