import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Trash2, Minus, Plus, ShoppingBag } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';

// Flattened cart-item shape produced by the cart screen for display.
type CartItemView = {
  id: string;
  productId: string;
  name: string;
  price: number;
  unit: string;
  image: string;
  quantity: number;
};

type Props = {
  item: CartItemView;
  onDelete: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
};

export default function SwipeableCartItem({ item, onDelete, onUpdateQty }: Props) {
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      translateX.value = Math.min(0, event.translationX);
    })
    .onEnd(() => {
      if (translateX.value < -60) {
        translateX.value = withSpring(-500, { damping: 20 });
        runOnJS(onDelete)(item.id);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteOpacity = useAnimatedStyle(() => ({
    opacity: translateX.value < -20 ? 1 : 0,
  }));

  return (
    <View style={styles.wrapper}>
      {/* Delete background */}
      <Animated.View style={[styles.deleteBackground, deleteOpacity]}>
        <Trash2 size={22} color="#fff" />
        <Text style={styles.deleteText}>Remove</Text>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.card, animStyle]}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <ShoppingBag size={22} color={Colors.outline} />
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.unit}>{item.unit}</Text>
            <Text style={styles.price}>{`\u20b9${item.price * item.quantity}`}</Text>
          </View>
          <View style={styles.qtyControl}>
            <Pressable
              style={styles.qtyBtn}
              onPress={() => onUpdateQty(item.id, item.quantity - 1)}
              hitSlop={8}
            >
              <Minus size={14} color={Colors.primary} />
            </Pressable>
            <Text style={styles.qtyNum}>{item.quantity}</Text>
            <Pressable
              style={[styles.qtyBtn, styles.qtyBtnAdd]}
              onPress={() => onUpdateQty(item.id, item.quantity + 1)}
              hitSlop={8}
            >
              <Plus size={14} color="#fff" />
            </Pressable>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', marginBottom: Spacing.sm },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  deleteText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLow,
  },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: Colors.onSurface, lineHeight: 19 },
  unit: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
  price: { fontSize: 16, fontWeight: '800', color: Colors.primary, marginTop: 4 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  qtyBtn: {
    width: 30, height: 30, borderRadius: BorderRadius.full,
    borderWidth: 1.5, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnAdd: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  qtyNum: { fontSize: 16, fontWeight: '700', color: Colors.onSurfaceDeep, minWidth: 20, textAlign: 'center' },
});
