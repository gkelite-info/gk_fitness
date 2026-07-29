import React, { useState, useCallback } from 'react';
import { View, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Package, Wrench, WarningCircle, Copy, CalendarBlank, ArrowUp, ArrowDown, CheckCircle, Prohibit, X, Minus, Plus, ArrowCircleRight, Gear, ArrowsClockwise } from 'phosphor-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchGymInventoryById } from '@/helpers/gymInventory/gymInventory';
import { fetchGymInventoryHistory } from '@/helpers/gymInventory/inventoryHistory';
import * as Clipboard from 'expo-clipboard';
import { toast } from '@/lib/toast';
import ReusableModal from '@/components/modal';
import { useUser } from '@/context/UserContext';

export default function EquipmentDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { userId } = useUser();
  const [equipment, setEquipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [updateStockVisible, setUpdateStockVisible] = useState(false);
  const [selectedAction, setSelectedAction] = useState('add');
  const [stockQuantity, setStockQuantity] = useState(1);

  const loadEquipment = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [data, historyData] = await Promise.all([
        fetchGymInventoryById(id as string),
        fetchGymInventoryHistory(id as string),
      ]);
      setEquipment(data);
      setHistory(historyData);
    } catch (error) {
      console.error('[EquipmentDetails] Error loading equipment:', error);
      toast.error('Failed to load equipment details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadEquipment();
    }, [loadEquipment])
  );

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    toast.success('ID copied to clipboard');
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator color="#D4F01E" size="large" />
      </View>
    );
  }

  if (!equipment) {
    return (
      <View className="flex-1 bg-[#0A0A0A]">
        <View className="px-5 pt-6 pb-4 flex-row items-center border-b border-[#161616]">
          <Pressable onPress={() => router.back()} className="w-12 h-12 rounded-xl border border-[#242424] items-center justify-center mr-4 active:opacity-70 bg-[#161616]">
            <ArrowLeft size={20} color="#fff" />
          </Pressable>
          <Text className="text-xl font-semibold text-white">Equipment Details</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-[#666] text-base">Equipment not found</Text>
        </View>
      </View>
    );
  }

  const q = equipment.quantity || 0;

  let underMaint = 0;
  let outOfService = 0;

  // Sort history logs from oldest to newest to ensure subtraction (restores) runs after addition
  const sortedLogs = [...history].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  sortedLogs.forEach(log => {
    if (log.action === 'maintenance') {
      underMaint += log.quantity;
    } else if (log.action === 'out_of_service') {
      outOfService += log.quantity;
    } else if (log.action === 'restore_maintenance') {
      underMaint = Math.max(0, underMaint - log.quantity);
    } else if (log.action === 'restore_out_of_service') {
      outOfService = Math.max(0, outOfService - log.quantity);
    }
  });

  const available = Math.max(0, q - underMaint - outOfService);

  const getTimelineItems = () => {
    const formatTimelineDate = (dateString: string) => {
      try {
        const d = new Date(dateString);
        const timeStr = d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        const dateStr = d.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

        return `${dateStr}, ${timeStr}`;
      } catch {
        return dateString;
      }
    };

    return history.map((log) => {
      let type = 'added';
      let title = 'Stock Added';
      let description = '';

      if (log.action === 'added' || log.action === 'add') {
        type = 'added';
        title = 'Stock Added';
        description = `Added ${log.quantity} unit${log.quantity > 1 ? 's' : ''}`;
      } else if (log.action === 'reduced' || log.action === 'reduce') {
        type = 'reduced';
        title = 'Stock Reduced';
        description = `Reduced ${log.quantity} unit${log.quantity > 1 ? 's' : ''}`;
      } else if (log.action === 'maintenance') {
        type = 'maintenance';
        title = 'Marked Under Maintenance';
        description = `${log.quantity} unit${log.quantity > 1 ? 's moved' : ' moved'} to maintenance`;
      } else if (log.action === 'out_of_service') {
        type = 'out_of_service';
        title = 'Marked Out of Service';
        description = `${log.quantity} unit${log.quantity > 1 ? 's marked' : ' marked'} out of service`;
      } else if (log.action === 'restore_maintenance') {
        type = 'added';
        title = 'Restored to Available';
        description = `${log.quantity} unit${log.quantity > 1 ? 's' : ''} restored from maintenance`;
      } else if (log.action === 'restore_out_of_service') {
        type = 'added';
        title = 'Restored to Available';
        description = `${log.quantity} unit${log.quantity > 1 ? 's' : ''} restored from out of service`;
      }

      return {
        id: log.historyId,
        type,
        title,
        description,
        date: formatTimelineDate(log.createdAt),
      };
    });
  };

  const timelineItems = getTimelineItems();

  return (
    <View className="flex-1 bg-[#0A0A0A] pb-20">
      <View className="px-5 pt-6 pb-4 flex-row items-center">
        <Pressable
          onPress={() => router.back()}
          className="w-12 h-12 rounded-xl border border-[#242424] items-center justify-center mr-4 active:opacity-70 bg-[#161616]"
        >
          <ArrowLeft size={20} color="#fff" />
        </Pressable>
        <View>
          <Text className="text-xl font-semibold text-white mb-0.5">Equipment Details</Text>
          <Text className="text-xs text-[#888]">View and manage equipment information</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <View className="bg-[#161616] rounded-3xl p-6 border border-[#242424] mb-6 flex-row items-center">
          {equipment.image ? (
            <Image
              source={{ uri: equipment.image }}
              className="w-24 h-24 rounded-2xl bg-[#242424]"
              resizeMode="cover"
            />
          ) : (
            <View className="w-24 h-24 rounded-2xl bg-[#242424] items-center justify-center border border-[#333]">
              <Package size={40} color="#666" />
            </View>
          )}

          <View className="flex-1 ml-5 justify-center">
            <View className="flex-row items-center mb-1">
              <Text className="text-xl font-semibold text-white mr-3 flex-shrink">{equipment.equipmentName}</Text>
              {equipment.is_Active && (
                <View className="bg-[#22C55E]/10 px-2 py-0.5 rounded-md border border-[#22C55E]/20">
                  <Text className="text-[#22C55E] text-[10px] font-semibold uppercase">Active</Text>
                </View>
              )}
            </View>

            <View className="flex-row items-center mb-3">
              <Text className="text-xs text-[#A0A0A0] font-semibold mr-2">ID: {equipment.gymInventoryId.substring(0, 8).toUpperCase()}</Text>
              <Pressable onPress={() => copyToClipboard(equipment.gymInventoryId)} className="active:opacity-70">
                <Copy size={14} color="#A0A0A0" />
              </Pressable>
            </View>

            <View className="flex-row items-center">
              <CalendarBlank size={16} color="#A0A0A0" />
              <Text className="text-xs text-[#A0A0A0] font-semibold ml-2 mr-3">Purchase Date</Text>
              <Text className="text-xs text-white font-semibold">{formatDate(equipment.purchaseDate)}</Text>
            </View>
          </View>
        </View>

        <View className="bg-[#161616] rounded-3xl p-5 border border-[#242424] mb-6">
          <Text className="text-base font-semibold text-white mb-5">Stock Overview</Text>
          <View className="flex-row justify-between">
            <View className="w-[23%] items-center">
              <Package size={24} color="#888" weight="regular" />
              <Text className="text-[10px] text-[#888] text-center mt-2 mb-1.5 h-6">Total Units</Text>
              <Text className="text-lg font-semibold text-white">{q}</Text>
            </View>
            <View className="w-[23%] items-center">
              <CheckCircle size={24} color="#D4F01E" weight="regular" />
              <Text className="text-[10px] text-[#888] text-center mt-2 mb-1.5 h-6">Available</Text>
              <Text className="text-lg font-semibold text-[#D4F01E]">{available}</Text>
            </View>
            <View className="w-[23%] items-center">
              <Wrench size={24} color="#F59E0B" weight="regular" />
              <Text className="text-[10px] text-[#888] text-center mt-2 mb-1.5 h-6 leading-3">Under{'\n'}Maintenance</Text>
              <Text className="text-lg font-semibold text-[#F59E0B]">{underMaint}</Text>
            </View>
            <View className="w-[23%] items-center">
              <Prohibit size={24} color="#EF4444" weight="regular" />
              <Text className="text-[10px] text-[#888] text-center mt-2 mb-1.5 h-6 leading-3">Out of{'\n'}Service</Text>
              <Text className="text-lg font-semibold text-[#EF4444]">{outOfService}</Text>
            </View>
          </View>
        </View>

        <View className="bg-[#161616] rounded-3xl p-5 border border-[#242424] mb-6">
          <Text className="text-base font-semibold text-white mb-5">Stock History (Latest)</Text>

          <View className="mt-2">
            {timelineItems.map((item, index) => {
              const isLast = index === timelineItems.length - 1;
              return (
                <View key={item.id} className="flex-row relative">
                  {!isLast && (
                    <View
                      className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-[#242424]"
                      style={{ zIndex: 0 }}
                    />
                  )}

                  <View className="items-center mr-4" style={{ zIndex: 1 }}>
                    <View className={`w-10 h-10 rounded-full border ${item.type === 'added' ? 'border-[#D4F01E]' :
                      item.type === 'reduced' ? 'border-[#EF4444]' :
                        item.type === 'maintenance' ? 'border-[#F59E0B]' :
                          'border-[#EF4444]'
                      } items-center justify-center bg-[#161616]`}>
                      {item.type === 'added' ? (
                        <ArrowUp size={18} color="#D4F01E" />
                      ) : item.type === 'reduced' ? (
                        <ArrowDown size={18} color="#EF4444" />
                      ) : item.type === 'maintenance' ? (
                        <Wrench size={18} color="#F59E0B" />
                      ) : (
                        <Prohibit size={18} color="#EF4444" />
                      )}
                    </View>
                  </View>

                  <View className="flex-1 pb-8 flex-row justify-between items-start">
                    <View className="flex-1 mr-2">
                      <Text className="text-white text-base font-semibold mb-0.5">{item.title}</Text>
                      <Text className="text-[#888] text-xs">{item.description}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[#888] text-xs font-semibold">{item.date}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View className="p-5 bg-[#0A0A0A] border-t border-[#161616] flex-row items-center justify-between">
          <Pressable
            onPress={() => router.push({ pathname: '/(owner)/dashboard/add-equipment', params: { id: equipment.gymInventoryId } })}
            className="flex-1 border border-[#D4F01E] rounded-lg py-3 items-center mr-3 active:opacity-70 bg-transparent"
          >
            <Text className="text-[#D4F01E] text-base font-semibold">Edit Equipment</Text>
          </Pressable>
          <Pressable
            onPress={() => setUpdateStockVisible(true)}
            className="flex-1 bg-[#D4F01E] rounded-lg py-3 items-center ml-3 active:opacity-70"
          >
            <Text className="text-black text-base font-semibold">Update Stock</Text>
          </Pressable>
        </View>
      </ScrollView>

      <ReusableModal
        visible={updateStockVisible}
        onClose={() => setUpdateStockVisible(false)}
        gymInventoryId={equipment.gymInventoryId}
        userId={userId || ''}
        onSuccess={loadEquipment}
        totalCount={q}
        underMaintCount={underMaint}
        outOfServiceCount={outOfService}
      />
    </View>
  );
}
