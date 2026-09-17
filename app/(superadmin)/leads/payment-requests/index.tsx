import { useState } from 'react';
import { View, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { CaretLeft, CurrencyInr, CheckCircle, FileText } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnverifiedPaymentRequests } from '@/hooks/paymentDetails/useUnverifiedPaymentRequests';
import { useVerifyOwnerPaymentDetails } from '@/hooks/paymentDetails/useVerifyOwnerPaymentDetails';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import ConfirmModal from '@/components/ConfirmModal';

export default function PaymentRequestsScreen() {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: requests, isLoading, refetch, isRefetching } = useUnverifiedPaymentRequests(activeTab === 'approved');
  const { mutate: verifyPaymentDetails, isPending: isVerifying } = useVerifyOwnerPaymentDetails();

  const handleVerifyConfirm = () => {
    if (!selectedRequest) {
      return;
    }

    verifyPaymentDetails(selectedRequest.paymentDetailsId, {
      onSuccess: (data) => {
        setModalVisible(false);
        setSelectedRequest(null);
        refetch();
      },
      onError: (error) => {
      }
    });
  };

  const renderItem = ({ item }: { item: any }) => (
    <Pressable
      className="bg-[#0F0F0F] border border-[#111827] rounded-2xl p-4 mb-3 active:opacity-70"
      onPress={() => {
        // We can navigate to a detail screen later if needed, for now just UI
      }}
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 pr-2">
          <Text className="text-white font-semibold text-base mb-1">{item.gym?.gymName || 'Unknown Gym'}</Text>
          <View className="flex-row items-center">
            <CurrencyInr size={14} color="#BEF227" />
            <Text className="text-[#888888] text-xs ml-1 font-medium">{item.primarySettlementMethod === 'upi' ? 'UPI Transfer' : 'Bank Transfer'}</Text>
          </View>
        </View>
        <View className={`px-3 py-1 rounded-full border ${activeTab === 'pending' ? 'bg-orange-500/10 border-orange-500/20' : 'bg-[#BEF227]/10 border-[#BEF227]/20'}`}>
          <Text className={`${activeTab === 'pending' ? 'text-orange-500' : 'text-[#BEF227]'} text-[10px] font-semibold uppercase`}>
            {activeTab === 'pending' ? 'Pending' : 'Approved'}
          </Text>
        </View>
      </View>

      <View className="bg-[#161616] rounded-xl p-3 mb-4 border border-[#1F293D]">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-[#888888] text-xs">Account Holder</Text>
          <Text className="text-white text-xs font-medium">{item.accountHolderName}</Text>
        </View>

        {item.primarySettlementMethod === 'bank' && (
          <>
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-[#888888] text-xs">Bank Name</Text>
              <Text className="text-white text-xs font-medium">{item.bankName}</Text>
            </View>
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-[#888888] text-xs">Account Number</Text>
              <Text className="text-white text-xs font-medium">{item.accountNumber}</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-[#888888] text-xs">IFSC Code</Text>
              <Text className="text-white text-xs font-medium">{item.ifscCode}</Text>
            </View>
          </>
        )}

        <View className={`flex-row justify-between items-center ${item.primarySettlementMethod === 'bank' ? 'mt-2 pt-2 border-t border-[#1F293D]' : ''}`}>
          <Text className="text-[#888888] text-xs">UPI ID</Text>
          <Text className="text-white text-xs font-medium">{item.upiId || 'N/A'}</Text>
        </View>
      </View>

      {activeTab === 'pending' && (
        <View className="flex-row justify-end gap-3 mt-2">
          <Pressable
            onPress={() => {
              setSelectedRequest(item);
              setModalVisible(true);
            }}
            className="bg-[#CCFF00] px-4 py-2 rounded-lg flex-row items-center justify-center active:opacity-70"
          >
            <CheckCircle size={16} color="#000000" weight="fill" />
            <Text className="text-black text-xs font-semibold ml-1.5">Verify</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <View style={{ paddingTop: insets.top }} className="px-4 pb-2 border-b border-[#111827]">
        <View className="flex-row items-center h-14">
          <Pressable
            onPress={() => router.push('/(superadmin)/dashboard')}
            className="w-10 h-10 items-center justify-center border border-[#1F293D] rounded-xl active:bg-[#1F293D]"
          >
            <CaretLeft size={20} color="#BEF227" weight="bold" />
          </Pressable>
          <View className="flex-1 ml-4">
            <Text className="text-white text-xl font-semibold">Payment Requests</Text>
            <Text className="text-[#888888] text-xs">Owner Details</Text>
          </View>
        </View>

        <View className="flex-row bg-[#0F0F0F] rounded-xl p-1 mt-4 gap-2">
          <Pressable
            onPress={() => setActiveTab('pending')}
            className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'pending' ? 'bg-[#D2F829]' : ''}`}
          >
            <Text className={`font-semibold ${activeTab === 'pending' ? 'text-black' : 'text-[#888888]'}`}>Pending</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('approved')}
            className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'approved' ? 'bg-[#D2F829]' : ''}`}
          >
            <Text className={`font-semibold ${activeTab === 'approved' ? 'text-black' : 'text-[#888888]'}`}>Approved</Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#BEF227" />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.paymentDetailsId}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
          refreshControl={
            <CustomRefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-20 mt-10">
              <FileText size={64} color="#1F293D" weight="light" />
              <Text className="text-white text-lg font-semibold mt-4">No Requests</Text>
              <Text className="text-[#888888] text-sm text-center mt-2 px-10">
                {activeTab === 'pending'
                  ? 'All payment details have been verified or there are no new requests.'
                  : 'There are no approved payment details yet.'}
              </Text>
            </View>
          }
        />
      )}

      <ConfirmModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedRequest(null);
        }}
        onConfirm={handleVerifyConfirm}
        title="Verify Payment Details"
        description="Are you sure you want to verify these payment details? Once verified, the owner will be able to receive payouts."
        confirmText="Verify"
        confirmButtonColor="bg-[#CCFF00]"
        confirmTextColor="text-black"
        isLoading={isVerifying}
        icon={
          <View className="w-12 h-12 rounded-full bg-[#CCFF00]/10 items-center justify-center border border-[#CCFF00]/20">
            <CheckCircle size={28} color="#CCFF00" weight="fill" />
          </View>
        }
      />
    </View>
  );
}
