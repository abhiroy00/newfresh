import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image, Dimensions, Share,
} from 'react-native';
import { splitProductName } from '@/lib/productName';
import MarkdownText from '@/components/MarkdownText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft, Share2, Minus, Plus, ShoppingCart,
  Leaf, Check, Truck, Shield, Thermometer, CalendarClock,
  Droplets, MapPin, Heart, AlertCircle, ChefHat, Info,
  Award, Sparkles,
} from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { useCartStore } from '@/store/cartStore';
import { productsApi } from '@/lib/api';
import { usePullRefresh } from '@/hooks/usePullRefresh';

const { width: SCREEN_W } = Dimensions.get('window');
// Explicit pixel height for hero slides (matches heroContainer's aspectRatio).
// A percentage height inside the horizontal ScrollView resolves to 0 and the
// image collapses to nothing.
const HERO_H = SCREEN_W / 1.25;

interface MineralItem { name: string; value: string; icon?: string }
interface VitaminItem { name: string; value: string; icon?: string }

// Icon mapping for common nutrients
const NUTRIENT_ICONS: Record<string, string> = {
  iron: '🩸', calcium: '🦴', potassium: '🍌', magnesium: '💪',
  zinc: '🛡️', phosphorus: '🦷', sodium: '🧂', fiber: '🌾',
  vitamin_a: '👁️', vitamin_c: '🍊', vitamin_d: '☀️', vitamin_e: '✨',
  vitamin_k: '🩹', vitamin_b6: '🧠', vitamin_b12: '⚡', folate: '🧬',
  protein: '🥩', carbs: '🍞',
};

// Category-based fallback tips when no product-specific ones exist
const CATEGORY_FALLBACKS: Record<string, { storage: string[]; preparation: string[] }> = {
  vegetables: {
    storage: ['Refrigerate in crisper drawer', 'Best consumed within 3-5 days', 'Keep away from ethylene-producing fruits'],
    preparation: ['Wash thoroughly under running water', 'Trim and discard wilted parts', 'Cut just before cooking for max freshness'],
  },
  fruits: {
    storage: ['Store ripe fruits in refrigerator', 'Keep unripe fruits at room temperature', 'Consume within 3-7 days'],
    preparation: ['Wash thoroughly before eating', 'Peel if skin is thick or waxed', 'Cut just before serving'],
  },
  dairy: {
    storage: ['Keep refrigerated at 2-4°C', 'Consume before expiry date', 'Keep container sealed'],
    preparation: ['Shake well before use if needed', 'Bring to room temp for best taste', 'Use clean utensils to serve'],
  },
  bakery: {
    storage: ['Store in airtight container', 'Keep at room temperature', 'Best consumed within 2-3 days'],
    preparation: ['Warm slightly before serving', 'Slice with serrated knife', 'Toast for extra crispness'],
  },
  meat: {
    storage: ['Keep frozen at -18°C or below', 'Thaw in refrigerator, not at room temp', 'Use within 24h after thawing'],
    preparation: ['Wash hands before and after handling', 'Cook to safe internal temperature', 'Marinate for best flavor'],
  },
};

// Dynamic section labels per category
const CATEGORY_SECTION_LABELS: Record<string, { title1: string; icon1: any; title2: string; icon2: any }> = {
  vegetables: { title1: 'Storage Tips', icon1: Thermometer, title2: 'Preparation Tips', icon2: ChefHat },
  fruits: { title1: 'Storage Tips', icon1: Thermometer, title2: 'Serving Suggestions', icon2: ChefHat },
  dairy: { title1: 'Storage & Handling', icon1: Thermometer, title2: 'Usage Tips', icon2: Info },
  bakery: { title1: 'Storage', icon1: Thermometer, title2: 'Serving Tips', icon2: ChefHat },
  meat: { title1: 'Storage Guide', icon1: Thermometer, title2: 'Cooking Instructions', icon2: ChefHat },
  groceries: { title1: 'Storage', icon1: Thermometer, title2: 'How to Use', icon2: Info },
  services: { title1: 'What We Provide', icon1: Info, title2: 'How It Works', icon2: ChefHat },
};

const DEFAULT_SECTION_LABELS = { title1: 'Storage Tips', icon1: Thermometer, title2: 'Preparation Tips', icon2: ChefHat };

