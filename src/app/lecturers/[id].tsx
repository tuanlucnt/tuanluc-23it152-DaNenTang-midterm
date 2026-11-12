import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { LecturerForm } from '@/components/lecturer-form';
import { Button, Loading, Notice, Page, ui } from '@/components/ui-kit';
import { useAuth } from '@/context/auth';
import type { Lecturer } from '@/types/lecturer';

export default function EditLecturerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Editor key={id} id={id} />;
}

function Editor({ id }: { id: string }) {
  const { request } = useAuth();
  const [record, setRecord] = useState<Lecturer | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void request<Lecturer>(`/giang-vien/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) setRecord(value);
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : 'Không tải được hồ sơ.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, request, attempt]);
  return (
    <Page>
      <Text style={ui.eyebrow}>DANH SÁCH / CHỈNH SỬA</Text>
      <Text accessibilityRole="header" style={ui.title}>
        Sửa giảng viên
      </Text>
      <Text style={ui.subtitle}>Cập nhật mã, họ tên, hình ảnh và tổng số lớp của giảng viên.</Text>
      {loading ? (
        <Loading />
      ) : error ? (
        <>
          <Notice text={error} />
          <Button
            title="Thử lại"
            onPress={() => {
              setLoading(true);
              setError('');
              setRecord(null);
              setAttempt(attempt + 1);
            }}
          />
          <Button title="Về danh sách" tone="secondary" onPress={() => router.replace('/')} />
        </>
      ) : record ? (
        <LecturerForm
          key={record._id}
          initial={record}
          editing
          onCancel={() => router.replace('/')}
          onSave={async (value) => {
            await request<Lecturer>(`/giang-vien/${encodeURIComponent(record._id)}`, {
              method: 'PUT',
              body: value,
            });
            router.replace({ pathname: '/', params: { saved: 'updated' } });
          }}
        />
      ) : null}
    </Page>
  );
}
