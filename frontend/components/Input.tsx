import { TextInput, type TextInputProps } from 'react-native';

// Placeholder — final design to be implemented later.
export type InputProps = TextInputProps;

export default function Input(props: InputProps) {
  return <TextInput {...props} />;
}
