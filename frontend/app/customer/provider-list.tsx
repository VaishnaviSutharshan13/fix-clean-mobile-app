import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import Chip from '../../components/Chip';
import Header from '../../components/Header';
import Loading from '../../components/Loading';
import ProviderCard from '../../components/ProviderCard';
import Screen from '../../components/Screen';
import StateView from '../../components/StateView';
import { colors, radius, spacing } from '../../constants/theme';
import { useAsync } from '../../hooks/useAsync';
import { providerService } from '../../services/providerService';
import type { ProviderSort, ServiceCategory } from '../../types/provider';
import { CATEGORIES, CATEGORY_META } from '../../utils/display';
import { getFriendlyErrorMessage } from '../../utils/helpers';

const SORTS: { key: ProviderSort; label: string }[] = [
  { key: 'rating', label: 'Top rated' },
  { key: 'price', label: 'Lowest price' },
  { key: 'experience', label: 'Most experienced' },
];

function isCategory(value: unknown): value is ServiceCategory {
  return typeof value === 'string' && (CATEGORIES as string[]).includes(value);
}

// Provider List (Milestone 02, Variant A): verified providers with ratings,
// reviews and pricing. Search and filters are kept prominent (UI-04).
export default function ProviderList() {
  const params = useLocalSearchParams<{ category?: string; search?: string }>();
  const [category, setCategory] = useState<ServiceCategory | undefined>(
    isCategory(params.category) ? params.category : undefined,
  );
  const [searchInput, setSearchInput] = useState(params.search ?? '');
  const [search, setSearch] = useState(params.search ?? '');
  const [sort, setSort] = useState<ProviderSort>('rating');

  // Debounce typing so we don't query on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: providers, error, loading, refreshing, reload } = useAsync(
    () => providerService.list({ category, search: search || undefined, sort }),
    [category, search, sort],
  );

  const title = category ? `${CATEGORY_META[category].trade}` : 'All providers';

  return (
    <Screen
      header={<Header title="Find a Provider" />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload(true)} />}
    >
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search by name, service or area (e.g. Jaffna)"
          placeholderTextColor={colors.textSubtle}
          style={styles.searchInput}
          returnKeyType="search"
          onSubmitEditing={() => setSearch(searchInput.trim())}
          accessibilityLabel="Search providers"
          autoCorrect={false}
        />
        {searchInput ? (
          <Pressable onPress={() => setSearchInput('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={20} color={colors.textSubtle} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Service</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="All" selected={!category} onPress={() => setCategory(undefined)} />
          {CATEGORIES.map((key) => (
            <Chip
              key={key}
              label={CATEGORY_META[key].label}
              icon={CATEGORY_META[key].icon}
              selected={category === key}
              onPress={() => setCategory(key)}
            />
          ))}
        </ScrollView>
        <Text style={styles.filterLabel}>Sort by</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {SORTS.map((s) => (
            <Chip key={s.key} label={s.label} selected={sort === s.key} onPress={() => setSort(s.key)} />
          ))}
        </ScrollView>
      </View>

      {loading && !providers ? (
        <Loading message="Finding verified providers…" />
      ) : error ? (
        <StateView
          title="Couldn't load providers"
          message={getFriendlyErrorMessage(error)}
          actionLabel="Try again"
          onAction={() => reload()}
        />
      ) : providers && providers.length > 0 ? (
        <>
          <Text style={styles.count} accessibilityLiveRegion="polite">
            Showing <Text style={styles.countStrong}>{providers.length}</Text> verified{' '}
            {providers.length === 1 ? 'specialist' : 'specialists'} · {title}
            {search ? ` matching “${search}”` : ''}
          </Text>
          {providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onPress={() => router.push({ pathname: '/customer/provider-details', params: { id: provider.id } })}
            />
          ))}
        </>
      ) : (
        <StateView
          icon="search-outline"
          title="No providers found"
          message="Try a different search term or service category."
          actionLabel={search || category ? 'Clear filters' : undefined}
          onAction={() => {
            setSearchInput('');
            setSearch('');
            setCategory(undefined);
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: spacing.sm },
  filterGroup: { gap: spacing.sm },
  filterLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.4 },
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
  count: { fontSize: 13, color: colors.textMuted },
  countStrong: { fontWeight: '800', color: colors.text },
});
