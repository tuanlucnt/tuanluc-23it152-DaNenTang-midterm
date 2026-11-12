import { useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Button, Field, Notice, Page, colors, ui } from '@/components/ui-kit';
import { useAuth } from '@/context/auth';

export default function LoginScreen() {
  const { signIn, message, clearMessage } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const wide = useWindowDimensions().width >= 820;
  async function submit() {
    if (lock.current) return;
    setError('');
    clearMessage();
    if (!username.trim() || !password) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      await signIn(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đăng nhập.');
    } finally {
      setPassword('');
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Page>
      <View style={[styles.layout, wide && { flexDirection: 'row' }]}>
        <View style={[styles.hero, wide && { flex: 1 }]}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>GV</Text>
          </View>
          <Text style={ui.eyebrow}>QUẢN LÝ GIẢNG VIÊN</Text>
          <Text accessibilityRole="header" style={styles.heroTitle}>
            Thông tin tập trung. Quản lý thuận tiện.
          </Text>
          <Text style={ui.subtitle}>
            Không gian quản trị hồ sơ giảng viên, hình ảnh và tổng số lớp trên web và điện thoại.
          </Text>
          <View style={styles.feature}>
            <Text style={styles.number}>01</Text>
            <Text style={[ui.subtitle, { flex: 1 }]}>Tra cứu và cập nhật hồ sơ giảng viên</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.number}>02</Text>
            <Text style={[ui.subtitle, { flex: 1 }]}>Chọn ảnh và đồng bộ giữa các thiết bị</Text>
          </View>
          <Text style={ui.hint}>PHÂN HỆ ADMIN · QL HỌC PHẦN</Text>
        </View>
        <View style={[ui.card, styles.form, wide && { width: 410 }]}>
          <Text style={ui.eyebrow}>CHÀO MỪNG TRỞ LẠI</Text>
          <Text accessibilityRole="header" style={ui.title}>
            Đăng nhập admin
          </Text>
          <Text style={ui.subtitle}>Sử dụng tài khoản quản trị đã được cấu hình để tiếp tục.</Text>
          <Notice text={error || message} />
          <Field
            label="Tên đăng nhập"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            maxLength={100}
            editable={!busy}
            placeholder="Nhập tên đăng nhập"
          />
          <Field
            label="Mật khẩu"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            editable={!busy}
            placeholder="Nhập mật khẩu"
            onSubmitEditing={() => void submit()}
            returnKeyType="go"
          />
          <Button
            title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            tone="secondary"
            small
            disabled={busy}
            onPress={() => setShowPassword(!showPassword)}
          />
          <Button title="Đăng nhập" loading={busy} onPress={() => void submit()} />
          <Text style={ui.hint}>
            Phiên đăng nhập có thời hạn. Hãy đăng xuất sau khi sử dụng trên thiết bị dùng chung.
          </Text>
        </View>
      </View>
    </Page>
  );
}
const styles = StyleSheet.create({
  layout: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: 32,
    paddingVertical: 28,
  },
  hero: { gap: 22, justifyContent: 'center', padding: 12 },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: 'white', fontWeight: '800', fontSize: 24 },
  heroTitle: { color: colors.ink, fontSize: 38, fontWeight: '800', lineHeight: 48 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  number: {
    color: colors.primary,
    fontWeight: '800',
    backgroundColor: colors.pale,
    padding: 10,
    borderRadius: 10,
  },
  form: { justifyContent: 'center', padding: 28 },
});
