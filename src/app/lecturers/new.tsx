import { router } from 'expo-router';
import { Text } from 'react-native';
import { LecturerForm } from '@/components/lecturer-form';
import { Page, ui } from '@/components/ui-kit';
import { useAuth } from '@/context/auth';
import type { Lecturer } from '@/types/lecturer';

export default function NewLecturerScreen() {
  const { request } = useAuth();
  return (
    <Page>
      <Text style={ui.eyebrow}>DANH SÁCH / THÊM MỚI</Text>
      <Text accessibilityRole="header" style={ui.title}>
        Thêm giảng viên
      </Text>
      <Text style={ui.subtitle}>
        Điền thông tin và chọn ảnh cho hồ sơ mới. Các trường có dấu * là bắt buộc.
      </Text>
      <LecturerForm
        onCancel={() => router.replace('/')}
        onSave={async (value) => {
          await request<Lecturer>('/giang-vien', { method: 'POST', body: value });
          router.replace({ pathname: '/', params: { saved: 'created' } });
        }}
      />
    </Page>
  );
}
