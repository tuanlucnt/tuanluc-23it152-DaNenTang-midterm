export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

// Cấu hình rõ theo thiết bị, không suy đoán localhost trên điện thoại.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
export type ApiOptions = Omit<RequestInit, 'body'> & { body?: unknown; token?: string };

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  if (!/^https?:\/\//.test(API_URL))
    throw new ApiError('Chưa cấu hình EXPO_PUBLIC_API_URL. Xem hướng dẫn trong README.', 0);
  const { body, token, signal, ...rest } = options;
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, 20000);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...rest.headers,
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok)
      throw new ApiError(
        data?.message || `Yêu cầu thất bại (HTTP ${response.status}).`,
        response.status,
        data?.fields,
      );
    if (data === null) throw new ApiError('Backend trả về dữ liệu không hợp lệ.', 502);
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (signal?.aborted) throw error;
    throw new ApiError(
      controller.signal.aborted
        ? 'Kết nối quá thời gian chờ. Vui lòng thử lại.'
        : 'Không kết nối được API. Kiểm tra backend, URL API, Wi-Fi và cấu hình CORS.',
      0,
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
