import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import {
  Avatar,
  Button,
  ConfirmDialog,
  Field,
  Loading,
  Notice,
  Page,
  colors,
  ui,
} from '@/components/ui-kit';
import { useAuth } from '@/context/auth';
import { downloadJSON } from '@/services/download';
import type { Lecturer, LecturerInput, LecturerPage } from '@/types/lecturer';

const sorts = [
  { label: 'Tên A → Z', sort: 'Fullname', order: 'asc' },
  { label: 'Tên Z → A', sort: 'Fullname', order: 'desc' },
  { label: 'Số lớp tăng', sort: 'SumClass', order: 'asc' },
  { label: 'Số lớp giảm', sort: 'SumClass', order: 'desc' },
];

export default function LecturerListScreen() {
  const { request, session, signOut } = useAuth();
  const { saved } = useLocalSearchParams<{ saved?: string }>();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [sortIndex, setSortIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LecturerPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const [target, setTarget] = useState<Lecturer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [exporting, setExporting] = useState(false);
  const deleteLock = useRef(false);
  const exportLock = useRef(false);
  const wide = useWindowDimensions().width >= 850;

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(text.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [text]);

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      setLoading(true);
      setError('');
      const sort = sorts[sortIndex];
      const params = `q=${encodeURIComponent(query)}&sort=${sort.sort}&order=${sort.order}&page=${page}&limit=20`;
      void request<LecturerPage>(`/giang-vien?${params}`, { signal: controller.signal })
        .then((result) => {
          if (controller.signal.aborted) return;
          if (page > result.pages) {
            setPage(result.pages);
            return;
          }
          setData(result);
        })
        .catch((err) => {
          if (!controller.signal.aborted) {
            setError(err instanceof Error ? err.message : 'Không tải được danh sách.');
            setData(null);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
      return () => controller.abort();
      // reload chủ động khởi chạy lại request khi bấm Tải lại hoặc sau khi xóa.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [request, query, sortIndex, page, reload]),
  );

  async function remove() {
    if (!target || deleteLock.current) return;
    deleteLock.current = true;
    setDeleting(true);
    setDeleteError('');
    try {
      await request(`/giang-vien/${encodeURIComponent(target._id)}`, { method: 'DELETE' });
      setTarget(null);
      setNotice(`Đã xóa giảng viên ${target.IDGV}.`);
      setReload((value) => value + 1);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Không xóa được giảng viên.');
    } finally {
      deleteLock.current = false;
      setDeleting(false);
    }
  }
  async function exportData() {
    if (exportLock.current) return;
    exportLock.current = true;
    setExporting(true);
    setError('');
    try {
      const rows = await request<LecturerInput[]>('/giang-vien/export');
      await downloadJSON(rows);
      setNotice(`Đã tạo file GiangVien.json gồm ${rows.length} giảng viên (toàn bộ danh sách).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xuất được JSON.');
    } finally {
      exportLock.current = false;
      setExporting(false);
    }
  }

  const header = (
    <View style={{ gap: 20 }}>
      <View style={styles.topbar}>
        <View style={ui.row}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>GV</Text>
          </View>
          <View>
            <Text style={ui.eyebrow}>QL HỌC PHẦN</Text>
            <Text style={ui.hint}>Phân hệ quản trị</Text>
          </View>
        </View>
        <View style={ui.actions}>
          <Text style={ui.hint}>{session?.username}</Text>
          <Button title="Đăng xuất" tone="secondary" small onPress={() => void signOut()} />
        </View>
      </View>
      <View
        style={[
          styles.heading,
          wide && { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        ]}
      >
        <View style={{ gap: 6 }}>
          <Text accessibilityRole="header" style={ui.title}>
            Quản lý giảng viên
          </Text>
          <Text style={ui.subtitle}>Tra cứu, cập nhật và quản lý hồ sơ giảng viên.</Text>
        </View>
        <View style={ui.actions}>
          {Platform.OS === 'web' && (
            <Button
              title="Xuất JSON"
              tone="secondary"
              loading={exporting}
              onPress={() => void exportData()}
            />
          )}
          <Button title="+ Thêm giảng viên" onPress={() => router.push('/lecturers/new')} />
        </View>
      </View>
      <Notice
        text={
          notice ||
          (saved === 'created'
            ? 'Đã thêm giảng viên thành công.'
            : saved === 'updated'
              ? 'Đã lưu thay đổi thành công.'
              : '')
        }
        success
      />
      <View style={[ui.card, { gap: 14, padding: 18 }]}>
        <Field
          label="Tìm kiếm giảng viên"
          placeholder="Nhập mã hoặc họ tên…"
          value={text}
          onChangeText={setText}
          maxLength={150}
          autoCorrect={false}
        />
        <View style={ui.actions}>
          <Text style={ui.hint}>Sắp xếp:</Text>
          {sorts.map((sort, index) => (
            <Button
              key={sort.label}
              title={sort.label}
              small
              tone={sortIndex === index ? 'primary' : 'secondary'}
              onPress={() => {
                setSortIndex(index);
                setPage(1);
              }}
            />
          ))}
          <Button
            title="Tải lại"
            small
            tone="secondary"
            disabled={loading}
            onPress={() => setReload((value) => value + 1)}
          />
        </View>
      </View>
      {error ? (
        <View style={{ gap: 10 }}>
          <Notice text={error} />
          <Button
            title="Thử lại"
            tone="secondary"
            onPress={() => setReload((value) => value + 1)}
          />
        </View>
      ) : null}
      <View>
        <View style={styles.listTitle}>
          <Text style={ui.sectionTitle}>Danh sách giảng viên</Text>
          <Text style={styles.count}>{loading ? 'Đang tải…' : `${data?.total ?? 0} kết quả`}</Text>
        </View>
        {wide && (
          <View style={styles.tableHead}>
            <Text style={[styles.headText, { width: 70 }]}>HÌNH ẢNH</Text>
            <Text style={[styles.headText, { width: 115 }]}>MÃ GV</Text>
            <Text style={[styles.headText, { flex: 1 }]}>HỌ VÀ TÊN</Text>
            <Text style={[styles.headText, { width: 95 }]}>TỔNG LỚP</Text>
            <Text style={[styles.headText, { width: 145 }]}>THAO TÁC</Text>
          </View>
        )}
      </View>
    </View>
  );
  return (
    <Page scroll={false}>
      <FlatList
        data={loading ? [] : (data?.data ?? [])}
        keyExtractor={(item) => item._id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        refreshing={loading}
        onRefresh={() => setReload((value) => value + 1)}
        ListEmptyComponent={
          loading ? (
            <Loading />
          ) : (
            <View style={ui.empty}>
              <Text style={ui.sectionTitle}>
                {error
                  ? 'Chưa tải được dữ liệu'
                  : query
                    ? 'Không tìm thấy giảng viên'
                    : 'Chưa có giảng viên'}
              </Text>
              <Text style={[ui.subtitle, { textAlign: 'center' }]}>
                {error
                  ? 'Kiểm tra kết nối và bấm Thử lại.'
                  : query
                    ? 'Thử một mã hoặc tên khác.'
                    : 'Bấm Thêm giảng viên để tạo hồ sơ đầu tiên.'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={ui.hint}>
              Trang {data?.page ?? page} / {data?.pages ?? 1} · 20 hồ sơ/trang
            </Text>
            <View style={ui.actions}>
              <Button
                title="Trước"
                small
                tone="secondary"
                disabled={loading || page <= 1}
                onPress={() => setPage(page - 1)}
              />
              <Button
                title="Sau"
                small
                tone="secondary"
                disabled={loading || !data || page >= data.pages}
                onPress={() => setPage(page + 1)}
              />
            </View>
          </View>
        }
        renderItem={({ item }) =>
          wide ? (
            <View style={styles.tableRow}>
              <View style={{ width: 70 }}>
                <Avatar uri={item.Image} name={item.Fullname} size={44} />
              </View>
              <Text style={[styles.code, { width: 115 }]}>{item.IDGV}</Text>
              <Text style={[styles.name, { flex: 1 }]}>{item.Fullname}</Text>
              <Text style={[styles.classText, { width: 95 }]}>{item.SumClass}</Text>
              <View style={[ui.actions, { width: 145 }]}>
                <Button
                  title="Sửa"
                  small
                  tone="secondary"
                  onPress={() =>
                    router.push({ pathname: '/lecturers/[id]', params: { id: item._id } })
                  }
                />
                <Button
                  title="Xóa"
                  small
                  tone="danger"
                  onPress={() => {
                    setTarget(item);
                    setDeleteError('');
                  }}
                />
              </View>
            </View>
          ) : (
            <View style={styles.mobileCard}>
              <View style={ui.row}>
                <Avatar uri={item.Image} name={item.Fullname} />
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={styles.code}>{item.IDGV}</Text>
                  <Text style={styles.name}>{item.Fullname}</Text>
                  <Text style={ui.subtitle}>Tổng số lớp: {item.SumClass}</Text>
                </View>
              </View>
              <View style={ui.actions}>
                <Button
                  title="Sửa thông tin"
                  small
                  tone="secondary"
                  onPress={() =>
                    router.push({ pathname: '/lecturers/[id]', params: { id: item._id } })
                  }
                />
                <Button
                  title="Xóa"
                  small
                  tone="danger"
                  onPress={() => {
                    setTarget(item);
                    setDeleteError('');
                  }}
                />
              </View>
            </View>
          )
        }
      />
      <ConfirmDialog
        visible={!!target}
        title="Xóa giảng viên?"
        busy={deleting}
        error={deleteError}
        onCancel={() => setTarget(null)}
        onConfirm={() => void remove()}
      >
        <Text style={ui.subtitle}>
          Bạn có chắc muốn xóa {target?.Fullname} ({target?.IDGV})? Thao tác này xóa hồ sơ khỏi cơ
          sở dữ liệu.
        </Text>
      </ConfirmDialog>
    </Page>
  );
}
const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: colors.white, fontSize: 18, fontWeight: '800' },
  heading: { gap: 16 },
  listTitle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    padding: 18,
  },
  count: {
    backgroundColor: colors.pale,
    color: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontWeight: '700',
    fontSize: 12,
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#EFF5F2',
  },
  headText: { color: colors.muted, fontWeight: '700', fontSize: 11 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.white,
  },
  code: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  name: { color: colors.ink, fontWeight: '700', fontSize: 16, lineHeight: 23 },
  classText: { color: colors.ink, fontSize: 17, fontWeight: '600' },
  mobileCard: {
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 14,
    backgroundColor: colors.white,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
