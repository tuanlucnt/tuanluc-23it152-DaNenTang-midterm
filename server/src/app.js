import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { once } from 'node:events';
import { HttpError, errorHandler } from './errors.js';
import { parseListQuery, submissionRecord, validateLecturer } from './validation.js';

const jwtOptions = {
  algorithm: 'HS256',
  issuer: 'ql-giang-vien-api',
  audience: 'ql-giang-vien-admin',
};

export function createApp({ config, Model, isReady = () => Model.db.readyState === 1 }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.origins.includes(origin)) callback(null, true);
        else callback(new HttpError(403, 'Nguồn truy cập web chưa được cấu hình CORS.'));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Content-Disposition'],
    }),
  );
  app.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.get('/api/health', (_req, res) => {
    const ready = isReady();
    res.status(ready ? 200 : 503).json({
      status: ready ? 'ok' : 'unavailable',
      database: ready ? 'connected' : 'disconnected',
    });
  });
  const loginLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { message: 'Đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.' },
  });
  app.post('/api/auth/login', loginLimit, express.json({ limit: '4kb' }), async (req, res) => {
    const { username, password } = req.body ?? {};
    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      username.length > 100 ||
      Buffer.byteLength(password) > 72 ||
      !password
    ) {
      throw new HttpError(
        400,
        'Nhập tên đăng nhập và mật khẩu hợp lệ (mật khẩu tối đa 72 byte UTF-8).',
      );
    }
    // Mật khẩu chỉ đọc từ env backend. So sánh byte, không trim mật khẩu.
    const candidate = Buffer.from(password, 'utf8');
    const expected = Buffer.from(config.adminPassword, 'utf8');
    const passwordOK = candidate.length === expected.length && timingSafeEqual(candidate, expected);
    if (!passwordOK || username.trim() !== config.adminUsername)
      throw new HttpError(401, 'Tên đăng nhập hoặc mật khẩu không đúng.');
    const expiresAt = Date.now() + config.ttlMinutes * 60000;
    const token = jwt.sign({ sub: config.adminUsername }, config.jwtSecret, {
      ...jwtOptions,
      expiresIn: config.ttlMinutes * 60,
    });
    res.json({ token, expiresAt, username: config.adminUsername });
  });
  app.use('/api/giang-vien', (req, _res, next) => {
    const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization ?? '');
    if (!match) throw new HttpError(401, 'Vui lòng đăng nhập để tiếp tục.');
    try {
      const payload = jwt.verify(match[1], config.jwtSecret, {
        algorithms: ['HS256'],
        issuer: jwtOptions.issuer,
        audience: jwtOptions.audience,
      });
      if (payload.sub !== config.adminUsername) throw new Error();
    } catch {
      throw new HttpError(
        401,
        'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.',
      );
    }
    if (!isReady()) throw new HttpError(503, 'Mất kết nối cơ sở dữ liệu. Vui lòng thử lại.');
    next();
  });
  app.use('/api/giang-vien', express.json({ limit: '1500kb', strict: true }));
  app.get('/api/giang-vien/export', async (_req, res) => {
    res.type('application/json').attachment('GiangVien.json');
    const controller = new AbortController();
    const disconnected = () => controller.abort();
    res.once('close', disconnected);
    const cursor = Model.find({})
      .sort({ IDGV: 1 })
      .select('IDGV Fullname Image SumClass -_id')
      .lean()
      .cursor();
    try {
      res.write('[\n');
      let first = true;
      for await (const row of cursor) {
        if (res.destroyed) break;
        if (!res.write(`${first ? '' : ',\n'}${JSON.stringify(submissionRecord(row), null, 2)}`))
          await once(res, 'drain', { signal: controller.signal });
        first = false;
      }
      res.end('\n]\n');
    } catch (error) {
      if (!res.destroyed) throw error;
    } finally {
      res.off('close', disconnected);
      await cursor.close();
    }
  });
  app.get('/api/giang-vien', async (req, res) => {
    const { filter, sort, page, limit } = parseListQuery(req.query);
    const [data, total] = await Promise.all([
      Model.find(filter)
        .collation({ locale: 'vi', strength: 2 })
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Model.countDocuments(filter),
    ]);
    res.json({ data, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
  });
  app.param('id', (req, _res, next, id) => {
    if (!mongoose.isObjectIdOrHexString(id))
      throw new HttpError(400, 'Định danh giảng viên không hợp lệ.');
    next();
  });
  app.get('/api/giang-vien/:id', async (req, res) => {
    const row = await Model.findById(req.params.id).lean();
    if (!row) throw new HttpError(404, 'Không tìm thấy giảng viên.');
    res.json(row);
  });
  app.post('/api/giang-vien', async (req, res) => {
    const value = await validateLecturer(req.body);
    const row = await Model.create(value);
    res.status(201).json(row);
  });
  app.put('/api/giang-vien/:id', async (req, res) => {
    const value = await validateLecturer(req.body);
    const row = await Model.findByIdAndUpdate(
      req.params.id,
      { $set: value },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    if (!row) throw new HttpError(404, 'Không tìm thấy giảng viên.');
    res.json(row);
  });
  app.delete('/api/giang-vien/:id', async (req, res) => {
    const row = await Model.findByIdAndDelete(req.params.id);
    if (!row) throw new HttpError(404, 'Không tìm thấy giảng viên.');
    res.json({ message: 'Đã xóa giảng viên.' });
  });
  app.use((_req, _res, next) => next(new HttpError(404, 'Không tìm thấy API.')));
  app.use(errorHandler);
  return app;
}
