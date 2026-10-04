import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import BookingCard from '../../components/BookingCard';
import Button from '../../components/Button';
import FormMessage from '../../components/FormMessage';
import Loading from '../../components/Loading';
import ProviderCard from '../../components/ProviderCard';
import Screen from '../../components/Screen';
import StatusBadge from '../../components/StatusBadge';
import { colors, radius, spacing } from '../../constants/theme';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../hooks/useAuth';
import { bookingService } from '../../services/bookingService';
import { providerService } from '../../services/providerService';
import type { Booking } from '../../types/booking';
import {
  CATEGORIES,
  CATEGORY_META,
  confirmAction,
  formatBookingDate,
  formatTimeSlot,
} from '../../utils/display';
import { formatLKR, getFriendlyErrorMessage, getGreeting } from '../../utils/helpers';

const ACTIVE: Booking['status'][] = ['requested', 'confirmed', 'on_the_way'];

// Home / Service Discovery (Milestone 02, Variant A): search, service
// categories and recommended providers together for quick discovery (NFR1).
export default function CustomerHome() {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState('');

  const { data, error, loading, refreshing, reload } = useAsync(
    () =>
      Promise.all([
        providerService.categories(),
        providerService.list({ sort: 'rating', limit: 3 }),
        bookingService.listMine('all'),
      ]),
    [],
  );

  // Refresh bookings when returning to Home (e.g. after booking or cancelling).
  useFocusEffect(
    useCallback(() => {
      if (data) void reload(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [!!data]),
  );

  const handleSearch = () => {
    router.push({ pathname: '/customer/provider-list', params: search.trim() ? { search: search.trim() } : {} });
  };

  const handleLogout = async () => {
    if (await confirmAction('Sign out', 'Do you want to sign out of FIX & CLEAN CO.?', 'Sign out')) {
      await logout();
    }
  };

  if (loading && !data) return <Loading message="Loading services…" />;

  const [categories = [], recommended = [], bookings = []] = data ?? [];
  const activeBookings = bookings.filter((b) => ACTIVE.includes(b.status));
  const pastBookings = bookings.filter((b) => !ACTIVE.includes(b.status)).slice(0, 3);
  const firstName = user?.name.split(' ')[0] ?? '';

  return (
    <Screen
      edges={['top']}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload(true)} />}
    >
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons name="construct" size={18} color={colors.white} />
          </View>
          <View>
            <Text style={styles.brandSmall}>FIX & CLEAN CO.</Text>
            <Text style={styles.brandTitle}>Explore services</Text>
          </View>
        </View>
        <Pressable
          onPress={handleLogout}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          hitSlop={8}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.greeting}>
        <Text style={styles.greetingText}>
          {getGreeting()}, {firstName}
        </Text>
        <Text style={styles.greetingSub}>What do you need help with today?</Text>
      </View>

      {/* Search (UI-04: search made prominent) */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search plumbers, electricians, cleaners…"
          placeholderTextColor={colors.textSubtle}
          style={styles.searchInput}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          accessibilityLabel="Search providers"
        />
        <Pressable onPress={handleSearch} style={styles.searchButton} accessibilityRole="button" accessibilityLabel="Search">
          <Ionicons name="arrow-forward" size={18} color={colors.white} />
        </Pressable>
      </View>

      {error ? (
        <FormMessage message={getFriendlyErrorMessage(error)} />
      ) : null}

      {/* Active booking — Track Booking made prominent (UI-01) */}
      {activeBookings.map((booking) => (
        <View key={booking.id} style={styles.activeCard}>
          <View style={styles.activeHeader}>
            <Text style={styles.activeLabel}>YOUR ACTIVE BOOKING</Text>
            <StatusBadge status={booking.status} />
          </View>
          <Text style={styles.activeTitle}>{booking.service.name}</Text>
          <Text style={styles.activeSub}>
            {booking.provider.name} · {formatBookingDate(booking.scheduledDate, false)},{' '}
            {formatTimeSlot(booking.timeSlot)}
          </Text>
          <Button
            title="TRACK BOOKING"
            icon="navigate-outline"
            variant="secondary"
            onPress={() => router.push({ pathname: '/customer/track-booking', params: { id: booking.id } })}
          />
        </View>
      ))}

      {/* Categories */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <Pressable onPress={() => router.push('/customer/provider-list')} accessibilityRole="link">
            <Text style={styles.sectionLink}>View all</Text>
          </Pressable>
        </View>
        <View style={styles.categories}>
          {CATEGORIES.map((key) => {
            const meta = CATEGORY_META[key];
            const summary = categories.find((c) => c.category === key);
            return (
              <Pressable
                key={key}
                style={({ pressed }) => [styles.categoryCard, pressed && { opacity: 0.85 }]}
                onPress={() => router.push({ pathname: '/customer/provider-list', params: { category: key } })}
                accessibilityRole="button"
                accessibilityLabel={`${meta.label}, ${summary?.providerCount ?? 0} providers`}
              >
                <View style={[styles.categoryIcon, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon} size={22} color={meta.tint} />
                </View>
                <Text style={styles.categoryName}>{meta.label}</Text>
                <Text style={styles.categoryPrice}>
                  {summary?.startingPrice != null ? `From ${formatLKR(summary.startingPrice)}` : 'Coming soon'}
                </Text>
                <Text style={styles.categoryCount}>
                  {summary?.providerCount ?? 0} verified {summary?.providerCount === 1 ? 'pro' : 'pros'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Recommended providers */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended for you</Text>
          <Text style={styles.sectionHint}>Top rated</Text>
        </View>
        {recommended.length === 0 ? (
          <Text style={styles.empty}>No verified providers are available yet.</Text>
        ) : (
          recommended.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onPress={() => router.push({ pathname: '/customer/provider-details', params: { id: provider.id } })}
            />
          ))
        )}
      </View>

      {/* Booking history */}
      {pastBookings.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Past bookings</Text>
          {pastBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onPress={() => router.push({ pathname: '/customer/track-booking', params: { id: booking.id } })}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandSmall: { fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 0.5 },
  brandTitle: { fontSize: 17, fontWeight: '800', color: colors.navy },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: { gap: 2 },
  greetingText: { fontSize: 22, fontWeight: '800', color: colors.text },
  greetingSub: { fontSize: 14, color: colors.textMuted },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingLeft: spacing.md,
    paddingRight: 6,
    minHeight: 52,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: spacing.sm },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  activeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeLabel: { fontSize: 11, fontWeight: '800', color: '#CFE2F5', letterSpacing: 0.8 },
  activeTitle: { fontSize: 18, fontWeight: '800', color: colors.white },
  activeSub: { fontSize: 13, color: '#DCEAF7', marginBottom: spacing.xs },
  section: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  sectionLink: { fontSize: 13, fontWeight: '700', color: colors.primary },
  sectionHint: { fontSize: 12, color: colors.textMuted },
  categories: { flexDirection: 'row', gap: spacing.sm },
  categoryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  categoryName: { fontSize: 15, fontWeight: '700', color: colors.text },
  categoryPrice: { fontSize: 12, fontWeight: '600', color: colors.primary },
  categoryCount: { fontSize: 11, color: colors.textMuted },
  empty: { fontSize: 14, color: colors.textMuted },
});
