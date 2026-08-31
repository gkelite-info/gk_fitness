import React, { useState } from 'react';
import { View, ScrollView, Pressable, Image, Modal } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, CheckCircle, Star, Users, Medal, Tag, ArrowRight, CaretDown } from 'phosphor-react-native';
import { startApprovalSimulation } from '@/constants/trainerStore';
import { StaticAvatar } from '@/components/ui/StaticAvatar';

export default function TrainerProfileScreen() {
  const { id, trainerData } = useLocalSearchParams<{ id: string, trainerData?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const trainer = trainerData ? JSON.parse(trainerData as string) : null;
  const [modalVisible, setModalVisible] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const handleBack = () => {
    router.push('/(customer)/trainer/book-trainer');
  }

  if (!trainer) {
    return (
      <View className="flex-1 bg-[#0F0F0F] justify-center items-center">
        <Text className="text-white">Trainer not found.</Text>
        <Pressable onPress={handleBack} className="mt-4 p-2 bg-[#1A1A1A] rounded-full">
          <Text className="text-[#D4FF00]">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const profilePhotoUrl = trainer.users?.profilePhoto || trainer.profilePhoto;
  const fullName = trainer.fullName || 'Unknown Trainer';
  const firstName = fullName.split(' ')[0];
  const isVerified = trainer.isVerified ?? true;
  const rating = trainer.rating || '4.5';
  const reviews = trainer.reviews || 0;
  const experience = trainer.experienceYears ?? trainer.experience ?? 0;
  const clientsCount = trainer.clients || 0;
  const bio = trainer.bio || trainer.about || `Passionate about helping people become the best version of themselves. Specializes in ${trainer.specialization || 'fitness'} with a focus on technique, consistency and long-term results.`;
  const expertise = trainer.expertise || [trainer.specialization || 'General Fitness'];

  const rawQualifications = trainer.qualification
    ? trainer.qualification.split(',').map((q: string) => q.trim()).filter(Boolean)
    : [];

  const certifications = rawQualifications.length > 0
    ? rawQualifications.map((q: string) => ({
      name: q.length > 5 ? 'CERT' : q,
      title: q,
      issuer: 'Professional Certification'
    }))
    : [{ name: 'ACE', title: 'ACE Certified', issuer: 'American Council on Exercise' }];
  const mockReviews = [
    {
      id: '1',
      name: 'Amit Verma',
      avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&auto=format&fit=crop&q=80',
      rating: 5,
      date: '2 weeks ago',
      comment: "Rahul's training and guidance changed my life. I gained so much confidence and strength. Highly recommended for anyone looking to transform their body."
    },
    {
      id: '2',
      name: 'Sneha Rao',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      rating: 5,
      date: '1 month ago',
      comment: "Amazing trainer! Very knowledgeable and patient. The workout plans were tailored exactly to my goals and I saw results within the first month."
    },
    {
      id: '3',
      name: 'Vikram Singh',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      rating: 4,
      date: '2 months ago',
      comment: "Pushes you to your limits but in a good way. The diet tips have also been super helpful. Great overall experience."
    }
  ];

  const reviewsToDisplay = showAllReviews ? mockReviews : [mockReviews[0]];

  return (
    <View className="flex-1 bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={handleBack} className="p-2 bg-[#1A1A1A] rounded-full">
          <CaretLeft size={20} color="#FFFFFF" weight="bold" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View className="items-center px-4 mb-6 mt-2">
          <View className="w-24 h-24 rounded-full overflow-hidden mb-4 border-2 border-[#1A1A1A]">
            <StaticAvatar
              uri={profilePhotoUrl}
              name={fullName}
              size={96}
              className="w-full h-full"
            />
          </View>

          <View className="flex-row items-center mb-1">
            <Text className="text-white text-xl font-semibold mr-1">{fullName}</Text>
            {isVerified && <CheckCircle size={18} color="#1DA1F2" weight="fill" />}
          </View>

          <Text className="text-[#D4FF00] text-sm font-semibold mb-2">{trainer.specialization || 'Fitness Coach'}</Text>

          <View className="flex-row items-center">
            <Star size={14} color="#D4FF00" weight="fill" />
            <Text className="text-white text-xs font-semibold ml-1">{rating}</Text>
            <Text className="text-[#8E8E93] text-xs ml-1">({reviews} Reviews)</Text>
          </View>
        </View>

        <View className="flex-row mx-4 mb-3 bg-[#1A1A1A] rounded-2xl p-4 border border-[#27272A] justify-between">
          <View className="items-center flex-1">
            <Medal size={24} color="#D4FF00" weight="regular" style={{ marginBottom: 8 }} />
            <Text className="text-white font-semibold">{experience}</Text>
            <Text className="text-[#8E8E93] text-[10px] mt-1">YEARS EXP.</Text>
          </View>
          <View className="w-[1px] h-full bg-[#27272A]" />
          <View className="items-center flex-1">
            <Users size={24} color="#5E5CE6" weight="regular" style={{ marginBottom: 8 }} />
            <Text className="text-white font-semibold">{clientsCount > 0 ? `${clientsCount}+` : 'New'}</Text>
            <Text className="text-[#8E8E93] text-[10px] mt-1">CLIENTS</Text>
          </View>
          <View className="w-[1px] h-full bg-[#27272A]" />
          <View className="items-center flex-1">
            <Medal size={24} color="#FF9F0A" weight="regular" style={{ marginBottom: 8 }} />
            <Text className="text-white font-semibold">{certifications[0]?.name || 'Cert'}</Text>
            <Text className="text-[#8E8E93] text-[10px] mt-1">CERTIFIED</Text>
          </View>
        </View>

        <View className="p-4 bg-[#0F0F0F]/90 border-t border-[#1A1A1A]">
          <Pressable
            onPress={() => {
              router.push({
                pathname: '/(customer)/trainer/trainer-request',
                params: { 
                  id: trainer.gymTrainerId || trainer.globalTrainerId || trainer.id, 
                  trainerName: fullName,
                  specializations: JSON.stringify(expertise)
                }
              });
            }}
            className="bg-[#CCFF00] py-4 rounded-full flex-row justify-center items-center shadow-lg"
            style={{ shadowColor: '#CCFF00', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 }}
          >
            <Text className="text-black text-base font-semibold mr-2">Choose {fullName} as My Trainer</Text>
            <ArrowRight size={18} color="#000000" weight="bold" />
          </Pressable>
        </View>

        <View className="flex-row mx-4 mb-8 bg-[#1A1A1A] rounded-2xl p-4 border border-[#27272A] justify-between items-center">
          <View className="flex-row items-center flex-1 justify-center">
            <Users size={16} color="#8E8E93" weight="regular" style={{ marginRight: 8 }} />
            <View>
              <Text className="text-white text-xs font-semibold">{clientsCount || 0} Members</Text>
              <Text className="text-[#8E8E93] text-[10px]">training with him</Text>
            </View>
          </View>
        </View>

        <View className="px-4 mb-8">
          <Text className="text-white text-lg font-semibold mb-3">About {firstName}</Text>
          <Text className="text-[#A1A1AA] text-sm leading-relaxed mb-2">
            {bio}
          </Text>
          <View className="flex-row items-center">
            <Text className="text-[#D4FF00] text-xs font-semibold mr-1">Read More</Text>
            <CaretDown size={12} color="#D4FF00" weight="bold" />
          </View>
        </View>

        <View className="mb-8">
          <View className="flex-row justify-between items-center px-4 mb-4">
            <Text className="text-white text-lg font-semibold">Expertise</Text>
            {/* <Text className="text-[#D4FF00] text-xs font-semibold">View All</Text> */}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
            {expertise.map((exp: string, index: number) => (
              <View key={index} className="bg-[#1A1A1A] border border-[#27272A] rounded-2xl p-4 items-center justify-center w-[100px] h-[100px]">
                <Medal size={24} color="#D4FF00" weight="regular" style={{ marginBottom: 8 }} />
                <Text className="text-[#8E8E93] text-[10px] text-center font-medium leading-tight">{exp}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View className="mb-8">
          <View className="flex-row justify-between items-center px-4 mb-4">
            <Text className="text-white text-lg font-semibold">Certifications</Text>
            {/* <Text className="text-[#D4FF00] text-xs font-semibold">View All</Text> */}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
            {certifications.map((cert: any, index: number) => (
              <View key={index} className="bg-[#1A1A1A] border border-[#27272A] rounded-2xl p-5 w-[160px] h-[140px] justify-center items-center">
                <Text className="text-white text-2xl font-semibold italic mb-3">{cert.name}</Text>
                <Text className="text-white text-xs font-semibold text-center mb-1">{cert.title}</Text>
                <Text className="text-[#6C6C70] text-[8px] text-center">{cert.issuer}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {trainer.transformations && trainer.transformations.length > 0 && (
          <View className="mb-8">
            <View className="flex-row justify-between items-center px-4 mb-4">
              <Text className="text-white text-lg font-semibold">Client Transformations</Text>
              {/* <Text className="text-[#D4FF00] text-xs font-semibold">View All</Text> */}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
              {trainer.transformations.map((trans: any) => (
                <View key={trans.id} className="bg-[#1A1A1A] border border-[#27272A] rounded-2xl overflow-hidden w-[280px]">
                  <View className="flex-row h-[200px] relative">
                    <Image source={{ uri: trans.before }} className="flex-1 h-full" />
                    <View className="w-[2px] h-full bg-black absolute left-1/2 -ml-[1px] z-10" />
                    <View className="absolute left-1/2 top-1/2 -ml-3 -mt-3 w-6 h-6 bg-black/80 rounded-full items-center justify-center z-20 border border-[#D4FF00]">
                      <ArrowRight size={10} color="#D4FF00" weight="bold" />
                    </View>
                    <Image source={{ uri: trans.after }} className="flex-1 h-full" />
                  </View>
                  <View className="p-3 items-center justify-center bg-[#111111]">
                    <Text className="text-[#D4FF00] text-xs font-semibold">{trans.label}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View className="mb-8">
          <View className="flex-row justify-between items-center px-4 mb-4">
            <Text className="text-white text-lg font-semibold">What Clients Say</Text>
            {!showAllReviews && mockReviews.length > 1 && (
              <Pressable onPress={() => setShowAllReviews(true)}>
                <Text className="text-[#D4FF00] text-xs font-semibold">View All</Text>
              </Pressable>
            )}
          </View>

          <View className="px-4 gap-4">
            {reviewsToDisplay.map((review) => (
              <View key={review.id} className="bg-[#1A1A1A] border border-[#27272A] rounded-2xl p-4">
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-row items-center">
                    <StaticAvatar uri={review.avatarUrl} name={review.name} size={40} className="w-10 h-10 rounded-full mr-3" />
                    <View>
                      <Text className="text-white font-semibold text-sm">{review.name}</Text>
                      <View className="flex-row mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            color={i < review.rating ? "#D4FF00" : "#333"}
                            weight="fill"
                            style={{ marginRight: 2 }}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                  <Text className="text-[#6C6C70] text-[10px]">{review.date}</Text>
                </View>
                <Text className="text-[#A1A1AA] text-xs leading-relaxed mt-1">
                  {review.comment}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
