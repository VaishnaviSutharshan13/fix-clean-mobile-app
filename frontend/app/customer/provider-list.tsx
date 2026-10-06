import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import Loading from '../../components/Loading';
import StateView from '../../components/StateView';
import CustomerBottomNav from '../../components/customer/CustomerBottomNav';
import { CustomerTopBar } from '../../components/customer/CustomerHeader';
import CustomerProviderCard from '../../components/customer/CustomerProviderCard';
import CustomerScreen from '../../components/customer/CustomerScreen';
import { cardShadow, cc, cf, cr, GUTTER } from '../../constants/customerTheme';
import { useAsync } from '../../hooks/useAsync';
import { providerService } from '../../services/providerService';
import type { ProviderSort, ServiceCategory } from '../../types/provider';
import { CATEGORIES, CATEGORY_META, sriLankaToday } from '../../utils/display';
import { isAvailableToday } from '../../utils/nextSlot';
import { getFriendlyErrorMessage } from '../../utils/helpers';

const SORTS: { key: ProviderSort; label: string }[] = [
  { key: 'rating', label: 'Recommended' },
  { key: 'price', label: 'Lowest price' },
  { key: 'experience', label: 'Most experienced' },
];

function isCategory(value: unknown): value is ServiceCategory {
  return typeof value === 'string' && (CATEGORIES as string[]).includes(value);
}

