import { View, ScrollView, Image, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { ArrowRightIcon, CaretRightIcon, ClockIcon, HandWavingIcon, Check, Bell, LightningIcon, CalendarIcon, StarIcon, CheckCircleIcon } from 'phosphor-react-native';

export default function CustomerHome() {

  const cardsText = [
    { text: "Muscle Group" },
    { text: "Equipment" },
    { text: "Videos" },
    { text: "Saved" },
  ]

  const weeklyPlan = [
    { day: 'Mon', type: 'Push', status: 'active' },
    { day: 'Tue', type: 'Pull', status: 'completed' },
    { day: 'Wed', type: 'Legs', status: 'completed' },
    { day: 'Thu', type: 'Rest', status: 'rest' },
    { day: 'Fri', type: 'Push', status: 'completed' },
  ];

  const quikStartCards = [
    {
      icon: "",
      text: "Full Body Workout"
    },
    {
      icon: "",
      text: "Upper Body Workout"
    },
    {
      icon: "",
      text: "Lower Body Workout"
    },
    {
      icon: "",
      text: "Abs Workout"
    }
  ]

  return (
    <ScrollView className="flex-1 bg-background bg-[#0A0A0A]" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View className="items-start justify-start p-5 gap-3">
        <Text className="text-foreground text-sm text-[#8E8E8E]">
          Hi User <HandWavingIcon size={20} color='#FFCB3F' weight='fill' />
        </Text>
        <Text className="text-foreground text-sm text-white">
          Let's crush your <Text className='text-base font-semibold text-[#C4EF00]'>Muscle Gain</Text> goal today!
        </Text>
        <Text className="text-foreground text-sm text-[#8E8E8E]">
          Discipline today, strength tomorrow.
        </Text>

        <View className='border border-[#4B4B4B] bg-[#222222] rounded-full px-3 py-2 flex-row gap-2 items-center self-start'>
          <View className='h-4 w-4 rounded-full bg-[#C4EF00]'></View>
          <Text className='text-white text-sm'>Goal: Muscle Gain</Text>
          <CaretRightIcon size={17} color='white' />
        </View>

        <View className="w-full mt-5">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
          >
            {cardsText.map((item, index) => {
              return (
                <View className='border border-[#27272A] px-3 py-2 rounded-lg justify-center' key={index}>
                  <Text className='text-[#A1A1AA] text-sm'>{item.text}</Text>
                </View>
              )
            })}
          </ScrollView>
        </View>

        <View className='flex flex-row items-center justify-between gap-2 w-full mt-5 bg-[#191919] p-3 pb-0 rounded-xl'>
          <View className='w-[50%] h-full gap-3'>
            <Text className='text-[#C4EF00] text-xs'>TODAY'S WORKOUT</Text>
            <Text className='text-xl text-white'>Back & Biceps</Text>
            <View className='flex-row items-center gap-1'><ClockIcon size={15} color='#8E8E8E' /><Text className='text-[#8E8E8E] text-sm'>45 Mins</Text></View>
            <View className='flex-row items-center gap-1'><View className='h-2 w-2 rounded-full bg-[#C4EF00]'></View><Text className='text-[#8E8E8E] text-sm'>6 Exercises</Text></View>
            <View className='bg-[#C4EF00] p-2 flex-row items-center justify-center gap-3 w-fit rounded-lg'>
              <Text className='font-semibold'>Start Workout</Text><ArrowRightIcon size={17} />
            </View>
          </View>
          <View className='w-[50%]'>
            <Image
              source={require('../../assets/fit-1.png')}
              style={{ width: 180, height: 180 }}
              resizeMode='contain'
            />
          </View>
        </View>

        <View className='mt-5 w-full flex-row items-center justify-between'>
          <Text className='text-[#C4EF00] font-semibold'>WEEKLY WORKOUT PLAN</Text>
          <View className='flex-row items-center gap-2'>
            <Text className='text-[#8E8E8E] text-sm'>View Full Plan</Text>
            <Pressable>
              <CaretRightIcon size={15} color='#8E8E8E' />
            </Pressable>
          </View>
        </View>

        <View className='w-full mt-3'>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingVertical: 4, paddingRight: 20 }}
          >
            {weeklyPlan.map((item, index) => {
              const isActive = item.status === 'active';
              const isRest = item.status === 'rest';

              return (
                <View
                  key={index}
                  className={`items-center justify-center rounded-xl p-2 w-[85px] gap-3 ${isActive ? 'bg-[#C4EF00]' : 'border border-[#27272A] bg-[#111111]'
                    }`}
                >
                  <Text className={`font-semibold text-base ${isActive ? 'text-black' : 'text-[#8E8E8E]'}`}>
                    {item.day}
                  </Text>

                  {isActive && (
                    <View className="h-8 w-8 rounded-full bg-black items-center justify-center">
                      <Check size={16} color="white" weight="bold" />
                    </View>
                  )}

                  {!isActive && !isRest && (
                    <View className="h-8 w-8 rounded-full bg-[#242A00] items-center justify-center">
                      <Check size={16} color="#C4EF00" weight="bold" />
                    </View>
                  )}

                  {isRest && (
                    <View className="h-8 w-8 rounded-full items-center justify-center">
                      <Bell size={20} color="#8E8E8E" weight="fill" />
                    </View>
                  )}

                  <Text className={`font-bold text-base ${isActive ? 'text-black' : isRest ? 'text-[#8E8E8E]' : 'text-white'}`}>
                    {item.type}
                  </Text>
                </View>
              )
            })}
          </ScrollView>
          <View className="flex-row items-center justify-between mt-2">
            <Text className="text-[#8E8E8E] text-xs font-medium">6 of 7 completed</Text>
            <Text className="text-white text-xs font-bold">85%</Text>
          </View>
          <View className="w-full h-1.5 bg-[#27272A] rounded-full">
            <View className="h-full bg-[#C4EF00] rounded-full" style={{ width: '85%' }} />
          </View>
        </View>

        <View className='mt-5 w-full'>
          <Text className='text-white font-semibold'>QUICK START</Text>
          <View className='mt-3 flex-wrap flex-row justify-between'>
            {quikStartCards.map((item, index) => {
              return (
                <View className='bg-[#111111] w-[48%] mb-3 p-3 flex-row items-center rounded-xl border border-[#1D1D1D]' key={index}>
                  <View className='bg-[#C4EF00] h-9 w-9 rounded-xl items-center justify-center'>
                    {item.icon}
                  </View>
                  <View className='flex-1 px-2'>
                    <Text className='text-xs text-white font-semibold' numberOfLines={2}>{item.text}</Text>
                  </View>
                  <CaretRightIcon size={16} color='white' />
                </View>
              )
            })}
          </View>
        </View>
        <View className='mt-5 w-full flex-row items-center justify-between'>
          <View className='bg-[#111111] w-[48%] p-3 rounded-xl gap-1 w-full border border-[#1D1D1D]'>
            <Text className='text-[#C4EF00] font-semibold text-sm'>FEATURED PROGRAM</Text>
            <Text className='text-white font-semibold text-lg w-[80%]'>8 Week Mass Builder</Text>
            <View className='flex-row items-center gap-1'>
              <LightningIcon size={13} color='#8E8E8E' />
              <Text className='text-[#8E8E8E] text-sm'>Intermediate</Text>
            </View>
            <View className='flex-row items-center gap-1'>
              <CalendarIcon size={13} color='#8E8E8E' />
              <Text className='text-[#8E8E8E] text-sm'>4 Days/Week</Text>
            </View>
            <View className='flex-row justify-center items-center w-full bg-green-00'>
              <Pressable className='mt-2 bg-[#1D1D1D] px-4 py-2 rounded-lg'>
                <Text className='text-white text-sm font-semibold'>View Program</Text>
              </Pressable>
            </View>
          </View>

          <View className='bg-[#111111] w-[48%] p-3 rounded-xl gap-1 w-full border border-[#1D1D1D]'>
            <Text className='text-[#C4EF00] font-semibold text-sm'>DAILY CHALLENGE</Text>
            <Text className='text-white font-semibold text-lg w-[80%]'>Plank Hold Challenge</Text>
            <View className='flex-row items-center gap-1'>
              <ClockIcon size={13} color='#8E8E8E' />
              <Text className='text-[#8E8E8E] text-sm'>Hold for 2 min</Text>
            </View>
            <View className='flex-row items-center gap-1'>
              <StarIcon size={13} color='#8E8E8E' />
              <Text className='text-[#8E8E8E] text-xs'>Complete & earn 50 XP</Text>
            </View>
            <View className='flex-row justify-center items-center w-full bg-green-00'>
              <Pressable className='flex-row items-center gap-1 mt-2 bg-[#C4EF00] px-4 py-2 rounded-lg'>
                <Text className='text-black text-sm font-semibold'>View Program</Text>
                <CaretRightIcon size={15} />
              </Pressable>
            </View>
          </View>
        </View>

        <View className='bg-[#111111] border border-[#1D1D1D] mt-5 w-full p-4 rounded-lg flex flex-row justify-between'>
          <View className='bg-yellow-00 flex-row items-center justify-start'>
            <Image
              source={require('../../assets/workout.png')}
              style={{ height: 120, width: 120 }}
              resizeMode='contain'
            />
            <View>
              <Text className='text-white font-semibold'>Back & Biceps</Text>
              <View className='flex-row justify-between gap-2'>
                <Text className='text-xs text-[#8E8E8E]'>42 mins</Text>
                <Text className='text-xs text-[#8E8E8E]'>6 Exercises</Text>
              </View>
            </View>
          </View>
          <View className='bg-blue-00 flex flex-col items-center justify-center gap-1'>
            <Text className='text-[#8E8E8E] text-sm'>Yesterday</Text>
            <CheckCircleIcon size={25} weight='fill' color='#C4EF00' />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
