import sharp from 'sharp';
import { HttpError } from './errors.js';

export const FIELDS = ['IDGV', 'Fullname', 'Image', 'SumClass'];
export const MAX_IMAGE_BYTES = 1024 * 1024;

export async function validateImage(value) {
  if (value === '') return;
  if (typeof value !== 'string') throw new Error('Ảnh phải là chuỗi.');
  if (value.startsWith('https://')) {
    try {
      const url = new URL(value);
      if (
        url.protocol === 'https:' &&
        url.hostname &&
        !url.username &&
        !url.password &&
        value.length <= 2048
      )
        return;
    } catch {
      /* Hiển thị thông báo chung bên dưới. */
    }
    throw new Error('URL ảnh HTTPS không hợp lệ.');
  }
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0)
    throw new Error('Chỉ nhận ảnh JPEG, PNG, WebP dạng Base64 hoặc URL HTTPS.');
  if (match[2].length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4)
    throw new Error('Ảnh sau nén phải không quá 1 MiB.');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > MAX_IMAGE_BYTES || bytes.toString('base64') !== match[2])
    throw new Error('Dung lượng hoặc Base64 của ảnh không hợp lệ.');
  try {
    const image = sharp(bytes, { limitInputPixels: 16_777_216, failOn: 'warning' });
    const metadata = await image.metadata();
    if (
      metadata.format !== match[1] ||
      !metadata.width ||
      !metadata.height ||
      (metadata.pages ?? 1) > 1
    )
      throw new Error();
    await image.stats(); // Giải mã thật, không chỉ tin MIME và phần đầu file.
  } catch {
    throw new Error('Ảnh bị hỏng, sai định dạng, có nhiều khung hình hoặc quá 16 megapixel.');
  }
}

export async function validateLecturer(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new HttpError(400, 'Cần gửi một đối tượng JSON.');
  if (Object.keys(body).some((key) => !FIELDS.includes(key)))
    throw new HttpError(400, 'Chỉ chấp nhận IDGV, Fullname, Image, SumClass.');
  const fields = {};
  const IDGV = typeof body.IDGV === 'string' ? body.IDGV.trim() : '';
  const Fullname = typeof body.Fullname === 'string' ? body.Fullname.trim() : '';
  if (!IDGV || IDGV.length > 50) fields.IDGV = 'Mã giảng viên bắt buộc, tối đa 50 ký tự.';
  if (!Fullname || Fullname.length > 150) fields.Fullname = 'Họ tên bắt buộc, tối đa 150 ký tự.';
  if (
    typeof body.SumClass !== 'number' ||
    !Number.isSafeInteger(body.SumClass) ||
    body.SumClass < 0
  ) {
    fields.SumClass = 'Tổng số lớp phải là số nguyên không âm trong phạm vi số nguyên an toàn.';
  }
  if (typeof body.Image !== 'string')
    fields.Image = 'Cần trường Image dạng chuỗi (có thể để trống).';
  else {
    try {
      await validateImage(body.Image);
    } catch (error) {
      fields.Image = error.message;
    }
  }
  if (Object.keys(fields).length)
    throw new HttpError(400, 'Vui lòng kiểm tra dữ liệu nhập.', fields);
  return { IDGV, Fullname, Image: body.Image, SumClass: body.SumClass };
}

export function parseListQuery(query) {
  if (Object.keys(query).some((key) => !['q', 'sort', 'order', 'page', 'limit'].includes(key)))
    throw new HttpError(400, 'Tham số truy vấn không hợp lệ.');
  const q = query.q ?? '';
  const sort = query.sort ?? 'Fullname';
  const order = query.order ?? 'asc';
  if (
    typeof q !== 'string' ||
    q.length > 150 ||
    !['Fullname', 'SumClass'].includes(sort) ||
    !['asc', 'desc'].includes(order)
  ) {
    throw new HttpError(400, 'Tìm kiếm hoặc sắp xếp không hợp lệ.');
  }
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 100000 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 50
  ) {
    throw new HttpError(400, 'Trang phải từ 1 đến 100000; số dòng từ 1 đến 50.');
  }
  const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    filter: escaped
      ? {
          $or: [
            { IDGV: { $regex: escaped, $options: 'i' } },
            { Fullname: { $regex: escaped, $options: 'i' } },
          ],
        }
      : {},
    sort: { [sort]: order === 'asc' ? 1 : -1, _id: 1 },
    page,
    limit,
  };
}

export function submissionRecord(row) {
  if (!FIELDS.every((key) => Object.hasOwn(row, key))) {
    throw new HttpError(
      409,
      'Có bản ghi thiếu trường nghiệp vụ. Kiểm tra dữ liệu trước khi xuất JSON.',
    );
  }
  return { IDGV: row.IDGV, Fullname: row.Fullname, Image: row.Image, SumClass: row.SumClass };
}
