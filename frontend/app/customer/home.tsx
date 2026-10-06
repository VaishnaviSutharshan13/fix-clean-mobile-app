import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import BookingCard from '../../components/BookingCard';
import FormMessage from '../../components/FormMessage';
import Loading from '../../components/Loading';
import CustomerAvatar from '../../components/customer/CustomerAvatar';
import CustomerBottomNav from '../../components/customer/CustomerBottomNav';
import { CustomerTopBar } from '../../components/customer/CustomerHeader';
import { SectionTitle } from '../../components/customer/CustomerPrimitives';
import CustomerProviderCard from '../../components/customer/CustomerProviderCard';
import CustomerScreen from '../../components/customer/CustomerScreen';
import { cardShadow, CATEGORY_TONE, cc, cf, cr } from '../../constants/customerTheme';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../hooks/useAuth';
import { bookingService } from '../../services/bookingService';
import { providerService } from '../../services/providerService';
import type { Booking } from '../../types/booking';
import type { ServiceCategory } from '../../types/provider';
import { CATEGORIES, CATEGORY_META, formatBookingDate, formatTimeSlot, STATUS_META } from '../../utils/display';
import { formatLKR, getFriendlyErrorMessage, getGreeting } from '../../utils/helpers';
import { photoUri } from '../../services/userService';

const ACTIVE: Booking['status'][] = ['requested', 'confirmed', 'on_the_way'];

const CATEGORY_BLURB: Record<ServiceCategory, string> = {
  plumbing: 'Leaks, Taps & Pipes',
  electrical: 'Wiring, Meter & AC',
  cleaning: 'Deep clean & sanitize',
};

// Fast Dispatch / Active Booking Banner
function Banner({ booking }: { booking?: Booking }) {
  const onPress = booking
    ? () => router.push({ pathname: '/customer/track-booking', params: { id: booking.id } })
    : () => router.push('/customer/provider-list');
  const label = booking ? `ACTIVE BOOKING • ${STATUS_META[booking.status].label.toUpperCase()}` : 'VERIFIED PROS';
  const title = booking ? booking.service.name : 'Home Repairs & Cleaning';
  const sub = booking
    ? `${booking.provider.name} • ${formatBookingDate(booking.scheduledDate, false)}, ${formatTimeSlot(booking.timeSlot).split(' – ')[0]}`
    : 'Book trusted plumbers, electricians & cleaners';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.banner, pressed && { opacity: 0.94 }]}
      accessibilityRole="button"
      accessibilityLabel={booking ? `Active booking ${booking.reference}: ${title}, ${sub}. Track booking` : `${title}. ${sub}`}
    >
      <View style={styles.bannerCircle} />
      <View style={styles.bannerText}>
        <View style={styles.bannerPill}>
          <Ionicons name={booking ? 'pulse' : 'flash'} size={12} color={cc.onPrimary} />
          <Text style={styles.bannerPillText} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <Text style={styles.bannerTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.bannerSub} numberOfLines={2}>
          {sub}
        </Text>
      </View>
      <View style={styles.bannerIcon}>
        <Ionicons name={booking ? 'navigate-outline' : 'home-outline'} size={26} color={cc.onPrimary} />
      </View>
    </Pressable>
  );
}

