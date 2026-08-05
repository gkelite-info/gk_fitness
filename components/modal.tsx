import React, { useState, useEffect } from 'react';
import { View, Pressable, Modal, ActivityIndicator, ScrollView } from 'react-native';
import { useUpdateGymInventoryStock } from '@/hooks/inventory/useMutateGymInventory';
import { toast } from '@/lib/toast';
import { Text } from '@/components/nativewindui/Text';
import {
  X,
  Minus,
  Plus,
  ArrowCircleRight,
  MinusCircle,
  Gear,
  Prohibit,
  ArrowsClockwise,
  Package
} from 'phosphor-react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

export interface UpdateStockModalProps {
  visible: boolean;
  onClose: () => void;
  gymInventoryId: string;
  userId: string;
  onSuccess?: () => void;
  totalCount: number;
  underMaintCount: number;
  outOfServiceCount: number;
}

export default function ReusableModal({ visible, onClose, gymInventoryId, userId, onSuccess, totalCount, underMaintCount, outOfServiceCount }: UpdateStockModalProps) {
  const [selectedAction, setSelectedAction] = useState('add');
  const [stockQuantity, setStockQuantity] = useState(1);
  const [renderModal, setRenderModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [restoreSource, setRestoreSource] = useState<'maintenance' | 'out_of_service'>('maintenance');
  
  const updateMutation = useUpdateGymInventoryStock();

  const handleConfirm = () => {
    updateMutation.mutate({
      gymInventoryId,
      userId,
      action: selectedAction,
      quantity: stockQuantity,
      restoreSource: selectedAction === 'restore' ? restoreSource : undefined
    }, {
      onSuccess: () => {
        toast.success('Stock updated');
        onSuccess?.();
        onClose();
      }
    });
  };

  const getQuantityLimit = () => {
    const availableCount = Math.max(0, totalCount - underMaintCount - outOfServiceCount);
    if (selectedAction === 'add') return 999;
    if (selectedAction === 'reduce') return totalCount;
    if (selectedAction === 'maintenance') return availableCount;
    if (selectedAction === 'out_of_service') return availableCount;
    if (selectedAction === 'restore') {
      return restoreSource === 'maintenance' ? underMaintCount : outOfServiceCount;
    }
    return 999;
  };

  const quantityLimit = getQuantityLimit();

  useEffect(() => {
    if (visible) {
      setRenderModal(true);
      setSelectedAction('add');
      setRestoreSource('maintenance');
    } else {
      const timer = setTimeout(() => setRenderModal(false), 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const limit = getQuantityLimit();
    if (limit === 0) {
      setStockQuantity(0);
    } else {
      setStockQuantity(prev => {
        if (prev > limit) return limit;
        if (prev < 1) return 1;
        return prev;
      });
    }
  }, [selectedAction, restoreSource, totalCount, underMaintCount, outOfServiceCount, visible]);

  if (!renderModal) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={renderModal}
      onRequestClose={onClose}
    >
      {visible && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          className="flex-1 bg-black/70 justify-end"
        >
          <Pressable className="absolute top-0 bottom-0 left-0 right-0" onPress={onClose} />

          <Animated.View
            entering={SlideInDown.duration(300)}
            exiting={SlideOutDown.duration(300)}
            className="bg-[#121214] rounded-t-3xl border-t border-[#27272A] max-h-[90%]"
          >
            <View className="w-10 h-1 bg-[#2C2C2E] rounded-full mx-auto my-3" />

            <View className="flex-row justify-between items-center px-6 pb-4 border-b border-[#27272A]">
              <View className="flex-1 mr-4">
                <Text className="text-white text-xl font-semibold mb-1">Update Stock</Text>
                <Text className="text-[#8E8E93] text-xs">Update the stock status for this equipment</Text>
              </View>
              <Pressable
                onPress={onClose}
                className="w-10 h-10 bg-[#27272A] rounded-full items-center justify-center active:opacity-75"
              >
                <X size={20} color="#fff" />
              </Pressable>
            </View>

            <ScrollView
              className="px-6 pt-4"
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              <Text className="text-white font-semibold mb-4 text-sm">Select Action</Text>

              <Pressable
                onPress={() => setSelectedAction('add')}
                className={`flex-row items-center border ${selectedAction === 'add' ? 'border-[#D4F01E] bg-[#1a1a1a]' : 'border-[#27272A]'} p-4 rounded-xl mb-3`}
              >
                <View className={`w-10 h-10 rounded-full bg-[#27272A] items-center justify-center mr-4 ${selectedAction === 'add' ? 'opacity-100' : 'opacity-60'}`}>
                  <ArrowCircleRight size={24} color={selectedAction === 'add' ? '#fff' : '#8E8E93'} />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-base">Add New Units</Text>
                  <Text className="text-[#8E8E93] text-xs mt-1">Increase the total number of units</Text>
                </View>
                <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${selectedAction === 'add' ? 'border-[#D4F01E]' : 'border-[#555]'}`}>
                  {selectedAction === 'add' && <View className="w-2.5 h-2.5 rounded-full bg-[#D4F01E]" />}
                </View>
              </Pressable>

              <Pressable
                onPress={() => setSelectedAction('reduce')}
                className={`flex-row items-center border ${selectedAction === 'reduce' ? 'border-[#D4F01E] bg-[#1a1a1a]' : 'border-[#27272A]'} p-4 rounded-xl mb-3`}
              >
                <View className={`w-10 h-10 rounded-full bg-[#27272A] items-center justify-center mr-4 ${selectedAction === 'reduce' ? 'opacity-100' : 'opacity-60'}`}>
                  <MinusCircle size={24} color={selectedAction === 'reduce' ? '#EF4444' : '#8E8E93'} />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-base">Reduce Units</Text>
                  <Text className="text-[#8E8E93] text-xs mt-1">Decrease the total number of units</Text>
                </View>
                <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${selectedAction === 'reduce' ? 'border-[#D4F01E]' : 'border-[#555]'}`}>
                  {selectedAction === 'reduce' && <View className="w-2.5 h-2.5 rounded-full bg-[#D4F01E]" />}
                </View>
              </Pressable>

              <Pressable
                onPress={() => setSelectedAction('maintenance')}
                className={`flex-row items-center border ${selectedAction === 'maintenance' ? 'border-[#D4F01E] bg-[#1a1a1a]' : 'border-[#27272A]'} p-4 rounded-xl mb-3`}
              >
                <View className={`w-10 h-10 rounded-full bg-[#27272A] items-center justify-center mr-4 ${selectedAction === 'maintenance' ? 'opacity-100' : 'opacity-60'}`}>
                  <Gear size={24} color={selectedAction === 'maintenance' ? '#F97316' : '#8E8E93'} />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-base">Move to Maintenance</Text>
                  <Text className="text-[#8E8E93] text-xs mt-1">Move units to under maintenance</Text>
                </View>
                <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${selectedAction === 'maintenance' ? 'border-[#D4F01E]' : 'border-[#555]'}`}>
                  {selectedAction === 'maintenance' && <View className="w-2.5 h-2.5 rounded-full bg-[#D4F01E]" />}
                </View>
              </Pressable>

              <Pressable
                onPress={() => setSelectedAction('out_of_service')}
                className={`flex-row items-center border ${selectedAction === 'out_of_service' ? 'border-[#D4F01E] bg-[#1a1a1a]' : 'border-[#27272A]'} p-4 rounded-xl mb-3`}
              >
                <View className={`w-10 h-10 rounded-full bg-[#27272A] items-center justify-center mr-4 ${selectedAction === 'out_of_service' ? 'opacity-100' : 'opacity-60'}`}>
                  <Prohibit size={24} color={selectedAction === 'out_of_service' ? '#EF4444' : '#8E8E93'} />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-base">Mark Out of Service</Text>
                  <Text className="text-[#8E8E93] text-xs mt-1">Mark units as out of service</Text>
                </View>
                <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${selectedAction === 'out_of_service' ? 'border-[#D4F01E]' : 'border-[#555]'}`}>
                  {selectedAction === 'out_of_service' && <View className="w-2.5 h-2.5 rounded-full bg-[#D4F01E]" />}
                </View>
              </Pressable>

              <Pressable
                onPress={() => setSelectedAction('restore')}
                className={`flex-row items-center border ${selectedAction === 'restore' ? 'border-[#D4F01E] bg-[#1a1a1a]' : 'border-[#27272A]'} p-4 rounded-xl mb-6`}
              >
                <View className={`w-10 h-10 rounded-full bg-[#27272A] items-center justify-center mr-4 ${selectedAction === 'restore' ? 'opacity-100' : 'opacity-60'}`}>
                  <ArrowsClockwise size={24} color={selectedAction === 'restore' ? '#3B82F6' : '#8E8E93'} />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-base">Restore to Available</Text>
                  <Text className="text-[#8E8E93] text-xs mt-1">Move units back to available</Text>
                </View>
                <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${selectedAction === 'restore' ? 'border-[#D4F01E]' : 'border-[#555]'}`}>
                  {selectedAction === 'restore' && <View className="w-2.5 h-2.5 rounded-full bg-[#D4F01E]" />}
                </View>
              </Pressable>

              {selectedAction === 'restore' && (
                <View className="mb-6">
                  <Text className="text-white font-semibold mb-3 text-sm">Restore Source</Text>
                  <View className="flex-row gap-3">
                    <Pressable
                      onPress={() => setRestoreSource('maintenance')}
                      className={`flex-1 flex-row items-center border ${restoreSource === 'maintenance' ? 'border-[#D4F01E] bg-[#1a1a1a]' : 'border-[#27272A]'
                        } p-3 rounded-xl`}
                    >
                      <View className="flex-1">
                        <Text className="text-white font-semibold text-xs">Under Maint.</Text>
                        <Text className="text-[#8E8E93] text-[10px] mt-0.5">{underMaintCount} units</Text>
                      </View>
                      <View className={`w-4 h-4 rounded-full border items-center justify-center ${restoreSource === 'maintenance' ? 'border-[#D4F01E]' : 'border-[#555]'
                        }`}>
                        {restoreSource === 'maintenance' && <View className="w-2 h-2 rounded-full bg-[#D4F01E]" />}
                      </View>
                    </Pressable>

                    <Pressable
                      onPress={() => setRestoreSource('out_of_service')}
                      className={`flex-1 flex-row items-center border ${restoreSource === 'out_of_service' ? 'border-[#D4F01E] bg-[#1a1a1a]' : 'border-[#27272A]'
                        } p-3 rounded-xl`}
                    >
                      <View className="flex-1">
                        <Text className="text-white font-semibold text-xs">Out of Service</Text>
                        <Text className="text-[#8E8E93] text-[10px] mt-0.5">{outOfServiceCount} units</Text>
                      </View>
                      <View className={`w-4 h-4 rounded-full border items-center justify-center ${restoreSource === 'out_of_service' ? 'border-[#D4F01E]' : 'border-[#555]'
                        }`}>
                        {restoreSource === 'out_of_service' && <View className="w-2 h-2 rounded-full bg-[#D4F01E]" />}
                      </View>
                    </Pressable>
                  </View>
                </View>
              )}

              <Text className="text-white font-semibold mt-2 mb-4 text-sm">Quantity</Text>

              <View className="flex-row items-center mb-6">
                <View className="flex-row items-center bg-[#1a1a1a] border border-[#27272A] rounded-xl p-1 mr-4">
                  <Pressable
                    className="w-12 h-12 bg-[#27272A] rounded-lg items-center justify-center active:opacity-70 disabled:opacity-30"
                    disabled={stockQuantity <= 1}
                    onPress={() => setStockQuantity(Math.max(1, stockQuantity - 1))}
                  >
                    <Minus size={20} color="#fff" />
                  </Pressable>
                  <Text className="text-white text-lg font-semibold w-16 text-center">{stockQuantity}</Text>
                  <Pressable
                    className="w-12 h-12 bg-[#27272A] rounded-lg items-center justify-center active:opacity-70 disabled:opacity-30"
                    disabled={stockQuantity >= quantityLimit}
                    onPress={() => setStockQuantity(Math.min(quantityLimit, stockQuantity + 1))}
                  >
                    <Plus size={20} color="#fff" />
                  </Pressable>
                </View>
                <Text className="text-[#8E8E93] text-xs flex-1 leading-5">
                  {quantityLimit === 0 ? 'No units available to perform this action' : `Enter number of units\n(Max: ${quantityLimit})`}
                </Text>
              </View>

              <Pressable
                onPress={handleConfirm}
                disabled={stockQuantity < 1 || updateMutation.isPending}
                className={`w-full ${stockQuantity < 1 || updateMutation.isPending ? 'bg-[#D4F01E]/50' : 'bg-[#D4F01E] active:opacity-75'} rounded-xl py-4 items-center justify-center flex-row mb-4`}
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator color="black" />
                ) : (
                  <>
                    <Package size={20} color="#000" weight="fill" />
                    <Text className="text-black font-semibold text-base ml-2">Update Stock</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      )}
    </Modal>
  );
}