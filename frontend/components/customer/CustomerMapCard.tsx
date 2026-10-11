import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { cc, cf, cr } from '../../constants/customerTheme';

type Props = {
  variant: 'confirmation' | 'tracker';
  etaMinutes?: number;
  vehicle?: string;
  badgeText?: string;
};

// Map preview card matching Figma booking_image.jpeg and order.jpeg
export default function CustomerMapCard({
  variant,
  etaMinutes = 14,
  vehicle = 'Bajaj CT100 NP-BF 4412',
  badgeText,
}: Props) {
  const isTracker = variant === 'tracker';

  return (
    <View style={styles.card} accessible accessibilityLabel={isTracker ? `Live GPS active: ${vehicle}` : `Est. Arrival: ${etaMinutes} mins`}>
      {/* Map visual background simulation */}
      <View style={styles.mapCanvas}>
        {/* Road grid lines */}
        <View style={styles.roadH} />
        <View style={styles.roadV} />
        <View style={styles.roadDiagonal} />
        
        {/* Map pins and route */}
        <View style={styles.routeDot1} />
        <View style={styles.routeDot2} />
        <View style={styles.routeDot3} />

        {/* Motorcycle / Transit marker */}
        <View style={styles.vehicleMarker}>
          <MaterialCommunityIcons name="motorbike" size={18} color="#FFFFFF" />
        </View>

        {/* Destination Pin */}
        <View style={styles.destMarker}>
          <Ionicons name="location-sharp" size={20} color={cc.amberBright} />
        </View>
      </View>

      {/* Floating Info Overlay */}
      <View style={styles.overlay}>
        {isTracker ? (
          <View style={styles.trackerRow}>
            <View style={styles.gpsPill}>
              <View style={styles.pulseDot} />
              <Text style={styles.gpsText}>{badgeText ?? 'Live GPS Active'}</Text>
            </View>
            <View style={styles.vehiclePill}>
              <MaterialCommunityIcons name="motorbike" size={14} color={cc.text} />
              <Text style={styles.vehicleText}>{vehicle}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.confirmRow}>
            <View style={styles.etaPill}>
              <Ionicons name="time" size={14} color="#FFFFFF" />
              <Text style={styles.etaText}>Est. Arrival: {etaMinutes} mins</Text>
            </View>
            <View style={styles.dispatchedPill}>
              <View style={styles.greenDot} />
              <Text style={styles.dispatchedText}>Dispatch En Route</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: cr.lg,
    overflow: 'hidden',
    backgroundColor: '#E5EDF0',
    borderWidth: 1,
    borderColor: cc.outlineSoft,
    height: 140,
    position: 'relative',
    marginVertical: 4,
  },
  mapCanvas: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#EAF0F2',
    overflow: 'hidden',
  },
  roadH: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#D4DFE2',
  },
  roadV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 90,
    width: 12,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#D4DFE2',
  },
  roadDiagonal: {
    position: 'absolute',
    top: 20,
    left: 40,
    width: 140,
    height: 8,
    backgroundColor: '#D1E3F8',
    transform: [{ rotate: '35deg' }],
  },
  routeDot1: {
    position: 'absolute',
    top: 50,
    left: 110,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: cc.primary,
  },
  routeDot2: {
    position: 'absolute',
    top: 70,
    left: 140,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: cc.primary,
  },
  routeDot3: {
    position: 'absolute',
    top: 85,
    left: 180,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: cc.primary,
  },
  vehicleMarker: {
    position: 'absolute',
    top: 48,
    left: 80,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: cc.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  destMarker: {
    position: 'absolute',
    top: 48,
    right: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
  },
  trackerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  gpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 88, 133, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: cr.full,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#6FFBBE',
  },
  gpsText: {
    fontFamily: cf.semibold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  vehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: cr.full,
  },
  vehicleText: {
    fontFamily: cf.semibold,
    fontSize: 12,
    color: cc.text,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  etaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 88, 133, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: cr.full,
  },
  etaText: {
    fontFamily: cf.semibold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  dispatchedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: cr.full,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: cc.success,
  },
  dispatchedText: {
    fontFamily: cf.semibold,
    fontSize: 11,
    color: cc.text,
  },
});
