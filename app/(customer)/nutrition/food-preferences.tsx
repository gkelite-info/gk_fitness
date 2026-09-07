import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import {
  CaretLeft,
  Leaf,
  Sun,
  Globe,
  XCircle,
  CheckCircle,
  X,
  CaretDown,
  CaretRight,
  Plant,
  Egg,
  FishSimple,
  ChartPieSlice
} from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { fetchCustomerOnboarding, updateCustomerOnboarding } from '@/helpers/onboardingHelper';

export default function FoodPreferences() {
  const router = useRouter();
  const { userId } = useUser();

  const handleBack = () => {
    router.back();
  };

  const [selectedDiet, setSelectedDiet] = useState('Non-Vegetarian');
  const [selectedMeals, setSelectedMeals] = useState('4 Meals');
  const [selectedCuisine, setSelectedCuisine] = useState('No Preference');
  const [calorieSpread, setCalorieSpread] = useState<Record<string, string>>({
    BREAKFAST: 'Medium',
    LUNCH: 'Medium',
    SNACK: 'Medium',
    DINNER: 'Medium',
  });
  const [newAllergy, setNewAllergy] = useState('');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [onboardingId, setOnboardingId] = useState<string | null>(null);
  const [onboardingFullData, setOnboardingFullData] = useState<any>(null);

  // Modal states
  const [showCuisineModal, setShowCuisineModal] = useState(false);
  const [showSpreadModal, setShowSpreadModal] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchCustomerOnboarding(userId).then(data => {
        if (data) {
          setOnboardingFullData(data);
          setOnboardingId(data.onboardingId || null);
          if (data.dietType) setSelectedDiet(data.dietType);
          if (data.mealsPerDay) setSelectedMeals(`${data.mealsPerDay} Meals`);
          if (data.foodAllergies) setAllergies(data.foodAllergies);
          if (data.preferredCuisine) setSelectedCuisine(data.preferredCuisine);
          if (data.calorieDistribution) {
            try {
              const parsed = JSON.parse(data.calorieDistribution);
              if (typeof parsed === 'object' && parsed.BREAKFAST) {
                setCalorieSpread(parsed);
              }
            } catch (e) {
              // Ignore parse error and keep default
            }
          }
        }
        setLoading(false);
      });
    }
  }, [userId]);

  const diets = [
    { name: 'Vegetarian', icon: Leaf },
    { name: 'Vegan', icon: Plant },
    { name: 'Eggetarian', icon: Egg },
    { name: 'Non-Vegetarian', icon: FishSimple },
  ];

  const mealOptions = ['3 Meals', '4 Meals', '5 Meals', '6 Meals'];
  const cuisines = ['No Preference', 'Indian', 'Continental', 'Mexican', 'Italian', 'Healthy'];

  const commonAllergies = ['Milk', 'Peanuts', 'Soy', 'Seafood', 'Gluten', 'Tree Nuts', 'Eggs'];

  const removeAllergy = (name: string) => {
    setAllergies(allergies.filter(a => a !== name));
  };

  const addAllergy = (nameStr: string = newAllergy) => {
    if (!nameStr.trim()) return;

    const newItems = nameStr
      .split(',')
      .map(item => item.trim())
      .filter(item => item !== '' && !allergies.includes(item));

    if (newItems.length > 0) {
      setAllergies([...allergies, ...newItems]);
    }
    if (nameStr === newAllergy) {
      setNewAllergy('');
    }
  };

  const handleContinue = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const payload = {
        ...(onboardingFullData || {}),
        createdBy: userId,
        dietType: selectedDiet,
        mealsPerDay: parseInt(selectedMeals.split(' ')[0]),
        foodAllergies: allergies,
        preferredCuisine: selectedCuisine,
        calorieDistribution: JSON.stringify(calorieSpread)
      };

      if (onboardingId) {
        payload.onboardingId = onboardingId;
        await updateCustomerOnboarding(payload);
      } else {
        throw new Error("No existing onboarding record found to update.");
      }

      router.push('/(customer)/nutrition/generating-plan');
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#C4EF00" />
      </View>
    );
  }

  // Custom Bottom Sheet style Modal
  const renderDropdownModal = (
    visible: boolean, 
    setVisible: (v: boolean) => void, 
    title: string, 
    options: string[], 
    selectedValue: string, 
    onSelect: (v: string) => void
  ) => (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/80 justify-end">
        <Pressable className="flex-1" onPress={() => setVisible(false)} />
        <View className="bg-[#141414] rounded-t-[32px] border-t border-[#2A2A2A] p-6 pb-12">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-white text-xl font-bold">{title}</Text>
            <Pressable onPress={() => setVisible(false)} className="w-8 h-8 rounded-full bg-[#2A2A2A] items-center justify-center">
              <X size={16} color="#8E8E93" />
            </Pressable>
          </View>
          {options.map((option, idx) => {
            const isSelected = selectedValue === option;
            return (
              <Pressable
                key={idx}
                onPress={() => {
                  onSelect(option);
                  setVisible(false);
                }}
                className={`flex-row items-center justify-between py-4 border-b border-[#222222] ${idx === options.length - 1 ? 'border-b-0' : ''}`}
              >
                <Text className={`text-base font-medium ${isSelected ? 'text-[#C4EF00]' : 'text-white'}`}>
                  {option}
                </Text>
                {isSelected && <CheckCircle size={20} color="#C4EF00" weight="fill" />}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );

  return (
    <View className="flex-1 bg-[#0A0A0A] pb-28">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={handleBack} className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#222222] items-center justify-center mb-6 active:opacity-80">
          <CaretLeft size={20} color="#FFFFFF" />
        </Pressable>

        <Text className="text-white text-[40px] leading-[44px] font-semibold tracking-tight">Your Food</Text>
        <Text className="text-[#C4EF00] text-[40px] leading-[44px] font-semibold tracking-tight mb-4">Preferences</Text>

        <Text className="text-[#8E8E93] text-[13px] leading-5 mb-8">
          Help us personalize your meal plan based on your choices.
        </Text>

        {/* Diet Preference */}
        <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mb-4">
          <View className="flex-row items-center gap-4 mb-5">
            <View className="w-10 h-10 rounded-xl bg-[#2A2A2A] items-center justify-center">
              <Leaf size={20} color="#C4EF00" weight="fill" />
            </View>
            <View>
              <Text className="text-white text-base font-semibold mb-0.5">Diet Preference</Text>
              <Text className="text-[#8E8E93] text-xs">Choose your diet type</Text>
            </View>
          </View>

          <View className="flex-row justify-between">
            {diets.map((diet, index) => {
              const Icon = diet.icon;
              const isSelected = selectedDiet === diet.name;
              return (
                <Pressable
                  key={index}
                  onPress={() => setSelectedDiet(diet.name)}
                  className={`w-[23%] aspect-[3/4] rounded-2xl items-center justify-center border ${isSelected ? 'border-[#C4EF00] bg-[#1A2E00]' : 'border-[#2A2A2A] bg-transparent'} relative`}
                >
                  <Icon size={24} color={isSelected ? "#C4EF00" : "#8E8E93"} weight={isSelected ? "fill" : "regular"} style={{ marginBottom: 8 }} />
                  <Text className={`text-[10px] text-center font-medium ${isSelected ? 'text-[#C4EF00]' : 'text-[#8E8E93]'}`}>
                    {diet.name.replace('-', '-\n')}
                  </Text>
                  {isSelected && (
                    <View className="absolute -top-2 -right-2 bg-black rounded-full">
                      <CheckCircle size={18} color="#C4EF00" weight="fill" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Meals Per Day */}
        <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mb-4">
          <View className="flex-row items-center gap-4 mb-5">
            <View className="w-10 h-10 rounded-xl bg-[#2A2A2A] items-center justify-center">
              <Sun size={20} color="#C4EF00" weight="fill" />
            </View>
            <View>
              <Text className="text-white text-base font-semibold mb-0.5">Meals Per Day</Text>
              <Text className="text-[#8E8E93] text-xs">How many meals do you prefer?</Text>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-3">
            {mealOptions.map((meal, index) => {
              const isSelected = selectedMeals === meal;
              return (
                <Pressable
                  key={index}
                  onPress={() => setSelectedMeals(meal)}
                  className={`py-3 px-5 rounded-[14px] border ${isSelected ? 'border-[#C4EF00] bg-[#1A2E00]' : 'border-[#2A2A2A] bg-[#1A1A1A]'} relative`}
                >
                  <Text className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-[#8E8E93]'}`}>
                    {meal}
                  </Text>
                  {isSelected && (
                    <View className="absolute -top-2 -right-2 bg-black rounded-full">
                      <CheckCircle size={18} color="#C4EF00" weight="fill" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Calorie Spread (New) */}
        <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mb-4">
          <View className="flex-row items-center gap-4 mb-5">
            <View className="w-10 h-10 rounded-xl bg-[#2A2A2A] items-center justify-center">
              <ChartPieSlice size={20} color="#C4EF00" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-base font-semibold mb-0.5">Calorie Spread</Text>
              <Text className="text-[#8E8E93] text-[11px] leading-4">Distribute your daily calories</Text>
            </View>
          </View>
          
          <View className="flex-row items-center justify-between mb-3 px-2">
            <View className="flex-1"></View>
            <Text className="text-[#8E8E93] text-[10px] w-12 text-center">Light</Text>
            <Text className="text-[#8E8E93] text-[10px] w-12 text-center">Med</Text>
            <Text className="text-[#8E8E93] text-[10px] w-12 text-center">Heavy</Text>
          </View>

          {['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'].map((mealStr, index) => (
            <View key={mealStr} className={`flex-row items-center justify-between px-2 py-3 ${index !== 3 ? 'border-b border-[#222222]' : ''}`}>
              <Text className="text-white text-xs font-semibold flex-1 capitalize">{mealStr.toLowerCase()}</Text>
              {['Light', 'Medium', 'Heavy'].map(level => {
                const isSelected = calorieSpread[mealStr] === level;
                return (
                  <Pressable 
                    key={level}
                    onPress={() => setCalorieSpread({...calorieSpread, [mealStr]: level})}
                    className={`w-10 h-6 rounded-full mx-1 items-center justify-center border ${isSelected ? 'border-[#C4EF00] bg-[#C4EF00]/20' : 'border-[#333333] bg-transparent'}`}
                  >
                    {isSelected && <CheckCircle size={14} color="#C4EF00" weight="fill" />}
                  </Pressable>
                )
              })}
            </View>
          ))}
        </View>

        {/* Preferred Cuisine */}
        <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-4 flex-1 pr-2">
            <View className="w-10 h-10 rounded-xl bg-[#2A2A2A] items-center justify-center">
              <Globe size={20} color="#C4EF00" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-base font-semibold mb-0.5">Preferred Cuisine</Text>
              <Text className="text-[#8E8E93] text-[11px] leading-4">Select the cuisine you enjoy most</Text>
            </View>
          </View>
          <Pressable onPress={() => setShowCuisineModal(true)} className="bg-[#222222] rounded-xl py-2.5 px-4 flex-row items-center justify-between min-w-[130px]">
            <Text className="text-white text-xs mr-4 font-medium">{selectedCuisine}</Text>
            <CaretDown size={14} color="#8E8E93" />
          </Pressable>
        </View>

        {/* Food Allergies */}
        <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mb-4">
          <View className="flex-row items-center gap-4 mb-5">
            <View className="w-10 h-10 rounded-xl bg-[#2A2A2A] items-center justify-center">
              <XCircle size={20} color="#C4EF00" weight="fill" />
            </View>
            <View>
              <Text className="text-white text-base font-semibold mb-0.5">Food Allergies</Text>
              <Text className="text-[#8E8E93] text-xs">Select any allergies you have</Text>
            </View>
          </View>

          <View className="bg-[#1E1E1E] rounded-[16px] px-4 py-3.5 mb-4 flex-row items-center">
            <TextInput
              placeholder="Type allergy and press Add"
              placeholderTextColor="#8E8E93"
              className="flex-1 text-white text-sm"
              value={newAllergy}
              onChangeText={setNewAllergy}
              onSubmitEditing={() => addAllergy(newAllergy)}
            />
            <Pressable onPress={() => addAllergy(newAllergy)} className="ml-2 bg-[#2A2A2A] px-3 py-1.5 rounded-lg">
              <Text className="text-[#C4EF00] text-xs font-semibold">Add</Text>
            </Pressable>
          </View>

          <View className="flex-row flex-wrap gap-2.5 mb-4">
            {commonAllergies.map((allergy, idx) => {
              const isSelected = allergies.includes(allergy);
              return (
                <Pressable
                  key={idx}
                  onPress={() => isSelected ? removeAllergy(allergy) : addAllergy(allergy)}
                  className={`rounded-full py-2 px-3 flex-row items-center border ${isSelected ? 'border-[#C4EF00] bg-[#C4EF00]/10' : 'border-[#2A2A2A] bg-transparent'}`}
                >
                  <Text className={`text-[11px] font-medium ${isSelected ? 'text-[#C4EF00]' : 'text-[#8E8E93]'}`}>
                    {allergy}
                  </Text>
                  {isSelected && (
                    <X size={10} color="#C4EF00" style={{ marginLeft: 6 }} />
                  )}
                </Pressable>
              );
            })}
          </View>

          <View className="flex-row flex-wrap gap-2.5">
            {allergies.filter(a => !commonAllergies.includes(a)).map((allergy, idx) => (
              <View key={idx} className="bg-[#2A2A2A] rounded-full py-2 px-3 flex-row items-center border border-[#C4EF00]/50">
                <Text className="text-white text-[11px] font-medium mr-2">{allergy}</Text>
                <Pressable onPress={() => removeAllergy(allergy)} className="w-4 h-4 items-center justify-center">
                  <X size={10} color="#8E8E93" />
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        <View className="absolute bottom-[90px] left-0 right-0 p-5 bg-[#0A0A0A]/95 pb-5">
          <Pressable
            onPress={handleContinue}
            disabled={saving}
            className="bg-[#C4EF00] rounded-[20px] py-4 flex-row items-center justify-center active:opacity-90">
            {saving ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <>
                <Text className="text-black font-semibold text-lg mr-2">Continue</Text>
                <CaretRight size={18} color="#000000" weight="bold" />
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {renderDropdownModal(showCuisineModal, setShowCuisineModal, "Preferred Cuisine", cuisines, selectedCuisine, setSelectedCuisine)}
    </View>
  );
}