function getSectionLabels(product: any) {
  const catName = (product?.category?.name || '').toLowerCase();
  if (catName && CATEGORY_SECTION_LABELS[catName]) {
    return CATEGORY_SECTION_LABELS[catName];
  }
  if (product?.pricing_unit || product?.available_slots) {
    return CATEGORY_SECTION_LABELS.services;
  }
  return DEFAULT_SECTION_LABELS;
}

// Dynamic trust badges based on product category & type
const CATEGORY_TRUST_BADGES: Record<string, { icon: any; text: string }[]> = {
  vegetables: [
    { icon: Truck, text: 'Farm Fresh Delivery' },
    { icon: Leaf, text: 'Pesticide-Free' },
    { icon: Shield, text: 'Freshness Guaranteed' },
  ],
  fruits: [
    { icon: Truck, text: 'Direct from Orchards' },
    { icon: Leaf, text: 'Naturally Ripened' },
    { icon: Award, text: 'Premium Quality' },
  ],
  dairy: [
    { icon: Thermometer, text: 'Cold Chain Maintained' },
    { icon: Shield, text: 'Pasteurized & Safe' },
    { icon: Truck, text: 'Same Day Delivery' },
  ],
  bakery: [
    { icon: ChefHat, text: 'Freshly Baked Daily' },
    { icon: Shield, text: 'Hygienically Packed' },
    { icon: Truck, text: 'Early Morning Delivery' },
  ],
  meat: [
    { icon: Shield, text: 'Halal Certified' },
    { icon: Thermometer, text: 'Frozen at -18°C' },
    { icon: Truck, text: 'Insulated Delivery' },
  ],
  groceries: [
    { icon: Truck, text: 'Express 30min' },
    { icon: Shield, text: 'Quality Checked' },
    { icon: Award, text: 'Best Price Guaranteed' },
  ],
  services: [
    { icon: Award, text: 'Trained Professionals' },
    { icon: Shield, text: 'Insured Service' },
    { icon: Truck, text: 'On-Time Arrival' },
  ],
};

const DEFAULT_TRUST_BADGES = [
  { icon: Truck, text: 'Express Delivery' },
  { icon: Shield, text: 'Quality Assured' },
  { icon: Award, text: 'Trusted Seller' },
];

