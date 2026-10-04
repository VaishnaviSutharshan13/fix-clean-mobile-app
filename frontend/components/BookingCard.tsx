import { Text, View } from 'react-native';

import type { Booking } from '../types/booking';

// Placeholder — final design to be implemented later.
export type BookingCardProps = {
  booking: Booking;
};

export default function BookingCard({ booking }: BookingCardProps) {
  return (
    <View>
      <Text>{booking.serviceType}</Text>
    </View>
  );
}
