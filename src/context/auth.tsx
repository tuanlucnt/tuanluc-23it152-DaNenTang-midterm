import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';
import { ApiError, apiRequest, type ApiOptions } from '@/services/api';
import { readSession, writeSession } from '@/services/session-storage';
import type { Session } from '@/types/lecturer';

type AuthValue = {
  session: Session | null;
  ready: boolean;
  message: string;
  clearMessage: () => void;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: (reason?: string) => Promise<void>;
  request: <T>(path: string, options?: ApiOptions) => Promise<T>;
};
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const storageQueue = useRef(Promise.resolve());
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  // Tuần tự hóa lưu/xóa để phiên cũ không ghi đè lần đăng nhập mới.
  const persist = useCallback((value: string | null) => {
    const operation = storageQueue.current.catch(() => {}).then(() => writeSession(value));
    storageQueue.current = operation;
    return operation;
  }, []);
  const signOut = useCallback(
    async (reason = '') => {
      sessionRef.current = null;
      setSession(null);
      setMessage(reason);
      try {
        await persist(null);
      } catch {
        setMessage(
          'Đã kết thúc phiên. Không xóa được bộ nhớ token; kiểm tra quyền lưu trữ của thiết bị/trình duyệt.',
        );
      }
    },
    [persist],
  );

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const raw = await readSession();
        if (!active || !raw) return;
        const saved: Session = JSON.parse(raw);
        if (
          typeof saved.token === 'string' &&
          typeof saved.username === 'string' &&
          Number.isFinite(saved.expiresAt) &&
          saved.expiresAt > Date.now()
        ) {
          sessionRef.current = saved;
          setSession(saved);
        } else await signOut('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } catch {
        if (active) await signOut('Không thể khôi phục phiên. Vui lòng đăng nhập lại.');
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [signOut]);

  useEffect(() => {
    if (!session) return;
    const checkExpiry = () => {
      if (session.expiresAt <= Date.now())
        void signOut('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    };
    const timeout = setTimeout(
      checkExpiry,
      Math.min(Math.max(session.expiresAt - Date.now(), 0), 2147483647),
    );
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkExpiry();
    });
    return () => {
      clearTimeout(timeout);
      subscription.remove();
    };
  }, [session, signOut]);

  const signIn = useCallback(
    async (username: string, password: string) => {
      const next = await apiRequest<Session>('/auth/login', {
        method: 'POST',
        body: { username, password },
      });
      try {
        await persist(JSON.stringify(next));
      } catch {
        throw new Error(
          'Không lưu được phiên đăng nhập. Vui lòng cho phép bộ nhớ của ứng dụng/trình duyệt.',
        );
      }
      sessionRef.current = next;
      setSession(next);
      setMessage('');
    },
    [persist],
  );

  const request = useCallback(
    async <T,>(path: string, options: ApiOptions = {}): Promise<T> => {
      const current = sessionRef.current;
      if (!current || current.expiresAt <= Date.now()) {
        await signOut('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        throw new ApiError('Vui lòng đăng nhập lại.', 401);
      }
      try {
        return await apiRequest<T>(path, { ...options, token: current.token });
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.status === 401 &&
          sessionRef.current?.token === current.token
        )
          await signOut(error.message);
        throw error;
      }
    },
    [signOut],
  );

  const value = useMemo(
    () => ({
      session,
      ready,
      message,
      clearMessage: () => setMessage(''),
      signIn,
      signOut,
      request,
    }),
    [session, ready, message, signIn, signOut, request],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('Thiếu AuthProvider.');
  return context;
}
