import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'dotconnect_highscore';

export async function getHighScore(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(KEY);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

export async function saveHighScore(score: number): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, String(score));
  } catch {}
}
