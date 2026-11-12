import { useState, type PropsWithChildren, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const colors = {
  ink: '#142E32',
  muted: '#5A7074',
  primary: '#0B7267',
  pale: '#E6F4EF',
  bg: '#F4F7F6',
  line: '#DCE5E2',
  danger: '#AB3030',
  white: '#FFFFFF',
};

export function Button({
  title,
  onPress,
  disabled,
  loading,
  tone = 'primary',
  small = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'primary' | 'secondary' | 'danger';
  small?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        ui.button,
        small && ui.buttonSmall,
        tone === 'secondary' && ui.buttonSecondary,
        tone === 'danger' && ui.buttonDanger,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.75 },
      ]}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={tone === 'secondary' ? colors.primary : colors.white}
        />
      )}
      <Text style={[ui.buttonText, tone === 'secondary' && { color: colors.primary }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  error,
  hint,
  ...props
}: TextInputProps & { label: string; error?: string; hint?: string }) {
  return (
    <View style={ui.field}>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#7B8D8D"
        {...props}
        style={[
          ui.input,
          props.multiline && { minHeight: 78, textAlignVertical: 'top' },
          error ? ui.inputError : undefined,
          props.style,
        ]}
      />
      {error ? (
        <Text accessibilityRole="alert" style={ui.fieldError}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={ui.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}
export function Notice({ text, success = false }: { text: string; success?: boolean }) {
  if (!text) return null;
  return (
    <View
      accessibilityRole="alert"
      style={[ui.notice, success && { backgroundColor: colors.pale, borderColor: '#B5DACA' }]}
    >
      <Text style={{ color: success ? colors.primary : colors.danger, lineHeight: 22 }}>
        {text}
      </Text>
    </View>
  );
}
export function Avatar({ uri, name, size = 56 }: { uri: string; name: string; size?: number }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const style = { width: size, height: size, borderRadius: size / 4 };
  if (uri && failedUri !== uri)
    return (
      <Image
        accessibilityLabel={`Ảnh ${name}`}
        source={{ uri }}
        style={style}
        onError={() => setFailedUri(uri)}
        resizeMode="cover"
      />
    );
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || 'GV';
  return (
    <View
      accessibilityLabel={`Ảnh thay thế ${name}`}
      style={[
        style,
        { backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
      ]}
    >
      <Text style={{ fontSize: size / 3, color: colors.primary, fontWeight: '700' }}>
        {initials}
      </Text>
    </View>
  );
}
export function Page({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  return (
    <SafeAreaView style={ui.page} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.pageContent}>
            {children}
          </ScrollView>
        ) : (
          <View style={[ui.pageContent, { flex: 1 }]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Loading({ label = 'Đang tải dữ liệu…' }: { label?: string }) {
  return (
    <View style={ui.empty}>
      <ActivityIndicator color={colors.primary} />
      <Text style={ui.subtitle}>{label}</Text>
    </View>
  );
}
export function ConfirmDialog({
  visible,
  title,
  children,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  children: ReactNode;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onCancel();
      }}
    >
      <View style={ui.backdrop}>
        <View accessibilityViewIsModal style={ui.dialog}>
          <Text accessibilityRole="header" style={ui.sectionTitle}>
            {title}
          </Text>
          {children}
          <Notice text={error} />
          <View style={ui.actions}>
            <Button title="Hủy" tone="secondary" disabled={busy} onPress={onCancel} />
            <Button title="Xóa giảng viên" tone="danger" loading={busy} onPress={onConfirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  pageContent: {
    width: '100%',
    maxWidth: 1160,
    alignSelf: 'center',
    padding: 20,
    gap: 20,
    flexGrow: 1,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  title: { fontSize: 30, lineHeight: 39, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 15, lineHeight: 23, color: colors.muted },
  sectionTitle: { fontSize: 20, lineHeight: 28, fontWeight: '700', color: colors.ink },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 22,
    gap: 20,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  button: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonSmall: { minHeight: 40, paddingHorizontal: 14, paddingVertical: 9 },
  buttonSecondary: { backgroundColor: colors.pale, borderWidth: 1, borderColor: '#CDE3D9' },
  buttonDanger: { backgroundColor: colors.danger },
  buttonText: { fontSize: 14, fontWeight: '700', color: colors.white },
  field: { gap: 7 },
  label: { fontSize: 14, fontWeight: '700', color: colors.ink },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#BBCDC7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
  },
  inputError: { borderColor: colors.danger },
  hint: { fontSize: 12, lineHeight: 18, color: colors.muted },
  fieldError: { fontSize: 12, lineHeight: 18, color: colors.danger },
  notice: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F2CECA',
    backgroundColor: '#FFF2F0',
  },
  empty: { paddingVertical: 44, paddingHorizontal: 24, gap: 14, alignItems: 'center' },
  backdrop: {
    flex: 1,
    backgroundColor: '#10272599',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 20,
    padding: 24,
    backgroundColor: colors.white,
    gap: 18,
  },
});
