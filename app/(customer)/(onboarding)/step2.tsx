import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, Keyboard, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { SelectableCard } from '@/components/onboarding/SelectableCard';
import { Fire, Barbell, User, TrendUp, ChartBar } from 'phosphor-react-native';
import { useOnboarding } from './_OnboardingContext';
import { useOnboardingSkip } from '@/components/onboarding/OnboardingSkipModal';

const GOALS = [
  { id: 'loseweight', title: 'Lose Weight', description: 'Burn fat and get leaner', Icon: Fire },
  { id: 'buildmuscle', title: 'Build Muscle', description: 'Gain muscle and get stronger', Icon: Barbell },
  { id: 'stayfit', title: 'Stay Fit', description: 'Maintain fitness and overall health', Icon: User },
  { id: 'gainweight', title: 'Gain Weight', description: 'Healthy weight gain', Icon: TrendUp },
  { id: 'imporoveendurance', title: 'Improve Endurance', description: 'Boost stamina and performance', Icon: ChartBar },
];

export default function Step2() {
  const { data, updateData } = useOnboarding();
  const { SkipButton, SkipModal } = useOnboardingSkip();
  const [timeValue, setTimeValue] = useState(data.goalTimeframe ? data.goalTimeframe.split(' ')[0] : '');
  const [timeUnit, setTimeUnit] = useState<'weeks' | 'months'>(data.goalTimeframe && data.goalTimeframe.includes('month') ? 'months' : 'weeks');
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);
  const [isTimeframeFocused, setIsTimeframeFocused] = useState(false);
  const [isTargetWeightFocused, setIsTargetWeightFocused] = useState(false);
  const [timeframeY, setTimeframeY] = useState(0);
  const [targetWeightY, setTargetWeightY] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToTimeframe = () => {
    const targetY = timeframeY > 0 ? Math.max(0, timeframeY - 20) : undefined;
    setTimeout(() => {
      if (targetY !== undefined) {
        scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
      } else {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    }, 50);
    setTimeout(() => {
      if (targetY !== undefined) {
        scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
      } else {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    }, 150);
    setTimeout(() => {
      if (targetY !== undefined) {
        scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
      } else {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    }, 300);
  };

  const scrollToTargetWeight = () => {
    const targetY = targetWeightY > 0 ? Math.max(0, targetWeightY - 20) : undefined;
    setTimeout(() => {
      if (targetY !== undefined) {
        scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
      } else {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    }, 50);
    setTimeout(() => {
      if (targetY !== undefined) {
        scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
      } else {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    }, 150);
    setTimeout(() => {
      if (targetY !== undefined) {
        scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
      } else {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    }, 300);
  };

  const autoScrollToGap = () => {
    if (isTimeframeFocused) {
      scrollToTimeframe();
      return;
    }
    if (isTargetWeightFocused) {
      scrollToTargetWeight();
      return;
    }
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardActive(true);
      if (isTimeframeFocused) {
        scrollToTimeframe();
      } else if (isTargetWeightFocused) {
        scrollToTargetWeight();
      } else {
        autoScrollToGap();
      }
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardActive(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [isTimeframeFocused, isTargetWeightFocused, timeframeY, targetWeightY]);

  useEffect(() => {
    if (isKeyboardActive) {
      if (isTimeframeFocused) {
        scrollToTimeframe();
      } else if (isTargetWeightFocused) {
        scrollToTargetWeight();
      } else {
        autoScrollToGap();
      }
    }
  }, [isKeyboardActive, isTimeframeFocused, isTargetWeightFocused, timeframeY, targetWeightY]);

  const handleTimeValueChange = (val: string) => {
    setTimeValue(val);
    if (val) {
      updateData({ goalTimeframe: `${val} ${timeUnit}` });
    } else {
      updateData({ goalTimeframe: '' });
    }
  };

  const handleTimeUnitChange = (unit: 'weeks' | 'months') => {
    setTimeUnit(unit);
    if (timeValue) {
      updateData({ goalTimeframe: `${timeValue} ${unit}` });
    }
  };

  const handleContinue = () => {
    router.push('/(customer)/(onboarding)/step3');
  };

  const isValidOptionalNumber = (val: string) => {
    if (!val) return true;
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  };

  const currentWeight = parseFloat(data.weight);
  const hasCurrentWeight = !isNaN(currentWeight) && currentWeight > 0;

  const getTargetWeightError = (): string | null => {
    if (!data.targetWeight) return null;
    const target = parseFloat(data.targetWeight);
    if (isNaN(target) || target <= 0) {
      return 'Valid target weight required if provided';
    }
    if (hasCurrentWeight) {
      if (data.primaryGoal === 'loseweight' && target >= currentWeight) {
        return `Target weight must be less than your current weight (${currentWeight} kg)`;
      }
      if ((data.primaryGoal === 'buildmuscle' || data.primaryGoal === 'gainweight') && target <= currentWeight) {
        return `Target weight must be greater than your current weight (${currentWeight} kg)`;
      }
    }
    return null;
  };

  const targetWeightError = getTargetWeightError();
  const isTargetWeightValid = !targetWeightError;

  const isTimeframeValid = data.goalTimeframe !== '' && timeValue !== '' && isValidOptionalNumber(timeValue);
  const isFormValid = data.primaryGoal !== '' && isTimeframeValid && isTargetWeightValid;

  const Title = (
    <Text className="text-white text-3xl font-semibold mb-2">
      What's your{'\n'}<Text className="text-neon">fitness goal?</Text>
    </Text>
  );

  return (
    <>
      <OnboardingLayout
        currentStep={2}
        title={Title}
        description="Choose the goal that matters most to you. We'll personalize your plan around it."
        onContinue={handleContinue}
        isContinueDisabled={!isFormValid}
        headerRight={SkipButton}
        scrollViewRef={scrollViewRef}
        contentContainerStyle={{ paddingBottom: isTimeframeFocused ? 360 : (isKeyboardActive ? 220 : 120) }}
      >
        <Text className="text-white font-semibold mb-4">Select your primary goal <Text className="text-red-500">*</Text></Text>

        <View className="gap-3 mb-8">
          {GOALS.map((g) => (
            <SelectableCard
              key={g.id}
              selected={data.primaryGoal === g.id}
              onPress={() => updateData({ primaryGoal: g.id })}
              checkPosition="right"
            >
              <View className="flex-row items-center gap-4">
                <View className={`w-12 h-12 rounded-full items-center justify-center bg-[#1a1a1a] ${data.primaryGoal === g.id ? 'bg-neon/10' : ''}`}>
                  <g.Icon color={data.primaryGoal === g.id ? '#d4ff00' : '#888'} weight="regular" size={24} />
                </View>
                <View>
                  <Text className="text-white font-semibold text-lg mb-1">{g.title}</Text>
                  <Text className="text-gray-400 text-sm font-sans">{g.description}</Text>
                </View>
              </View>
            </SelectableCard>
          ))}
        </View>

        <View
          className="mb-10"
          onLayout={(e) => setTargetWeightY(e.nativeEvent.layout.y)}
        >
          <Text className="text-white mb-2 font-medium">Target Weight (Optional)</Text>
          <Text className="text-gray-500 text-xs mb-2 font-sans">
            {hasCurrentWeight ? `Current weight: ${currentWeight} kg. ` : ''}Set a target weight you want to achieve.
          </Text>
          <View className={`border rounded-xl p-4 bg-[#111] flex-row items-center justify-between ${targetWeightError ? 'border-red-500' : 'border-gray-800'}`}>
            <TextInput
              className="text-white flex-1 font-sans"
              placeholder="Enter target weight"
              placeholderTextColor="#666"
              value={data.targetWeight}
              onChangeText={(text) => {
                updateData({ targetWeight: text });
                scrollToTargetWeight();
              }}
              onFocus={() => {
                setIsTargetWeightFocused(true);
                scrollToTargetWeight();
              }}
              onBlur={() => {
                setIsTargetWeightFocused(false);
              }}
              keyboardType="numeric"
              maxLength={3}
            />
            <Text className="text-gray-500 font-sans">kg</Text>
          </View>
          {targetWeightError ? <Text className="text-red-500 text-xs mt-1 font-sans">{targetWeightError}</Text> : null}
        </View>

        <View
          className="mb-16"
          style={isKeyboardActive ? { paddingBottom: isTimeframeFocused ? 140 : 80 } : undefined}
          onLayout={(e) => setTimeframeY(e.nativeEvent.layout.y)}
        >
          <Text className="text-white font-semibold mb-2">Timeframe <Text className="text-red-500">*</Text></Text>
          <Text className="text-gray-500 text-xs mb-4 font-sans">When do you want to achieve this goal?</Text>
          <View className="flex-row items-center gap-3">
            <View className={`flex-1 h-[60px] border rounded-xl px-4 bg-[#111] flex-row items-center justify-center ${data.goalTimeframe === '' && timeValue === '' ? 'border-gray-800' : (isValidOptionalNumber(timeValue) ? 'border-[#C4EF00]' : 'border-red-500')}`}>
              <TextInput
                className="text-white flex-1 font-sans text-center text-lg"
                placeholder="e.g. 12"
                placeholderTextColor="#666"
                value={timeValue}
                onChangeText={(val) => {
                  handleTimeValueChange(val);
                  scrollToTimeframe();
                }}
                onFocus={() => {
                  setIsTimeframeFocused(true);
                  scrollToTimeframe();
                }}
                onBlur={() => {
                  setIsTimeframeFocused(false);
                }}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>

            <View className="flex-[1.5] flex-row bg-[#111] border border-gray-800 rounded-xl p-1 h-[60px]">
              <Pressable
                onPress={() => handleTimeUnitChange('weeks')}
                className={`flex-1 items-center justify-center rounded-lg ${timeUnit === 'weeks' ? 'bg-[#C4EF00]' : 'bg-transparent'}`}
              >
                <Text className={`font-semibold ${timeUnit === 'weeks' ? 'text-black' : 'text-gray-400'}`}>Weeks</Text>
              </Pressable>
              <Pressable
                onPress={() => handleTimeUnitChange('months')}
                className={`flex-1 items-center justify-center rounded-lg ${timeUnit === 'months' ? 'bg-[#C4EF00]' : 'bg-transparent'}`}
              >
                <Text className={`font-semibold ${timeUnit === 'months' ? 'text-black' : 'text-gray-400'}`}>Months</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </OnboardingLayout>
      {SkipModal}
    </>
  );
}