function getTrustBadges(product: any) {
  const catName = (product?.category?.name || '').toLowerCase();
  if (catName && CATEGORY_TRUST_BADGES[catName]) {
    return CATEGORY_TRUST_BADGES[catName];
  }
  if (product?.pricing_unit || product?.available_slots) {
    return CATEGORY_TRUST_BADGES.services;
  }
  return DEFAULT_TRUST_BADGES;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [added, setAdded] = useState(false);
  const [hasAdded, setHasAdded] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((s) => s.addItem);
  const insets = useSafeAreaInsets();

  const loadProduct = React.useCallback(async () => {
    try {
      const { data } = await productsApi.detail(id || '');
      setProduct(data.data);
    } catch (e) {
      const { PRODUCTS } = require('@/constants/data');
      const local = PRODUCTS.find((p: any) => p.id === id);
      if (local) setProduct(local);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const { refreshControl } = usePullRefresh(loadProduct);

  if (loading || !product) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: Colors.onSurfaceVariant }}>{loading ? 'Loading...' : 'Product not found'}</Text>
      </View>
    );
  }

  // Gallery images
  const galleryUrls: string[] = (product.images || [])
    .slice()
    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((img: any) => img.url);
  const imageUrls: string[] = [
    ...(product.primary_image_url ? [product.primary_image_url] : []),
    ...galleryUrls.filter((u: string) => u !== product.primary_image_url),
  ];
  const { en: nameEn, hi: nameHi } = splitProductName(product.name);

  // Identify category for fallback tips
  const catName = (product.category?.name || '').toLowerCase();
  const catFallback = CATEGORY_FALLBACKS[catName] || null;

  // Storage & preparation: use product-specific first, then category defaults, then generic
  const storageTips: string[] = product.storage_tips?.length
    ? product.storage_tips
    : catFallback?.storage || ['Store in a cool, dry place', 'Check packaging for best-before date'];

  const preparationTips: string[] = product.preparation_tips?.length
    ? product.preparation_tips
    : catFallback?.preparation || ['Wash thoroughly before use', 'Handle with clean hands'];

  // Parse minerals & vitamins for nutrition display
  const minerals: MineralItem[] = product.minerals
    ? Object.entries(product.minerals).map(([k, v]) => ({ name: k.replace(/_/g, ' '), value: String(v) }))
    : [];
  const vitamins: VitaminItem[] = product.vitamins
    ? Object.entries(product.vitamins).map(([k, v]) => ({ name: k.replace(/_/g, ' '), value: String(v) }))
    : [];
  const hasNutrition = minerals.length > 0 || vitamins.length > 0;

  // Dynamic section labels
  const labels = getSectionLabels(product);

  // Discount
  const discount = product.original_price && product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : null;

  const handleAddToCart = () => {
    setAdded(true);
    setHasAdded(true);
    setTimeout(() => setAdded(false), 2000);
    addItem(product.id, quantity, {
      id: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      primary_image_url: product.primary_image_url,
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={Colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Product Details</Text>
        <Pressable
          style={styles.headerBtn}
          onPress={() => {
            Share.share({
              message: `${nameEn} – ₹${product.price} / ${product.unit} on Gmart Fresh\nhttps://shop.gmartfresh.com/product/${product.id}`,
            }).catch(() => {});
          }}
        >
          <Share2 size={20} color={Colors.onSurface} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
        {/* Hero Image Carousel */}
        <View style={styles.heroContainer}>
          {imageUrls.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) =>
                  setImageIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))
                }
              >
                {imageUrls.map((url) => (
                  <View key={url} style={styles.heroImage}>
                    <Image
                      source={{ uri: url }}
                      style={[StyleSheet.absoluteFill, { opacity: 0.7 }]}
                      resizeMode="cover"
                      blurRadius={25}
                    />
                    <Image source={{ uri: url }} style={StyleSheet.absoluteFill} resizeMode="contain" />
                  </View>
                ))}
              </ScrollView>
              {imageUrls.length > 1 && (
                <View style={styles.imageDots}>
                  {imageUrls.map((_, i) => (
                    <View
                      key={i}
                      style={[styles.imageDot, i === imageIndex ? styles.imageDotActive : styles.imageDotInactive]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <Leaf size={56} color={Colors.outline} />
            </View>
          )}

        </View>

        <View style={styles.content}>
        {/* Badges */}
        {(product.badge || product.is_organic) && <View style={styles.badgeGroup}>
          {product.badge && (
            <View style={[styles.heroBadge, { backgroundColor: product.badge_color || Colors.primary }]}>
              <Text style={styles.heroBadgeText}>{product.badge}</Text>
            </View>
          )}
          {product.is_organic && (
            <View style={styles.organicBadge}>
              <Leaf size={10} color="#fff" fill="#fff" />
              <Text style={styles.organicBadgeText}>Organic</Text>
            </View>
          )}
        </View>}

          {/* ===== TITLE & PRICE ===== */}
          <View style={styles.titleBlock}>
            <Text style={styles.productName}>{nameEn}</Text>
            {nameHi ? <Text style={styles.productNameHi}>{nameHi}</Text> : null}

            <View style={styles.priceRow}>
              <Text style={styles.price}>{`₹${product.price}`}</Text>
              <Text style={styles.priceUnit}>/ {product.unit}</Text>
              {product.original_price && product.original_price > product.price && (
                <>
                  <Text style={styles.originalPrice}>{`₹${product.original_price}`}</Text>
                  {discount && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>{discount}% OFF</Text>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Origin */}
            {product.origin ? (
              <View style={styles.originRow}>
                <MapPin size={14} color={Colors.accentMint} />
                <Text style={styles.originText}>{product.origin}</Text>
              </View>
            ) : null}
          </View>

          {/* ===== QUANTITY SELECTOR ===== */}
          <View style={styles.qtyRow}>
            <Text style={styles.qtyLabel}>Quantity</Text>
            <View style={styles.qtyControls}>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Minus size={16} color={Colors.primary} />
              </Pressable>
              <Text style={styles.qtyNum}>{quantity}</Text>
              <Pressable
                style={styles.qtyBtnAdd}
                onPress={() => setQuantity((q) => q + 1)}
              >
                <Plus size={16} color="#fff" />
              </Pressable>
            </View>
          </View>

          {/* ===== TRUST BADGES (dynamic by category) ===== */}
          <View style={styles.trustRow}>
            {getTrustBadges(product).map((t) => (
              <View key={t.text} style={styles.trustItem}>
                <t.icon size={14} color={Colors.primary} />
                <Text style={styles.trustText}>{t.text}</Text>
              </View>
            ))}
          </View>

          {/* ===== DESCRIPTION ===== */}
          {product.description ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Info size={18} color={Colors.primary} />
                <Text style={styles.sectionTitle}>About This Product</Text>
              </View>
              <View style={styles.descCard}>
                <MarkdownText>{product.description}</MarkdownText>
              </View>
            </View>
          ) : null}

          {/* ===== HEALTH BENEFITS ===== */}
          {product.health_benefits ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Heart size={18} color={Colors.error} />
                <Text style={styles.sectionTitle}>Health Benefits</Text>
              </View>
              <View style={styles.benefitsCard}>
                <MarkdownText>{product.health_benefits}</MarkdownText>
              </View>
            </View>
          ) : null}

          {/* ===== NUTRITIONAL INFO ===== */}
          {hasNutrition && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Sparkles size={18} color={Colors.accentOrange} />
                <Text style={styles.sectionTitle}>Nutritional Info</Text>
              </View>
              <View style={styles.nutritionCard}>
                {minerals.length > 0 && (
                  <>
                    <Text style={styles.nutritionSubtitle}>Minerals</Text>
                    <View style={styles.nutrientGrid}>
                      {minerals.map((m) => (
                        <View key={m.name} style={styles.nutrientItem}>
                          <Text style={styles.nutrientIcon}>{NUTRIENT_ICONS[m.name] || '🔹'}</Text>
                          <View>
                            <Text style={styles.nutrientValue}>{m.value}</Text>
                            <Text style={styles.nutrientName}>{m.name}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </>
                )}
                {vitamins.length > 0 && (
                  <>
                    <Text style={[styles.nutritionSubtitle, minerals.length > 0 && { marginTop: 12 }]}>Vitamins</Text>
                    <View style={styles.nutrientGrid}>
                      {vitamins.map((v) => (
                        <View key={v.name} style={styles.nutrientItem}>
                          <Text style={styles.nutrientIcon}>{NUTRIENT_ICONS[v.name] || '💊'}</Text>
                          <View>
                            <Text style={styles.nutrientValue}>{v.value}</Text>
                            <Text style={styles.nutrientName}>{v.name}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </View>
            </View>
          )}

          {/* ===== SECTION 1: Dynamic ===== */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <labels.icon1 size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>{labels.title1}</Text>
            </View>
            <View style={styles.tipsCard}>
              {storageTips.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <View style={styles.tipDot} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ===== SECTION 2: Dynamic ===== */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <labels.icon2 size={18} color={Colors.accentOrange} />
              <Text style={styles.sectionTitle}>{labels.title2}</Text>
            </View>
            <View style={styles.tipsCard}>
              {preparationTips.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <View style={[styles.tipDot, { backgroundColor: Colors.accentOrange }]} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ height: 140 }} />
        </View>
      </ScrollView>

      {/* ===== BOTTOM CTA BAR ===== */}
      <View style={[styles.ctaBar, { paddingBottom: Spacing.md + insets.bottom }]}>
        <View style={styles.ctaPriceWrap}>
          <Text style={styles.ctaTotal}>{`₹${product.price * quantity}`}</Text>
          {quantity > 1 && (
            <Text style={styles.ctaUnit}>{`${quantity} × ₹${product.price}`}</Text>
          )}
        </View>
        <View style={styles.ctaButtons}>
          <Pressable onPress={handleAddToCart} style={{ flex: 1 }}>
            <View style={styles.addToCartBtn}>
              {added ? (
                <Check size={20} color="#fff" />
              ) : (
                <ShoppingCart size={20} color="#fff" />
              )}
              <Text style={styles.addToCartText}>
                {added ? 'Added!' : 'Add to Cart'}
              </Text>
            </View>
          </Pressable>
          {hasAdded && (
            <Pressable
              style={{ flex: 1 }}
              onPress={() => router.navigate('/tabs/cart')}
            >
              <View style={styles.viewCartBtn}>
                <Text style={styles.viewCartText}>View Cart</Text>
              </View>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // ---- HEADER ----
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.card,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.onSurfaceDeep },

  // ---- HERO ----
  heroContainer: {
    width: '100%',
    aspectRatio: 1.25,
    backgroundColor: Colors.surfaceContainerLow,
    position: 'relative',
  },
  heroImage: { width: SCREEN_W, height: HERO_H },
  heroPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceContainerLow },
  imageDots: {
    position: 'absolute',
    bottom: Spacing.md,
    left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  imageDot: { width: 7, height: 7, borderRadius: 4 },
  imageDotActive: { backgroundColor: Colors.primary },
  imageDotInactive: { backgroundColor: 'rgba(255,255,255,0.7)' },

  // ---- BADGES ----
  badgeGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.sm },
  heroBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BorderRadius.full, alignSelf: 'flex-start',
  },
  heroBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  organicBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.accentMint,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BorderRadius.full, alignSelf: 'flex-start',
  },
  organicBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // ---- CONTENT ----
  content: { padding: Spacing.md },

  // ---- TITLE BLOCK ----
  titleBlock: { marginBottom: Spacing.md },
  productName: { fontSize: 22, fontWeight: '800', color: Colors.onSurfaceDeep, marginBottom: 4 },
  productNameHi: { fontSize: 15, fontWeight: '600', color: Colors.onSurfaceVariant, marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, flexWrap: 'wrap' },
  price: { fontSize: 28, fontWeight: '800', color: Colors.primary },
  priceUnit: { fontSize: 14, color: Colors.onSurfaceVariant, marginBottom: 4 },
  originalPrice: {
    fontSize: 16, fontWeight: '600', color: Colors.outline,
    textDecorationLine: 'line-through', marginBottom: 2,
  },
  discountBadge: {
    backgroundColor: Colors.errorContainer,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  discountText: { fontSize: 11, fontWeight: '700', color: Colors.error },
  originRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 8, backgroundColor: Colors.surfaceContainerLow,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  originText: { fontSize: 12, fontWeight: '600', color: Colors.accentMint },

  // ---- QUANTITY ----
  qtyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.xl,
    padding: Spacing.md, marginBottom: Spacing.md, ...Shadows.card,
  },
  qtyLabel: { fontSize: 15, fontWeight: '600', color: Colors.onSurface },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  qtyBtn: {
    width: 36, height: 36, borderRadius: BorderRadius.full,
    borderWidth: 1.5, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnAdd: {
    width: 40, height: 40, borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  qtyNum: { fontSize: 18, fontWeight: '700', color: Colors.onSurfaceDeep, minWidth: 28, textAlign: 'center' },

  // ---- TRUST BADGES ----
  trustRow: {
    flexDirection: 'row', backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.xl, padding: Spacing.sm,
    marginBottom: Spacing.lg, gap: Spacing.xs,
  },
  trustItem: { flex: 1, alignItems: 'center', gap: 4 },
  trustText: { fontSize: 10, fontWeight: '600', color: Colors.onSurface, textAlign: 'center' },

  // ---- SECTION ----
  section: { marginBottom: Spacing.lg },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: Spacing.sm,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.onSurfaceDeep },

  // ---- DESCRIPTION ----
  descCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl, padding: Spacing.md, ...Shadows.card,
  },

  // ---- HEALTH BENEFITS ----
  benefitsCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: BorderRadius.xl, padding: Spacing.md,
    borderLeftWidth: 3, borderLeftColor: Colors.error,
  },

  // ---- NUTRITION ----
  nutritionCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl, padding: Spacing.md, ...Shadows.card,
  },
  nutritionSubtitle: {
    fontSize: 13, fontWeight: '700', color: Colors.onSurfaceVariant,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  nutrientGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  nutrientItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg, paddingHorizontal: 12, paddingVertical: 8,
    minWidth: '45%',
  },
  nutrientIcon: { fontSize: 20 },
  nutrientValue: { fontSize: 14, fontWeight: '700', color: Colors.onSurfaceDeep },
  nutrientName: { fontSize: 11, color: Colors.onSurfaceVariant, textTransform: 'capitalize' },

  // ---- TIPS ----
  tipsCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.xl, padding: Spacing.md, ...Shadows.card,
  },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  tipDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.primary, marginTop: 6,
  },
  tipText: { flex: 1, fontSize: 13, color: Colors.onSurface, lineHeight: 20 },

  // ---- BOTTOM CTA ----
  ctaBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, gap: Spacing.sm,
    backgroundColor: 'rgba(239,254,235,0.97)',
    borderTopWidth: 1, borderTopColor: Colors.outlineVariant,
  },
  ctaPriceWrap: { minWidth: 80 },
  ctaTotal: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  ctaUnit: { fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 2 },
  ctaButtons: { flex: 1, flexDirection: 'row', gap: Spacing.sm },
  addToCartBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.full,
    height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, ...Shadows.primaryBtn,
  },
  addToCartText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  viewCartBtn: {
    backgroundColor: Colors.surfaceCard, borderWidth: 1.5, borderColor: Colors.primary,
    borderRadius: BorderRadius.full, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  viewCartText: { color: Colors.primary, fontSize: 15, fontWeight: '700' },
});