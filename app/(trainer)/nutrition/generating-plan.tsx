import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { CheckCircleIcon as CheckCircle, CircleIcon as PhosphorCircle, CookingPotIcon as CookingPot } from 'phosphor-react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { useUser } from '@/context/UserContext';
import { generateAlgorithmicPlan } from '@/lib/mealEngine';
import { calculateNutritionTargets } from '@/lib/nutritionCalculator';
import { saveTrainerMealPlan } from '@/helpers/trainerMealPlans/trainerMealPlans';
import { saveTrainerMealPlanDay } from '@/helpers/trainerMealPlans/mealPlanDays';
import { saveTrainerMealPlanDayMeal } from '@/helpers/trainerMealPlans/mealPlanDayMeals';
import { fetchCustomerOnboarding } from '@/helpers/onboardingHelper';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';

export default function GeneratingPlan() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { targetUserId } = useLocalSearchParams<{ targetUserId: string }>();
    const { userId } = useUser();
    const [progress, setProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const generationStarted = useRef(false);

    useEffect(() => {
        if (!targetUserId || generationStarted.current) return;
        generationStarted.current = true;

        async function processMealPlan() {
            try {
                setProgress(15);
                const profile = await fetchCustomerOnboarding(targetUserId!);
                if (!profile) throw new Error('Onboarding profile not found');

                setProgress(30);
                const mealPlanData = await generateAlgorithmicPlan(targetUserId!);
                setProgress(60);

                const targets = await calculateNutritionTargets(targetUserId!);

                const planResult = await saveTrainerMealPlan({
                    userId: targetUserId!,
                    isActive: true,
                    dietType: profile.dietType || 'balanced',
                    targetCalories: targets.targetCalories,
                    targetProtein: targets.targetProtein,
                    targetCarbs: targets.targetCarbs,
                    targetFat: targets.targetFat,
                    createdBy: userId!
                });

                if (!planResult || !planResult.trainerMealPlanId) {
                    throw new Error('Failed to create meal plan record.');
                }

                setProgress(70);

                for (const day of mealPlanData.days) {
                    let dayTotalCalories = 0;
                    for (const meal of day.meals) {
                        dayTotalCalories += meal.calories;
                    }

                    const savedDay = await saveTrainerMealPlanDay({
                        trainerMealPlanId: planResult.trainerMealPlanId,
                        dayOfWeek: day.dayOfWeek.charAt(0).toUpperCase() + day.dayOfWeek.slice(1).toLowerCase(),
                        totalCalories: dayTotalCalories
                    });

                    if (savedDay && savedDay.trainerMealPlanDayId) {
                        for (const meal of day.meals) {
                            await saveTrainerMealPlanDayMeal({
                                trainerMealPlanDayId: savedDay.trainerMealPlanDayId,
                                mealType: meal.mealType,
                                mealName: meal.mealName,
                                description: meal.description,
                                calories: meal.calories,
                                protein: meal.protein,
                                carbs: meal.carbs,
                                fat: meal.fat,
                                order: meal.order,
                                globalMealId: meal.globalMealId,
                                ingredientsJson: meal.ingredientsJson,
                                recipeInstructions: meal.recipeInstructions,
                                imageUrl: meal.imageUrl,
                                prepTimeMinutes: meal.prepTimeMinutes,
                            });
                        }
                    }
                }

                setProgress(100);

                await queryClient.invalidateQueries({ queryKey: ['trainerAssignedDietPlans', userId] });
                await queryClient.invalidateQueries({ queryKey: ['trainerMealPlan', targetUserId] });

                setTimeout(() => {
                    router.replace({ pathname: '/(trainer)/nutrition/my-nutrition-plan', params: { targetUserId } } as any);
                }, 800);

            } catch (err: any) {
                console.error('Meal Plan Generation Error:', err);
                setErrorMsg(err.message || 'An error occurred while generating your plan.');
            }
        }

        processMealPlan();
    }, [targetUserId, router]);

    const displayProgress = Math.min(100, Math.floor(progress));

    const steps = [
        {
            title: 'Analyzing your profile',
            subtitle: 'Age, weight, height, activity level',
            progressRange: [0, 20]
        },
        {
            title: 'Calculating your calorie & macros',
            subtitle: 'Daily calorie target and macronutrients',
            progressRange: [20, 40]
        },
        {
            title: 'Selecting the best meals',
            subtitle: 'Choosing nutritious & delicious options',
            progressRange: [40, 60]
        },
        {
            title: 'Building your weekly plan',
            subtitle: 'Structuring meals for the week',
            progressRange: [60, 80]
        },
        {
            title: 'Finalizing your plan',
            subtitle: 'Reviewing and optimizing',
            progressRange: [80, 100]
        }
    ];

    const size = 200;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (displayProgress / 100) * circumference;

    return (
        <View className="flex-1 bg-[#0A0A0A]">
            <ScrollView
                contentContainerStyle={{ padding: 20, paddingBottom: 120, flexGrow: 1, justifyContent: 'center' }}
                showsVerticalScrollIndicator={false}
            >
                <View className="items-center mb-10">
                    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
                        <Svg width={size} height={size} style={{ position: 'absolute' }}>
                            <SvgCircle
                                stroke="#2A2A2A"
                                fill="none"
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                strokeWidth={strokeWidth}
                            />
                            <SvgCircle
                                stroke="#C4EF00"
                                fill="none"
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                strokeWidth={strokeWidth}
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                rotation="-90"
                                origin={`${size / 2}, ${size / 2}`}
                            />
                        </Svg>

                        <View className="items-center">
                            <View className="w-12 h-12 rounded-full bg-[#1A1A1A] items-center justify-center mb-3">
                                <CookingPot size={24} color="#C4EF00" weight="fill" />
                            </View>
                            <Text className="text-white text-base font-semibold text-center px-4 mb-2 leading-5">
                                Building your nutrition plan...
                            </Text>
                            <Text className="text-[#C4EF00] text-[32px] font-semibold">
                                {displayProgress}%
                            </Text>
                        </View>
                    </View>

                    <Text className="text-[#8E8E93] text-sm text-center mt-8 px-6">
                        Please wait while we create a personalized plan just for you.
                    </Text>

                    {errorMsg && (
                        <Text className="text-red-500 text-sm text-center mt-4 px-6 font-semibold">
                            {errorMsg}
                        </Text>
                    )}
                </View>

                <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mb-6">
                    {steps.map((step, index) => {
                        let status = 'PENDING';
                        if (progress >= step.progressRange[1]) {
                            status = 'DONE';
                        } else if (progress >= step.progressRange[0] && progress < step.progressRange[1]) {
                            status = 'IN_PROGRESS';
                        }

                        const isLast = index === steps.length - 1;

                        return (
                            <View key={index} className={`flex-row items-center ${!isLast ? 'mb-6' : ''}`}>
                                <View className="mr-4">
                                    {status === 'DONE' ? (
                                        <CheckCircle size={24} color="#C4EF00" weight="fill" />
                                    ) : status === 'IN_PROGRESS' ? (
                                        <View className="w-6 h-6 rounded-full border border-[#C4EF00] items-center justify-center">
                                            <CheckCircle size={16} color="#C4EF00" />
                                        </View>
                                    ) : (
                                        <PhosphorCircle size={24} color="#333333" weight="bold" />
                                    )}
                                </View>

                                <View className="flex-1">
                                    <Text className={`font-semibold text-sm mb-0.5 ${status === 'PENDING' ? 'text-[#555555]' : 'text-white'}`}>
                                        {step.title}
                                    </Text>
                                    <Text className={`text-xs ${status === 'PENDING' ? 'text-[#333333]' : 'text-[#8E8E93]'}`}>
                                        {step.subtitle}
                                    </Text>
                                </View>

                                <View>
                                    {status === 'DONE' && (
                                        <CheckCircle size={16} color="#C4EF00" weight="bold" />
                                    )}
                                    {status === 'IN_PROGRESS' && (
                                        <Text className="text-[#C4EF00] text-[10px] font-semibold tracking-wider">
                                            IN PROGRESS
                                        </Text>
                                    )}
                                    {status === 'PENDING' && (
                                        <Text className="text-[#555555] text-[10px] font-semibold tracking-wider">
                                            PENDING
                                        </Text>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>

                <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 flex-row items-start">
                    <View className="w-[80px] h-[80px] rounded-[16px] bg-[#0A0A0A] mr-4 border border-[#222222] items-center justify-center">
                        <Text className="text-[32px]">dY"</Text>
                    </View>
                    <View className="flex-1">
                        <Text className="text-[#C4EF00] text-[10px] font-semibold tracking-wider mb-1">
                            DID YOU KNOW?
                        </Text>
                        <Text className="text-white text-sm font-semibold leading-5 mb-1">
                            A well-balanced diet is 70% of your fitness journey.
                        </Text>
                        <Text className="text-[#8E8E93] text-xs">
                            Stay consistent and trust the process!
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}


