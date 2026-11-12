import { useRef, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { Avatar, Button, Field, Notice, ui } from '@/components/ui-kit';
import { ApiError } from '@/services/api';
import { pickPhoto } from '@/services/photo';
import type { LecturerInput } from '@/types/lecturer';

export function LecturerForm({
  initial,
  onSave,
  onCancel,
  editing = false,
}: {
  initial?: LecturerInput;
  onSave: (value: LecturerInput) => Promise<void>;
  onCancel: () => void;
  editing?: boolean;
}) {
  const [id, setId] = useState(initial?.IDGV ?? '');
  const [name, setName] = useState(initial?.Fullname ?? '');
  const [classes, setClasses] = useState(initial ? String(initial.SumClass) : '0');
  const [image, setImage] = useState(initial?.Image ?? '');
  const [url, setUrl] = useState(initial?.Image.startsWith('https://') ? initial.Image : '');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const lock = useRef(false);
  const photoLock = useRef(false);
  const wide = useWindowDimensions().width >= 780;

  async function choosePhoto() {
    if (photoLock.current || lock.current) return;
    photoLock.current = true;
    setPicking(true);
    setError('');
    try {
      const next = await pickPhoto();
      if (next !== null) {
        setImage(next);
        setUrl('');
        setFields((prev) => ({ ...prev, Image: '' }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không chọn được ảnh.');
    } finally {
      photoLock.current = false;
      setPicking(false);
    }
  }

  async function submit() {
    if (lock.current || photoLock.current) return;
    const nextFields: Record<string, string> = {};
    if (!id.trim() || id.trim().length > 50)
      nextFields.IDGV = 'Nhập mã giảng viên, tối đa 50 ký tự.';
    if (!name.trim() || name.trim().length > 150)
      nextFields.Fullname = 'Nhập họ tên, tối đa 150 ký tự.';
    if (!/^\d+$/.test(classes.trim()) || !Number.isSafeInteger(Number(classes)))
      nextFields.SumClass = 'Nhập số nguyên không âm hợp lệ.';
    setFields(nextFields);
    setError('');
    if (Object.keys(nextFields).length) return;
    lock.current = true;
    setBusy(true);
    try {
      await onSave({
        IDGV: id.trim(),
        Fullname: name.trim(),
        Image: image,
        SumClass: Number(classes),
      });
    } catch (err) {
      if (err instanceof ApiError && err.fields) setFields(err.fields);
      setError(err instanceof Error ? err.message : 'Không lưu được giảng viên.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function applyUrl() {
    try {
      const parsed = new URL(url.trim());
      if (
        parsed.protocol !== 'https:' ||
        !parsed.hostname ||
        parsed.username ||
        parsed.password ||
        url.trim().length > 2048
      )
        throw new Error();
      setImage(url.trim());
      setFields((prev) => ({ ...prev, Image: '' }));
      setError('');
    } catch {
      setError('Nhập một URL ảnh HTTPS hợp lệ rồi bấm Dùng URL.');
    }
  }

  return (
    <View style={{ gap: 20 }}>
      <Notice text={error} />
      <View style={[{ gap: 22 }, wide && { flexDirection: 'row', alignItems: 'flex-start' }]}>
        <View style={[ui.card, { gap: 20 }, wide && { flex: 1 }]}>
          <Text style={ui.sectionTitle}>Thông tin giảng viên</Text>
          <Field
            label="Mã giảng viên · IDGV *"
            placeholder="Ví dụ: GV002"
            value={id}
            onChangeText={setId}
            maxLength={50}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!busy && !picking}
            error={fields.IDGV}
            hint="Mã duy nhất. Có thể thay đổi khi sửa hồ sơ."
          />
          <Field
            label="Họ và tên · Fullname *"
            placeholder="Nhập đầy đủ họ tên"
            value={name}
            onChangeText={setName}
            maxLength={150}
            autoCapitalize="words"
            editable={!busy && !picking}
            error={fields.Fullname}
          />
          <Field
            label="Tổng số lớp · SumClass *"
            placeholder="0"
            value={classes}
            onChangeText={setClasses}
            keyboardType="number-pad"
            editable={!busy && !picking}
            error={fields.SumClass}
            hint="Số nguyên từ 0 trở lên."
          />
        </View>
        <View style={[ui.card, wide && { width: 340 }]}>
          <Text style={ui.sectionTitle}>Hình ảnh · Image</Text>
          <View style={{ alignItems: 'center', gap: 12 }}>
            <Avatar uri={image} name={name || 'Giảng viên'} size={150} />
            <Text style={ui.hint}>
              {image ? 'Ảnh xem trước' : 'Chưa có ảnh · dùng ảnh thay thế'}
            </Text>
          </View>
          <Button
            title="Chọn ảnh từ thiết bị"
            tone="secondary"
            loading={picking}
            disabled={busy}
            onPress={() => void choosePhoto()}
          />
          <Text style={ui.hint}>
            Ảnh gốc tối đa 10 MiB. Tự resize cạnh dài tối đa 768 px và nén JPEG 72%; ảnh lưu tối đa
            1 MiB.
          </Text>
          <Field
            label="Hoặc URL ảnh HTTPS"
            placeholder="https://…"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!busy && !picking}
            maxLength={2048}
          />
          <View style={ui.actions}>
            <Button
              title="Dùng URL"
              small
              tone="secondary"
              disabled={busy || picking}
              onPress={applyUrl}
            />
            <Button
              title="Bỏ ảnh"
              small
              tone="secondary"
              disabled={busy || picking || !image}
              onPress={() => {
                setImage('');
                setUrl('');
              }}
            />
          </View>
          {fields.Image ? <Text style={ui.fieldError}>{fields.Image}</Text> : null}
          <Text style={ui.hint}>
            Khi sửa, ảnh hiện tại được giữ nguyên nếu bạn không thay hoặc bỏ ảnh. URL chỉ được áp
            dụng sau khi bấm Dùng URL.
          </Text>
        </View>
      </View>
      <View style={ui.actions}>
        <Button
          title={editing ? 'Lưu thay đổi' : 'Thêm giảng viên'}
          loading={busy}
          disabled={picking}
          onPress={() => void submit()}
        />
        <Button
          title="Hủy và về danh sách"
          tone="secondary"
          disabled={busy || picking}
          onPress={onCancel}
        />
      </View>
    </View>
  );
}
