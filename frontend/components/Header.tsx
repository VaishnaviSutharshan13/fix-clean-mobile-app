import { Text, View } from 'react-native';

// Placeholder — final design to be implemented later.
export type HeaderProps = {
  title: string;
};

export default function Header({ title }: HeaderProps) {
  return (
    <View>
      <Text>{title}</Text>
    </View>
  );
}