// Customer Home matching Figma (homepage.jpeg)
export default function CustomerHome() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ section?: string }>();
  const [search, setSearch] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const bookingsY = useRef(0);

  const { data, error, loading, refreshing, reload } = useAsync(
    () =>
      Promise.all([
        providerService.categories(),
        providerService.list({ sort: 'rating', limit: 3 }),
        bookingService.listMine('all'),
      ]),
    [],
  );

  useFocusEffect(
    useCallback(() => {
      if (data) void reload(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [!!data]),
  );

  const scrollToBookings = useCallback(() => {
    scrollRef.current?.scrollTo({ y: Math.max(0, bookingsY.current - 8), animated: true });
  }, []);

  useEffect(() => {
    if (params.section === 'bookings' && data) {
      const timer = setTimeout(scrollToBookings, 150);
      router.setParams({ section: undefined });
      return () => clearTimeout(timer);
    }
  }, [params.section, data, scrollToBookings]);

  const handleSearch = () => {
    router.push({ pathname: '/customer/provider-list', params: search.trim() ? { search: search.trim() } : {} });
  };

  if (loading && !data) return <Loading message="Loading services…" />;

  const [categories = [], recommended = [], bookings = []] = data ?? [];
  const activeBookings = bookings.filter((b) => ACTIVE.includes(b.status));
  // Area of the customer's most recent booking (real data; no location tracking).
  const lastCity = bookings[0]?.address.city;
  const recentBookings = [...activeBookings, ...bookings.filter((b) => !ACTIVE.includes(b.status))].slice(0, 5);

  return (
    <CustomerScreen
      header={<CustomerTopBar />}
      bottomNav={<CustomerBottomNav active="explore" onBookings={scrollToBookings} />}
      scrollRef={scrollRef}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload(true)} />}
      contentStyle={styles.content}
    >
      {/* Greeting Row matching Figma homepage.jpeg */}
      <View style={styles.greetingRow}>
        <View style={styles.greetingText}>
          <View style={styles.greetingNameRow}>
            <Text style={styles.greeting} numberOfLines={1}>
              {getGreeting()}, {user?.name ?? ''}
            </Text>
          </View>
          <View style={styles.greetingSubRow}>
            <Ionicons name="location-sharp" size={15} color={cc.amberBright} />
            {lastCity ? (
              <>
                <Text style={styles.greetingLocation}>{lastCity}</Text>
                <View style={styles.verifiedAreaPill}>
                  <Text style={styles.verifiedAreaText}>Last booking</Text>
                </View>
              </>
            ) : (
              <Text style={styles.greetingLocation}>What do you need help with today?</Text>
            )}
          </View>
        </View>
        <CustomerAvatar
          imageUrl={photoUri(user?.avatarUrl)}
          name={user?.name ?? 'Customer'}
          size={52}
          shape="circle"
          online
          ring
          bg={cc.containerHigh}
        />
      </View>

      {/* Search Input */}
      <View style={styles.search}>
        <Ionicons name="search" size={21} color={cc.primary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search plumbers, electricians..."
          placeholderTextColor={cc.textSubtle}
          style={styles.searchInput}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          accessibilityLabel="Search providers"
        />
        <Pressable
          onPress={handleSearch}
          style={styles.filterBtn}
          accessibilityRole="button"
          accessibilityLabel="Filter providers"
          hitSlop={6}
        >
          <Ionicons name="options-outline" size={20} color={cc.primary} />
        </Pressable>
      </View>

      {error ? <FormMessage message={getFriendlyErrorMessage(error)} /> : null}

      {/* Active booking (track it) or an invitation to browse providers */}
      {activeBookings.length > 0 ? activeBookings.map((b) => <Banner key={b.id} booking={b} />) : <Banner />}

      {/* Categories Section */}
      <View style={styles.section}>
        <SectionTitle
          title="CATEGORIES"
          upper
          dot
          right={
            <Pressable
              onPress={() => router.push('/customer/provider-list')}
              accessibilityRole="link"
              hitSlop={8}
              style={styles.viewAll}
            >
              <Text style={styles.viewAllText}>VIEW ALL ({categories.reduce((n, c) => n + c.providerCount, 0)})</Text>
              <Ionicons name="chevron-forward" size={14} color={cc.primary} />
            </Pressable>
          }
        />
        <View style={styles.categories}>
          {CATEGORIES.map((key) => {
            const tone = CATEGORY_TONE[key];
            const summary = categories.find((c) => c.category === key);
            return (
              <Pressable
                key={key}
                style={({ pressed }) => [styles.categoryCard, pressed && { opacity: 0.9 }]}
                onPress={() => router.push({ pathname: '/customer/provider-list', params: { category: key } })}
                accessibilityRole="button"
                accessibilityLabel={`${CATEGORY_META[key].label}, from ${
                  summary?.startingPrice != null ? formatLKR(summary.startingPrice) : 'no providers yet'
                }`}
              >
                <View style={[styles.categoryIcon, { backgroundColor: tone.bg }]}>
                  <MaterialCommunityIcons name={tone.icon} size={24} color={tone.tint} />
                </View>
                <Text style={styles.categoryName} numberOfLines={1}>
                  {CATEGORY_META[key].label}
                </Text>
                <Text style={[styles.categoryPrice, { color: tone.price }]}>
                  {summary?.startingPrice != null ? `From ${formatLKR(summary.startingPrice)}` : 'Coming soon'}
                </Text>
                <Text style={styles.categoryBlurb}>{CATEGORY_BLURB[key]}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Recommended For You Section */}
      <View style={styles.section}>
        <SectionTitle
          title="RECOMMENDED FOR YOU"
          upper
          right={
            <View style={styles.regionPill}>
              <Ionicons name="star" size={12} color={cc.primary} />
              <Text style={styles.regionPillText}>Top rated</Text>
            </View>
          }
        />
        {recommended.length === 0 ? (
          <Text style={styles.empty}>No verified providers are available yet.</Text>
        ) : (
          recommended.map((provider) => (
            <CustomerProviderCard
              key={provider.id}
              provider={provider}
              variant="recommended"
              onOpen={() => router.push({ pathname: '/customer/provider-details', params: { id: provider.id } })}
              onBook={() => router.push({ pathname: '/customer/book-service', params: { providerId: provider.id } })}
            />
          ))
        )}
      </View>

      {/* My Bookings Section */}
      <View
        style={styles.section}
        onLayout={(e) => {
          bookingsY.current = e.nativeEvent.layout.y;
        }}
      >
        <SectionTitle title="MY BOOKINGS" upper />
        {recentBookings.length === 0 ? (
          <Text style={styles.empty}>No bookings yet. Choose a provider above to book your first service.</Text>
        ) : (
          recentBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onPress={() => router.push({ pathname: '/customer/track-booking', params: { id: booking.id } })}
            />
          ))
        )}
      </View>

      {/* Trust strip: statements the app enforces */}
      <View style={styles.trust} accessible accessibilityLabel="Admin verified providers, transparent rates, cash on service">
        <View style={styles.trustItem}>
          <Ionicons name="shield-checkmark-outline" size={18} color={cc.success} />
          <Text style={styles.trustText}>Admin{'\n'}Verified</Text>
        </View>
        <View style={styles.trustDivider} />
        <View style={styles.trustItem}>
          <MaterialCommunityIcons name="currency-usd" size={18} color={cc.primary} />
          <Text style={styles.trustText}>Transparent{'\n'}Rates</Text>
        </View>
        <View style={styles.trustDivider} />
        <View style={styles.trustItem}>
          <Ionicons name="headset-outline" size={18} color={cc.amber} />
          <Text style={styles.trustText}>Cash on{'\n'}Service</Text>
        </View>
      </View>
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 18, paddingTop: 14, paddingBottom: 24 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  greetingText: { flex: 1, minWidth: 0, gap: 4 },
  greetingNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  greeting: { fontFamily: cf.headingSemi, fontSize: 20, color: cc.text, letterSpacing: -0.3 },
  greetingSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  greetingLocation: { fontFamily: cf.semibold, fontSize: 13, color: cc.amber },
  verifiedAreaPill: {
    backgroundColor: cc.amberSoft,
    borderRadius: cr.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  verifiedAreaText: { fontFamily: cf.semibold, fontSize: 11, color: cc.amber },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: cc.card,
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 8,
    minHeight: 52,
    ...cardShadow,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: cf.body,
    fontSize: 15,
    color: cc.text,
    paddingVertical: 10,
  },
  filterBtn: {
    width: 38,
    height: 38,
    borderRadius: cr.sm + 2,
    backgroundColor: cc.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#006BA5',
    borderRadius: cr.lg,
    paddingHorizontal: 16,
    paddingVertical: 18,
    overflow: 'hidden',
  },
  bannerCircle: {
    position: 'absolute',
    right: -40,
    bottom: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bannerText: { flex: 1, minWidth: 0, gap: 6 },
  bannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: cr.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  bannerPillText: { fontFamily: cf.semibold, fontSize: 11, color: cc.onPrimary, letterSpacing: 0.8, flexShrink: 1 },
  bannerTitle: { fontFamily: cf.headingSemi, fontSize: 20, color: cc.onPrimary },
  bannerSub: { fontFamily: cf.body, fontSize: 13, color: '#DCEEFA' },
  bannerIcon: {
    width: 50,
    height: 50,
    borderRadius: cr.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: 12 },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText: { fontFamily: cf.semibold, fontSize: 13, color: cc.primary, letterSpacing: 0.4 },
  categories: { flexDirection: 'row', gap: 10 },
  categoryCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: cc.card,
    borderRadius: cr.lg,
    padding: 10,
    paddingBottom: 12,
    gap: 4,
    ...cardShadow,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: cr.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryName: { fontFamily: cf.headingSemi, fontSize: 16, color: cc.text },
  categoryPrice: { fontFamily: cf.semibold, fontSize: 12 },
  categoryBlurb: { fontFamily: cf.body, fontSize: 11, lineHeight: 15, color: cc.textMuted },
  regionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: cc.containerHigh,
    borderRadius: cr.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  regionPillText: { fontFamily: cf.semibold, fontSize: 12, color: cc.primary },
  empty: { fontFamily: cf.body, fontSize: 14, color: cc.textMuted },
  trust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: cc.containerLow,
    borderRadius: cr.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  trustItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  trustDivider: { width: 1, height: 26, backgroundColor: cc.outlineSoft },
  trustText: { fontFamily: cf.medium, fontSize: 11, lineHeight: 15, color: cc.textMuted },
});
