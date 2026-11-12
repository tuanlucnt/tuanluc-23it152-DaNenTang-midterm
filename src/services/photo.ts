import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

export async function pickPhoto(): Promise<string | null> {
  // Android dùng system photo picker, không cần quyền đọc toàn bộ thư viện.
  // Web phải mở picker ngay trong sự kiện bấm, không await quyền trước đó.
  if (Platform.OS === 'ios') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted)
      throw new Error(
        'Chưa được cấp quyền ảnh. Hãy cho phép truy cập ảnh trong Cài đặt rồi thử lại.',
      );
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    allowsMultipleSelection: false,
    quality: 1,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if ((asset.fileSize ?? 0) > 10 * 1024 * 1024)
    throw new Error('Vui lòng chọn ảnh gốc không quá 10 MiB.');
  if (!asset.width || !asset.height)
    throw new Error('Không đọc được kích thước ảnh. Hãy chọn ảnh khác.');
  const scale = Math.min(1, 768 / Math.max(asset.width, asset.height));
  const context = ImageManipulator.manipulate(asset.uri, { maxWidth: 1024, maxHeight: 1024 });
  context.resize({
    width: Math.max(1, Math.round(asset.width * scale)),
    height: Math.max(1, Math.round(asset.height * scale)),
  });
  let rendered: Awaited<ReturnType<typeof context.renderAsync>> | undefined;
  try {
    rendered = await context.renderAsync();
    const compressed = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.72,
      base64: true,
    });
    if (!compressed.base64) throw new Error('Không chuyển được ảnh sang Base64.');
    if (compressed.base64.length > Math.ceil((1024 * 1024) / 3) * 4)
      throw new Error('Ảnh sau nén vẫn quá 1 MiB. Vui lòng chọn ảnh nhỏ hơn.');
    return `data:image/jpeg;base64,${compressed.base64}`;
  } finally {
    rendered?.release();
    context.release();
  }
}
