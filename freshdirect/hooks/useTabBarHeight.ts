import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const TAB_BAR_BASE = 60;

export function useTabBarHeight() {
  const { bottom } = useSafeAreaInsets();
  return TAB_BAR_BASE + bottom;
}
