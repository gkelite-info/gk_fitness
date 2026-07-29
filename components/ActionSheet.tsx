import React from 'react';
import { View, Pressable, Modal, Platform } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  options: string[];
  onSelect: (index: number) => void;
}

export function ActionSheet({ visible, onClose, title, options, onSelect }: ActionSheetProps) {
  const isAndroid = Platform.OS === 'android';

  return (
    <Modal
      animationType={isAndroid ? 'fade' : 'none'}
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      {visible && (
        <View className={`flex-1 bg-black/60 ${isAndroid ? 'justify-center items-center px-8' : 'justify-end px-4 pb-6'}`}>
          <Pressable className="absolute top-0 bottom-0 left-0 right-0" onPress={onClose} />

          {isAndroid ? (
            <View className="w-full max-w-[310px] bg-[#1E1E1E] rounded-3xl overflow-hidden border border-[#2E2E2E] shadow-2xl">
              {title && (
                <View className="pt-5 pb-3 items-center justify-center border-b border-[#2C2C2C]/40">
                  <Text className="text-[#A1A1AA] text-xs font-bold uppercase tracking-wider">{title}</Text>
                </View>
              )}

              <View className="px-2 py-1.5">
                {options.map((opt, idx) => (
                  <Pressable
                    key={opt}
                    onPress={() => {
                      onSelect(idx);
                      onClose();
                    }}
                    className="py-4 items-center justify-center active:bg-[#2C2C2C] rounded-2xl my-0.5"
                  >
                    <Text className="text-white text-base font-semibold">{opt}</Text>
                  </Pressable>
                ))}
              </View>

              <View className="border-t border-[#2C2C2C]/40 bg-[#161616]">
                <Pressable
                  onPress={onClose}
                  className="py-4 items-center justify-center active:bg-[#2C2C2C]"
                >
                  <Text className="text-[#CCF200] text-base font-bold">Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Animated.View
              entering={SlideInDown.duration(250)}
              exiting={SlideOutDown.duration(250)}
              className="w-full gap-3"
            >
              <View className="bg-[#161616] rounded-2xl overflow-hidden border border-[#242424]">
                {title && (
                  <View className="py-4 items-center justify-center border-b border-[#242424]">
                    <Text className="text-[#8E8E93] text-xs font-semibold uppercase tracking-wider">{title}</Text>
                  </View>
                )}

                {options.map((opt, idx) => (
                  <Pressable
                    key={opt}
                    onPress={() => {
                      onSelect(idx);
                      onClose();
                    }}
                    className="py-4.5 items-center justify-center active:bg-[#242424] border-b border-[#242424] last:border-b-0"
                  >
                    <Text className="text-white text-base font-semibold">{opt}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={onClose}
                className="w-full bg-[#161616] py-4.5 rounded-2xl items-center justify-center border border-[#242424] active:bg-[#242424]"
              >
                <Text className="text-[#CCF200] text-base font-bold">Cancel</Text>
              </Pressable>
            </Animated.View>
          )}
        </View>
      )}
    </Modal>
  );
}