// Provider List matching Figma (workers.jpeg):
// Back button, search, Filter button, service / on-duty chips,
// Result count with green dot, "Sort: Recommended ▾",
// Detailed provider cards with strip, "Fix & Clean Guarantee" with thumbs up.
export default function ProviderList() {
  const params = useLocalSearchParams<{ category?: string; search?: string }>();
  const [category, setCategory] = useState<ServiceCategory | undefined>(
    isCategory(params.category) ? params.category : undefined,
  );
  const [searchInput, setSearchInput] = useState(params.search ?? '');
  const [search, setSearch] = useState(params.search ?? '');
  const [sort, setSort] = useState<ProviderSort>('rating');
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [onDutyOnly, setOnDutyOnly] = useState(false);
  const [area, setArea] = useState<string>();
  const [areaOpen, setAreaOpen] = useState(false);
  const [todayOnly, setTodayOnly] = useState(false);
  const today = sriLankaToday().date;

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, error, loading, refreshing, reload } = useAsync(
    () => providerService.list({ category, search: search || undefined, sort }),
    [category, search, sort],
  );

  // Areas offered by the loaded providers (for the location chip).
  const areas = [...new Set((data ?? []).map((p) => p.serviceArea))].sort();
  const providers = data
    ? data.filter((p) => {
        if (onDutyOnly && !p.isAvailable) return false;
        if (area && p.serviceArea !== area) return false;
        if (todayOnly && !isAvailableToday(p.nextSlot, today)) return false;
        return true;
      })
    : undefined;

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setCategory(undefined);
    setOnDutyOnly(false);
    setArea(undefined);
    setTodayOnly(false);
  };

  const sortLabel = SORTS.find((s) => s.key === sort)!.label;
  const scope = category ? CATEGORY_META[category].trade : 'specialists';

  return (
    <CustomerScreen
      header={<CustomerTopBar />}
      bottomNav={<CustomerBottomNav active="explore" />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload(true)} />}
      contentStyle={styles.content}
    >
      {/* Back button + Search + Filter row */}
      <View style={styles.searchRow}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/customer/home'))}
          style={styles.roundBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={cc.text} />
        </Pressable>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={cc.textMuted} />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search name, service or area"
            placeholderTextColor={cc.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={() => setSearch(searchInput.trim())}
            accessibilityLabel="Search providers"
            autoCorrect={false}
          />
          {searchInput ? (
            <Pressable onPress={() => setSearchInput('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={cc.textSubtle} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={() => setFilterOpen((o) => !o)}
          style={[styles.filterBtn, (filterOpen || onDutyOnly) && styles.filterBtnOn]}
          accessibilityRole="button"
          accessibilityState={{ expanded: filterOpen }}
          accessibilityLabel="Filter providers"
        >
          <Ionicons name="options-outline" size={18} color={cc.primary} />
          <Text style={styles.filterText}>Filter</Text>
        </Pressable>
      </View>

      {filterOpen ? (
        <Pressable
          onPress={() => setOnDutyOnly((v) => !v)}
          style={styles.filterPanel}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: onDutyOnly }}
          accessibilityLabel="Show only providers accepting bookings"
        >
          <View style={[styles.checkbox, onDutyOnly && styles.checkboxOn]}>
            {onDutyOnly ? <Ionicons name="checkmark" size={16} color={cc.onPrimary} /> : null}
          </View>
          <View style={styles.flex}>
            <Text style={styles.filterPanelTitle}>Accepting bookings only</Text>
            <Text style={styles.filterPanelSub}>Hide providers who are currently off duty</Text>
          </View>
        </Pressable>
      ) : null}

      {/* Filter chips: location (service area), available today, service categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipScroll}
      >
        <Pressable
          onPress={() => setAreaOpen((o) => !o)}
          style={[styles.chip, styles.chipDarkSelected]}
          accessibilityRole="button"
          accessibilityState={{ expanded: areaOpen }}
          accessibilityLabel={`Location: ${area ?? 'all areas'}. Change location`}
        >
          <Ionicons name="location" size={14} color={cc.onPrimary} />
          <Text style={[styles.chipText, styles.chipTextWhite]}>{area ?? 'All areas'}</Text>
          <Ionicons name={areaOpen ? 'chevron-up' : 'chevron-down'} size={13} color={cc.onPrimary} />
        </Pressable>

        <Pressable
          onPress={() => setTodayOnly((v) => !v)}
          style={[styles.chip, todayOnly && styles.chipSelected]}
          accessibilityRole="button"
          accessibilityState={{ selected: todayOnly }}
          accessibilityLabel="Available today"
        >
          <Text style={[styles.chipText, todayOnly && styles.chipTextSelected]}>Available Today</Text>
        </Pressable>

        <Pressable
          onPress={() => setCategory(undefined)}
          style={[styles.chip, !category && styles.chipSelected]}
          accessibilityRole="button"
          accessibilityState={{ selected: !category }}
        >
          <Text style={[styles.chipText, !category && styles.chipTextSelected]}>All services</Text>
        </Pressable>

        {CATEGORIES.map((key) => (
          <Pressable
            key={key}
            onPress={() => setCategory((c) => (c === key ? undefined : key))}
            style={[styles.chip, category === key && styles.chipSelected]}
            accessibilityRole="button"
            accessibilityState={{ selected: category === key }}
          >
            <Text style={[styles.chipText, category === key && styles.chipTextSelected]}>
              {CATEGORY_META[key].label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {areaOpen ? (
        <View style={styles.areaMenu} accessibilityRole="menu">
          {[undefined, ...areas].map((value) => {
            const selected = value === area;
            return (
              <Pressable
                key={value ?? 'all'}
                onPress={() => {
                  setArea(value);
                  setAreaOpen(false);
                }}
                style={[styles.areaItem, selected && styles.areaItemOn]}
                accessibilityRole="menuitem"
                accessibilityState={{ selected }}
              >
                <Ionicons name="location-outline" size={16} color={selected ? cc.primary : cc.textMuted} />
                <Text style={[styles.areaText, selected && styles.areaTextOn]}>{value ?? 'All areas'}</Text>
                {selected ? <Ionicons name="checkmark" size={18} color={cc.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Result count with green dot + sort pill dropdown */}
      <View style={styles.resultRow}>
        <View style={styles.countWrap}>
          <View style={styles.countDot} />
          <Text style={styles.count} accessibilityLiveRegion="polite">
            Showing <Text style={styles.countStrong}>{providers?.length ?? 0}</Text> verified {scope}
          </Text>
        </View>
        <Pressable
          onPress={() => setSortOpen((o) => !o)}
          style={styles.sortPill}
          accessibilityRole="button"
          accessibilityState={{ expanded: sortOpen }}
          accessibilityLabel={`Sort: ${sortLabel}`}
        >
          <Text style={styles.sortLabel}>Sort: </Text>
          <Text style={styles.sortValue}>{sortLabel}</Text>
          <Ionicons name={sortOpen ? 'caret-up' : 'caret-down'} size={12} color={cc.primary} />
        </Pressable>
      </View>

      {sortOpen ? (
        <View style={styles.sortMenu} accessibilityRole="menu">
          {SORTS.map((s) => {
            const selected = s.key === sort;
            return (
              <Pressable
                key={s.key}
                onPress={() => {
                  setSort(s.key);
                  setSortOpen(false);
                }}
                style={[styles.sortItem, selected && styles.sortItemOn]}
                accessibilityRole="menuitem"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.sortItemText, selected && styles.sortItemTextOn]}>{s.label}</Text>
                {selected ? <Ionicons name="checkmark" size={18} color={cc.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* List of Provider Cards */}
      {loading && !data ? (
        <Loading message="Finding verified specialists…" />
      ) : error ? (
        <StateView
          title="Couldn't load providers"
          message={getFriendlyErrorMessage(error)}
          actionLabel="Try again"
          onAction={() => reload()}
        />
      ) : providers && providers.length > 0 ? (
        providers.map((provider) => (
          <CustomerProviderCard
            key={provider.id}
            provider={provider}
            variant="list"
            onOpen={() => router.push({ pathname: '/customer/provider-details', params: { id: provider.id } })}
          />
        ))
      ) : (
        <StateView
          icon="search-outline"
          title="No providers found"
          message={`No specialists match these filters. Try adjusting your search.`}
          actionLabel={search || category || onDutyOnly || area || todayOnly ? 'Clear filters' : undefined}
          onAction={clearFilters}
        />
      )}

      {/* Trust card: statements the app enforces */}
      <View style={styles.guaranteeCard}>
        <View style={styles.guaranteeIcon}>
          <Ionicons name="thumbs-up" size={24} color={cc.amber} />
        </View>
        <View style={styles.guaranteeTextWrap}>
          <Text style={styles.guaranteeTitle}>Fix &amp; Clean Promise</Text>
          <Text style={styles.guaranteeMessage}>
            Every provider is verified by our admin team before they can be booked, and you pay in cash only after the job.
          </Text>
        </View>
      </View>
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingTop: 12, paddingBottom: 24 },
  flex: { flex: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: cc.containerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: cc.container,
    borderRadius: cr.md,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: cf.body,
    fontSize: 14,
    color: cc.text,
    paddingVertical: 8,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: cc.container,
    borderRadius: cr.md,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  filterBtnOn: { borderColor: cc.primary, borderWidth: 1.5 },
  filterText: { fontFamily: cf.semibold, fontSize: 14, color: cc.primary },
  filterPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: cc.card,
    borderRadius: cr.md,
    padding: 14,
    borderWidth: 1,
    borderColor: cc.outlineSoft,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: cc.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: cc.primary },
  filterPanelTitle: { fontFamily: cf.semibold, fontSize: 14, color: cc.text },
  filterPanelSub: { fontFamily: cf.body, fontSize: 12, color: cc.textMuted },
  chipScroll: { marginHorizontal: -GUTTER, flexGrow: 0 },
  chips: { gap: 8, paddingHorizontal: GUTTER },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: cc.containerHigh,
    borderRadius: cr.full,
    paddingHorizontal: 14,
    minHeight: 38,
  },
  chipDarkSelected: { backgroundColor: '#005885' },
  chipSelected: { backgroundColor: cc.primary },
  chipText: { fontFamily: cf.medium, fontSize: 13, color: cc.text },
  chipTextWhite: { fontFamily: cf.semibold, color: '#FFFFFF' },
  chipTextSelected: { fontFamily: cf.semibold, color: cc.onPrimary },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  countWrap: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  countDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: cc.success },
  count: { flex: 1, fontFamily: cf.medium, fontSize: 14, color: cc.text },
  countStrong: { fontFamily: cf.heading, fontSize: 16 },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: cc.containerHigh,
    borderRadius: cr.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sortLabel: { fontFamily: cf.body, fontSize: 13, color: cc.textMuted },
  sortValue: { fontFamily: cf.semibold, fontSize: 13, color: cc.primary },
  sortMenu: {
    backgroundColor: cc.card,
    borderRadius: cr.md,
    borderWidth: 1,
    borderColor: cc.outlineSoft,
    overflow: 'hidden',
    ...cardShadow,
  },
  sortItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    minHeight: 44,
  },
  sortItemOn: { backgroundColor: cc.containerLow },
  sortItemText: { fontFamily: cf.medium, fontSize: 14, color: cc.text },
  sortItemTextOn: { fontFamily: cf.semibold, color: cc.primary },
  guaranteeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: cc.container,
    borderRadius: cr.lg,
    padding: 16,
    marginTop: 6,
  },
  guaranteeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: cc.amberSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guaranteeTextWrap: { flex: 1, gap: 3 },
  guaranteeTitle: { fontFamily: cf.headingSemi, fontSize: 16, color: cc.text },
  guaranteeMessage: { fontFamily: cf.body, fontSize: 13, lineHeight: 18, color: cc.textMuted },
  areaMenu: { backgroundColor: cc.card, borderRadius: cr.md, borderWidth: 1, borderColor: cc.outlineSoft, overflow: 'hidden' },
  areaItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: 44 },
  areaItemOn: { backgroundColor: cc.containerLow },
  areaText: { flex: 1, fontFamily: cf.medium, fontSize: 15, color: cc.text },
  areaTextOn: { fontFamily: cf.semibold, color: cc.primary },
});
