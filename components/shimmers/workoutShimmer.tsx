import React from 'react';
import { View, ScrollView } from 'react-native';

export default function WorkoutShimmer() {
  return (
    <View className="flex-1 w-full animate-pulse mt-5">
      <View className='w-full flex-row items-center justify-between mb-4'>
        <View className="h-4 w-32 bg-[#27272A] rounded-md" />
        <View className="h-4 w-20 bg-[#27272A] rounded-md" />
      </View>

      <View className='w-full'>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingVertical: 4, paddingRight: 20 }}
        >
          {[1, 2, 3, 4, 5].map((item) => (
            <View
              key={item}
              className="items-center justify-center rounded-2xl py-3 px-1 w-[85px] gap-2.5 border border-[#27272A] bg-[#111111]"
            >
              <View className="h-3 w-8 bg-[#27272A] rounded-md" />
              <View className="h-9 w-9 rounded-full bg-[#1A1A1A] border border-[#27272A]" />
              <View className="h-3 w-10 bg-[#27272A] rounded-md" />
            </View>
          ))}
        </ScrollView>
        <View className="flex-row items-center justify-between mt-5">
          <View className="h-3 w-24 bg-[#27272A] rounded-md mb-1" />
          <View className="h-3 w-6 bg-[#27272A] rounded-md mb-1" />
        </View>
        <View className="w-full h-1.5 bg-[#27272A] rounded-full mt-1" />
      </View>

      <View className='flex flex-row items-center justify-between gap-2 w-full mt-5 bg-[#191919] p-3 pb-0 rounded-xl h-44'>
        <View className='w-[50%] h-full gap-2.5 pt-2 pb-4'>
          <View className="h-3 w-24 bg-[#27272A] rounded-md" />
          <View className="h-3 w-32 bg-[#27272A] rounded-md" />
          <View className="h-4 w-20 bg-[#27272A] rounded-md mt-2" />
          <View className="h-4 w-24 bg-[#27272A] rounded-md" />
          <View className="h-10 w-32 bg-[#27272A] rounded-xl mt-1" />
        </View>
        <View className='w-[50%] h-full items-end justify-end'>
          <View className="w-32 h-32 bg-[#27272A] rounded-2xl mb-2 mr-2" />
        </View>
      </View>

      <View className='mt-5 w-full'>
        {/* <View className="h-5 w-32 bg-[#27272A] rounded-md mb-3" /> */}
        <View className='mt-3 flex-wrap flex-row justify-between'>
          {[1, 2, 3, 4].map((item) => (
            <View
              key={item}
              className='bg-[#111111] w-[48%] mb-3 p-3 flex-row items-center rounded-xl border border-[#1D1D1D]'
            >
              <View className='h-9 w-9 rounded-xl bg-[#27272A]' />
              <View className='flex-1 px-2'>
                <View className="h-4 w-full bg-[#27272A] rounded-md" />
              </View>
              <View className="h-4 w-4 rounded-full bg-[#27272A]" />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
