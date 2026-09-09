import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence,
} from 'react-native-reanimated';
import { Home, ShoppingCart, Package, User, LayoutGrid } from 'lucide-react-native';
import { Colors, BorderRadius } from '@/constants/theme';
import { useCartStore } from '@/store/cartStore';
import { TAB_BAR_BASE } from '@/hooks/useTabBarHeight';

function TabIcon({
  Icon, focused, color, cartCount,
}: {
  Icon: any; focused: boolean; color: string; cartCount?: number;
}) {
  const scale = useSharedValue(1);
  React.useEffect(() => {
    if (focused) {
      scale.value = withSequence(withSpring(1.2, { damping: 8 }), withSpring(1, { damping: 12 }));
    }
  }, [focused]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <View style={styles.tabIconWrap}>
      <Animated.View style={style}>
        <Icon size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
      </Animated.View>
      {(cartCount ?? 0) > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{cartCount! > 9 ? '9+' : cartCount}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const cartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.outline,
        animation: 'none',
        lazy: false,
        tabBarStyle: {
          backgroundColor: 'rgba(255,255,255,0.97)',
          borderTopWidth: 0.5,
          borderTopColor: Colors.outlineVariant,
          height: TAB_BAR_BASE + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 8,
          position: 'absolute',
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon Icon={Home} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categories',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon Icon={LayoutGrid} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon Icon={ShoppingCart} focused={focused} color={color} cartCount={cartCount} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon Icon={Package} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon Icon={User} focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.accentOrange,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
