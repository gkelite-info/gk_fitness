import AsyncStorage from '@react-native-async-storage/async-storage';

const TENANT_KEY = 'selectedGym';

export interface SelectedGym {
  gymId: string;
  gymName: string;
  logo?: string | null;
}

export const getSelectedGym = async (): Promise<SelectedGym | null> => {
  try {
    const data = await AsyncStorage.getItem(TENANT_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[tenantHelper] getSelectedGym Error:', error);
    return null;
  }
};

export const setSelectedGym = async (gym: SelectedGym): Promise<void> => {
  try {
    await AsyncStorage.setItem(TENANT_KEY, JSON.stringify(gym));
  } catch (error) {
    console.error('[tenantHelper] setSelectedGym Error:', error);
  }
};

export const clearSelectedGym = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TENANT_KEY);
  } catch (error) {
    console.error('[tenantHelper] clearSelectedGym Error:', error);
  }
};
