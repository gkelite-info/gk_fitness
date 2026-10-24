import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Check,
  Camera,
  Image as ImageIcon,
  Trash,
  Plus,
  Fire,
  Clock,
  Scales,
  Leaf,
  Globe,
  WarningCircle,
  CaretUp,
  CaretDown,
  CookingPot,
} from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  createRecipe,
  updateRecipe,
  uploadRecipeImage,
  fetchRecipeById,
} from '@/helpers/recipes/recipesHelper';
import {
  MEAL_TYPES,
  DIFFICULTY_LEVELS,
  DIET_TYPES,
  ALLERGENS,
  CUISINES,
  CLINICAL_CONDITIONS,
  COMMON_UNITS,
  RecipeIngredient,
  RecipeInstructionStep,
  MealType,
  DifficultyLevel,
} from '@/lib/types/recipes';
import { triggerLightHaptic, triggerSuccessHaptic, triggerErrorHaptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';

export default function RecipeFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const isEditMode = Boolean(params.id);
  const recipeId = params.id as string;

  const [isLoadingRecipe, setIsLoadingRecipe] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Form States
  const [mealName, setMealName] = useState('');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Easy');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Macros & Timing
  const [calories, setCalories] = useState('350');
  const [protein, setProtein] = useState('25');
  const [carbs, setCarbs] = useState('35');
  const [fat, setFat] = useState('12');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState('15');
  const [cookTimeMinutes, setCookTimeMinutes] = useState('15');
  const [servings, setServings] = useState('1');
  const [servingUnit, setServingUnit] = useState('1 serving');
  const [isScalable, setIsScalable] = useState(true);

  // Dietary, Allergens, Cuisines, Clinical
  const [selectedDiets, setSelectedDiets] = useState<string[]>(['Vegetarian']);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(['Indian']);
  const [selectedSuitable, setSelectedSuitable] = useState<string[]>([]);
  const [selectedContra, setSelectedContra] = useState<string[]>([]);

  // Ingredients & Instructions
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [steps, setSteps] = useState<RecipeInstructionStep[]>([
    { step: 1, text: '' },
  ]);

  // Load existing recipe if in edit mode
  useEffect(() => {
    if (isEditMode && recipeId) {
      (async () => {
        try {
          setIsLoadingRecipe(true);
          const data = await fetchRecipeById(recipeId);
          if (data) {
            setMealName(data.mealName || '');
            setMealType((data.mealType?.toLowerCase() as MealType) || 'lunch');
            setDifficulty((data.difficulty as DifficultyLevel) || 'Easy');
            setDescription(data.description || '');
            setImageUrl(data.imageUrl || '');
            setCalories(String(data.calories ?? data.baseCalories ?? 350));
            setProtein(String(data.protein ?? data.baseProtein ?? 25));
            setCarbs(String(data.carbs ?? data.baseCarbs ?? 35));
            setFat(String(data.fat ?? data.baseFat ?? 12));
            setPrepTimeMinutes(String(data.prepTimeMinutes || 15));
            setCookTimeMinutes(String(data.cookTimeMinutes || 15));
            setServings(String(data.servings || 1));
            setServingUnit(data.servingUnit || '1 serving');
            setIsScalable(data.isScalable !== false);
            setSelectedDiets(data.dietTypes || []);
            setSelectedAllergens(data.allergens || []);
            setSelectedCuisines(data.cuisines || []);
            setSelectedSuitable(data.suitableFor || []);
            setSelectedContra(data.contraindications || []);
            setIngredients(data.ingredients || []);
            if (Array.isArray(data.recipeInstructions) && data.recipeInstructions.length > 0) {
              setSteps(data.recipeInstructions);
            }
          }
        } catch (err) {
          console.error('[RecipeFormScreen] Load error:', err);
          toast.error('Failed to load recipe details');
        } finally {
          setIsLoadingRecipe(false);
        }
      })();
    }
  }, [isEditMode, recipeId]);

  // Image Picker Handler
  const handlePickPhoto = async () => {
    triggerLightHaptic();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.error('Photo library permission is required to upload recipe pictures.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      try {
        setIsUploadingPhoto(true);
        toast.loading('Uploading recipe photo...');
        const uploadedUrl = await uploadRecipeImage(asset.uri, 'jpg');
        setImageUrl(uploadedUrl);
        triggerSuccessHaptic();
        toast.success('Photo uploaded successfully!');
      } catch (err: any) {
        triggerErrorHaptic();
        toast.error(err.message || 'Failed to upload photo');
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  };

  const toggleArrayItem = (list: string[], item: string, setter: (val: string[]) => void) => {
    triggerLightHaptic();
    if (list.includes(item)) {
      setter(list.filter((x) => x !== item));
    } else {
      setter([...list, item]);
    }
  };

  // Ingredients actions
  const handleAddIngredient = () => {
    triggerLightHaptic();
    setIngredients((prev) => [
      ...prev,
      { name: '', quantity: 100, unit: 'g' },
    ]);
  };

  const handleUpdateIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    setIngredients((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveIngredient = (index: number) => {
    triggerLightHaptic();
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  // Instructions actions
  const handleAddStep = () => {
    triggerLightHaptic();
    setSteps((prev) => [
      ...prev,
      { step: prev.length + 1, text: '' },
    ]);
  };

  const handleUpdateStep = (index: number, text: string) => {
    setSteps((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text };
      return updated;
    });
  };

  const handleRemoveStep = (index: number) => {
    triggerLightHaptic();
    setSteps((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((s, i) => ({ ...s, step: i + 1 }));
    });
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === steps.length - 1)
    ) {
      return;
    }
    triggerLightHaptic();
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...steps];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setSteps(updated.map((s, i) => ({ ...s, step: i + 1 })));
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (!mealName.trim()) {
      triggerErrorHaptic();
      toast.error('Recipe name is required');
      return;
    }

    setIsSubmitting(true);
    triggerLightHaptic();

    try {
      const validSteps = steps.filter((s) => s.text.trim().length > 0);
      const validIngredients = ingredients.filter((ing) => ing.name.trim().length > 0);

      const input = {
        mealName: mealName.trim(),
        mealType: mealType.toLowerCase(),
        difficulty,
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fat: Number(fat) || 0,
        prepTimeMinutes: Number(prepTimeMinutes) || 15,
        cookTimeMinutes: Number(cookTimeMinutes) || 15,
        servings: Number(servings) || 1,
        servingUnit: servingUnit.trim() || '1 serving',
        isScalable,
        dietTypes: selectedDiets,
        allergens: selectedAllergens,
        cuisines: selectedCuisines,
        suitableFor: selectedSuitable,
        contraindications: selectedContra,
        recipeInstructions: validSteps,
        ingredients: validIngredients,
        isActive: true,
        isGlobal: true,
      };

      if (isEditMode) {
        await updateRecipe(recipeId, input);
        triggerSuccessHaptic();
        toast.success('Recipe updated successfully!');
      } else {
        await createRecipe(input);
        triggerSuccessHaptic();
        toast.success('New recipe published!');
      }

      router.back();
    } catch (err: any) {
      triggerErrorHaptic();
      console.error('[RecipeFormScreen] Save error:', err);
      toast.error(err.message || 'Failed to save recipe');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingRecipe) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#BEF227" />
        <Text className="text-[#888888] text-xs mt-3">Loading recipe configuration...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      {/* Top Header */}
      <View
        style={{ paddingTop: insets.top + 8 }}
        className="px-4 pb-3 bg-[#0F0F12] border-b border-[#1E2028] flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => {
              triggerLightHaptic();
              router.back();
            }}
            className="w-10 h-10 rounded-xl bg-[#181A20] border border-[#262A36] items-center justify-center active:opacity-70"
          >
            <ArrowLeft size={18} color="#FFFFFF" weight="bold" />
          </Pressable>
          <View>
            <Text className="text-white font-bold text-lg tracking-tight">
              {isEditMode ? 'Edit Recipe' : 'Add New Recipe'}
            </Text>
            <Text className="text-[#888888] text-xs">
              {isEditMode ? 'Update recipe details' : 'Configure recipe & macros'}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          className="flex-row items-center gap-1.5 px-4 py-2 rounded-xl bg-[#BEF227] active:opacity-80 disabled:opacity-50"
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <>
              <Check size={16} color="#000000" weight="bold" />
              <Text className="text-black font-bold text-xs">Save</Text>
            </>
          )}
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: General Info */}
        <View className="bg-[#12141A] border border-[#232631] rounded-2xl p-4 mb-4 gap-4">
          <Text className="text-sm font-bold text-white flex-row items-center gap-1.5">
            General Information
          </Text>

          <View>
            <Text className="text-xs text-[#CBD5E1] font-semibold mb-1.5">
              Recipe Title *
            </Text>
            <TextInput
              placeholder="e.g. Yellow Dal Tadka with Steamed Brown Rice"
              placeholderTextColor="#64748B"
              value={mealName}
              onChangeText={setMealName}
              className="w-full bg-[#181A20] border border-[#262A36] rounded-xl px-3.5 h-11 text-white text-xs"
            />
          </View>

          {/* Meal Category Slot */}
          <View>
            <Text className="text-xs text-[#CBD5E1] font-semibold mb-1.5">
              Meal Category Slot *
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {MEAL_TYPES.map((t) => {
                const isSelected = mealType === t.value;
                return (
                  <Pressable
                    key={t.value}
                    onPress={() => {
                      triggerLightHaptic();
                      setMealType(t.value);
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl border items-center ${
                      isSelected
                        ? 'bg-[#BEF227] border-[#BEF227]'
                        : 'bg-[#181A20] border-[#262A36]'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-black font-bold' : 'text-white'
                      }`}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Cooking Difficulty */}
          <View>
            <Text className="text-xs text-[#CBD5E1] font-semibold mb-1.5">
              Cooking Difficulty
            </Text>
            <View className="flex-row gap-2">
              {DIFFICULTY_LEVELS.map((lvl) => {
                const isSelected = difficulty === lvl;
                return (
                  <Pressable
                    key={lvl}
                    onPress={() => {
                      triggerLightHaptic();
                      setDifficulty(lvl);
                    }}
                    className={`flex-1 py-2 rounded-xl border items-center ${
                      isSelected
                        ? 'bg-[#1C202B] border-[#BEF227]'
                        : 'bg-[#181A20] border-[#262A36]'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-[#BEF227] font-bold' : 'text-[#94A3B8]'
                      }`}
                    >
                      {lvl}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Culinary Description */}
          <View>
            <Text className="text-xs text-[#CBD5E1] font-semibold mb-1.5">
              Description & Culinary Summary
            </Text>
            <TextInput
              multiline
              numberOfLines={3}
              placeholder="Short appetizing description explaining key ingredients and benefits..."
              placeholderTextColor="#64748B"
              value={description}
              onChangeText={setDescription}
              className="w-full bg-[#181A20] border border-[#262A36] rounded-xl p-3 text-white text-xs min-h-[75px]"
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Section 2: Recipe Photo */}
        <View className="bg-[#12141A] border border-[#232631] rounded-2xl p-4 mb-4 gap-3">
          <Text className="text-sm font-bold text-white">Recipe Cover Photo</Text>

          {imageUrl ? (
            <View className="relative w-full h-44 rounded-xl overflow-hidden bg-[#0A0B0E] border border-[#262A36]">
              <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
              <Pressable
                onPress={() => {
                  triggerLightHaptic();
                  setImageUrl('');
                }}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 border border-white/20 items-center justify-center"
              >
                <Trash size={14} color="#EF4444" weight="bold" />
              </Pressable>
            </View>
          ) : (
            <View className="gap-3">
              <Pressable
                onPress={handlePickPhoto}
                disabled={isUploadingPhoto}
                className="w-full h-36 rounded-xl border-2 border-dashed border-[#262A36] bg-[#181A20] items-center justify-center active:opacity-70"
              >
                {isUploadingPhoto ? (
                  <View className="items-center">
                    <ActivityIndicator size="small" color="#BEF227" />
                    <Text className="text-[#888888] text-xs mt-2">Uploading image...</Text>
                  </View>
                ) : (
                  <View className="items-center">
                    <View className="w-10 h-10 rounded-full bg-[#BEF227]/10 items-center justify-center mb-2">
                      <Camera size={20} color="#BEF227" weight="bold" />
                    </View>
                    <Text className="text-white text-xs font-semibold">Choose from Library</Text>
                    <Text className="text-[#64748B] text-[10px] mt-0.5">JPEG, PNG or WebP</Text>
                  </View>
                )}
              </Pressable>

              <Pressable
                onPress={() => setShowUrlInput(!showUrlInput)}
                className="self-center"
              >
                <Text className="text-xs text-[#BEF227] font-medium">
                  {showUrlInput ? 'Hide URL Input' : 'Or paste direct image URL'}
                </Text>
              </Pressable>

              {showUrlInput && (
                <TextInput
                  placeholder="https://images.unsplash.com/..."
                  placeholderTextColor="#64748B"
                  value={imageUrl}
                  onChangeText={setImageUrl}
                  className="w-full bg-[#181A20] border border-[#262A36] rounded-xl px-3.5 h-11 text-white text-xs"
                />
              )}
            </View>
          )}
        </View>

        {/* Section 3: Macronutrients & Timing */}
        <View className="bg-[#12141A] border border-[#232631] rounded-2xl p-4 mb-4 gap-4">
          <Text className="text-sm font-bold text-white flex-row items-center gap-1.5">
            Macronutrients & Timing
          </Text>

          {/* Macro Inputs */}
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Text className="text-[11px] text-[#CBD5E1] font-semibold mb-1">Calories *</Text>
              <TextInput
                keyboardType="numeric"
                value={calories}
                onChangeText={setCalories}
                className="bg-[#181A20] border border-[#262A36] rounded-xl px-3 h-10 text-white text-xs font-bold"
              />
            </View>

            <View className="flex-1">
              <Text className="text-[11px] text-[#38BDF8] font-semibold mb-1">Protein (g)</Text>
              <TextInput
                keyboardType="numeric"
                value={protein}
                onChangeText={setProtein}
                className="bg-[#181A20] border border-[#262A36] rounded-xl px-3 h-10 text-white text-xs font-bold"
              />
            </View>

            <View className="flex-1">
              <Text className="text-[11px] text-[#FBBF24] font-semibold mb-1">Carbs (g)</Text>
              <TextInput
                keyboardType="numeric"
                value={carbs}
                onChangeText={setCarbs}
                className="bg-[#181A20] border border-[#262A36] rounded-xl px-3 h-10 text-white text-xs font-bold"
              />
            </View>

            <View className="flex-1">
              <Text className="text-[11px] text-[#FB923C] font-semibold mb-1">Fat (g)</Text>
              <TextInput
                keyboardType="numeric"
                value={fat}
                onChangeText={setFat}
                className="bg-[#181A20] border border-[#262A36] rounded-xl px-3 h-10 text-white text-xs font-bold"
              />
            </View>
          </View>

          {/* Timing & Servings */}
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Text className="text-[11px] text-[#CBD5E1] font-semibold mb-1">Prep (mins)</Text>
              <TextInput
                keyboardType="numeric"
                value={prepTimeMinutes}
                onChangeText={setPrepTimeMinutes}
                className="bg-[#181A20] border border-[#262A36] rounded-xl px-3 h-10 text-white text-xs"
              />
            </View>

            <View className="flex-1">
              <Text className="text-[11px] text-[#CBD5E1] font-semibold mb-1">Cook (mins)</Text>
              <TextInput
                keyboardType="numeric"
                value={cookTimeMinutes}
                onChangeText={setCookTimeMinutes}
                className="bg-[#181A20] border border-[#262A36] rounded-xl px-3 h-10 text-white text-xs"
              />
            </View>

            <View className="flex-1">
              <Text className="text-[11px] text-[#CBD5E1] font-semibold mb-1">Servings</Text>
              <TextInput
                keyboardType="numeric"
                value={servings}
                onChangeText={setServings}
                className="bg-[#181A20] border border-[#262A36] rounded-xl px-3 h-10 text-white text-xs"
              />
            </View>
          </View>

          {/* Scalable Toggle */}
          <View className="flex-row items-center justify-between pt-2 border-t border-[#1C202B]">
            <View>
              <Text className="text-xs font-semibold text-white">Algorithmic Scaling</Text>
              <Text className="text-[10px] text-[#888888]">
                Allows app to auto-scale portion sizes to customer caloric goal
              </Text>
            </View>
            <Switch
              value={isScalable}
              onValueChange={setIsScalable}
              trackColor={{ false: '#262A36', true: '#BEF227' }}
              thumbColor={isScalable ? '#000000' : '#888888'}
            />
          </View>
        </View>

        {/* Section 4: Dietary & Clinical Medical Tags */}
        <View className="bg-[#12141A] border border-[#232631] rounded-2xl p-4 mb-4 gap-4">
          <Text className="text-sm font-bold text-white">
            Dietary, Allergens & Clinical Tags
          </Text>

          {/* Diet Types */}
          <View>
            <Text className="text-xs font-semibold text-[#CBD5E1] mb-1.5">
              Dietary Classification ({selectedDiets.length})
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {DIET_TYPES.map((d) => {
                const isSelected = selectedDiets.includes(d);
                return (
                  <Pressable
                    key={d}
                    onPress={() => toggleArrayItem(selectedDiets, d, setSelectedDiets)}
                    className={`px-3 py-1.5 rounded-xl border ${
                      isSelected
                        ? 'bg-[#BEF227] border-[#BEF227]'
                        : 'bg-[#181A20] border-[#262A36]'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        isSelected ? 'text-black font-bold' : 'text-[#CBD5E1]'
                      }`}
                    >
                      {d}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Common Allergens */}
          <View>
            <Text className="text-xs font-semibold text-[#CBD5E1] mb-1.5">
              Common Allergens ({selectedAllergens.length})
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {ALLERGENS.map((a) => {
                const isSelected = selectedAllergens.includes(a);
                return (
                  <Pressable
                    key={a}
                    onPress={() => toggleArrayItem(selectedAllergens, a, setSelectedAllergens)}
                    className={`px-3 py-1.5 rounded-xl border ${
                      isSelected
                        ? 'bg-[#EF4444] border-[#EF4444]'
                        : 'bg-[#181A20] border-[#262A36]'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        isSelected ? 'text-white font-bold' : 'text-[#CBD5E1]'
                      }`}
                    >
                      {a}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Clinically Suitable For */}
          <View>
            <Text className="text-xs font-semibold text-[#4ADE80] mb-1.5">
              Clinically Suitable For ({selectedSuitable.length})
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {CLINICAL_CONDITIONS.map((c) => {
                const isSelected = selectedSuitable.includes(c);
                return (
                  <Pressable
                    key={c}
                    onPress={() => toggleArrayItem(selectedSuitable, c, setSelectedSuitable)}
                    className={`px-2.5 py-1.5 rounded-xl border ${
                      isSelected
                        ? 'bg-[#4ADE80] border-[#4ADE80]'
                        : 'bg-[#181A20] border-[#262A36]'
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-medium ${
                        isSelected ? 'text-black font-bold' : 'text-[#CBD5E1]'
                      }`}
                    >
                      {c}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Section 5: Ingredients Builder */}
        <View className="bg-[#12141A] border border-[#232631] rounded-2xl p-4 mb-4 gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-bold text-white">Recipe Ingredients</Text>
            <Pressable
              onPress={handleAddIngredient}
              className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg bg-[#181A20] border border-[#262A36]"
            >
              <Plus size={14} color="#BEF227" weight="bold" />
              <Text className="text-[#BEF227] text-xs font-semibold">Add Item</Text>
            </Pressable>
          </View>

          {ingredients.length === 0 ? (
            <Text className="text-xs text-[#64748B] italic">
              No ingredients added yet. Tap &quot;Add Item&quot; to configure.
            </Text>
          ) : (
            <View className="gap-2.5">
              {ingredients.map((ing, idx) => (
                <View key={idx} className="flex-row items-center gap-2">
                  <TextInput
                    placeholder="Ingredient name (e.g. Rolled Oats)"
                    placeholderTextColor="#64748B"
                    value={ing.name}
                    onChangeText={(val) => handleUpdateIngredient(idx, 'name', val)}
                    className="flex-1 bg-[#181A20] border border-[#262A36] rounded-xl px-3 h-10 text-white text-xs"
                  />
                  <TextInput
                    placeholder="Qty"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={String(ing.quantity || '')}
                    onChangeText={(val) => handleUpdateIngredient(idx, 'quantity', Number(val) || 0)}
                    className="w-16 bg-[#181A20] border border-[#262A36] rounded-xl px-2 h-10 text-white text-xs text-center"
                  />
                  <TextInput
                    placeholder="unit"
                    placeholderTextColor="#64748B"
                    value={ing.unit}
                    onChangeText={(val) => handleUpdateIngredient(idx, 'unit', val)}
                    className="w-14 bg-[#181A20] border border-[#262A36] rounded-xl px-2 h-10 text-white text-xs text-center"
                  />
                  <Pressable
                    onPress={() => handleRemoveIngredient(idx)}
                    className="w-9 h-10 rounded-xl bg-red-500/10 border border-red-500/20 items-center justify-center"
                  >
                    <Trash size={14} color="#EF4444" weight="bold" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Section 6: Step-by-Step Instructions */}
        <View className="bg-[#12141A] border border-[#232631] rounded-2xl p-4 mb-6 gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-bold text-white">Cooking Steps</Text>
            <Pressable
              onPress={handleAddStep}
              className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg bg-[#181A20] border border-[#262A36]"
            >
              <Plus size={14} color="#BEF227" weight="bold" />
              <Text className="text-[#BEF227] text-xs font-semibold">Add Step</Text>
            </Pressable>
          </View>

          <View className="gap-2.5">
            {steps.map((st, idx) => (
              <View key={idx} className="flex-row items-start gap-2">
                <View className="w-7 h-7 rounded-full bg-[#BEF227]/10 border border-[#BEF227]/30 items-center justify-center shrink-0 mt-1.5">
                  <Text className="text-[#BEF227] text-xs font-bold">{st.step || idx + 1}</Text>
                </View>
                <TextInput
                  multiline
                  placeholder={`Instruction step ${idx + 1}...`}
                  placeholderTextColor="#64748B"
                  value={st.text}
                  onChangeText={(val) => handleUpdateStep(idx, val)}
                  className="flex-1 bg-[#181A20] border border-[#262A36] rounded-xl p-2.5 text-white text-xs min-h-[50px]"
                />
                <View className="gap-1 mt-0.5">
                  {idx > 0 && (
                    <Pressable
                      onPress={() => handleMoveStep(idx, 'up')}
                      className="p-1 rounded bg-[#181A20]"
                    >
                      <CaretUp size={12} color="#CBD5E1" weight="bold" />
                    </Pressable>
                  )}
                  {idx < steps.length - 1 && (
                    <Pressable
                      onPress={() => handleMoveStep(idx, 'down')}
                      className="p-1 rounded bg-[#181A20]"
                    >
                      <CaretDown size={12} color="#CBD5E1" weight="bold" />
                    </Pressable>
                  )}
                  {steps.length > 1 && (
                    <Pressable
                      onPress={() => handleRemoveStep(idx)}
                      className="p-1 rounded bg-red-500/10"
                    >
                      <Trash size={12} color="#EF4444" weight="bold" />
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Bottom Save Button */}
        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-xl bg-[#BEF227] items-center justify-center shadow-lg active:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text className="text-black font-bold text-sm">
              {isEditMode ? 'Update Recipe' : 'Save & Publish Recipe'}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}
