import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import sharp from 'sharp';
import { createApp } from '../src/app.js';
import { lecturerModel, prepareCollection } from '../src/database.js';
import { loadConfig } from '../src/config.js';

// Không đọc MONGODB_URI, không có tùy chọn dùng Atlas. Chỉ dùng mongod tạm ở localhost.
const dbName = `QLHocPhan_test_${randomUUID().replaceAll('-', '')}`;
const password = randomBytes(18).toString('hex');
const config = {
  adminUsername: `test_${randomUUID()}`,
  adminPassword: password,
  jwtSecret: randomBytes(48).toString('hex'),
  ttlMinutes: 60,
  origins: ['http://localhost:8081'],
};
let mongo, connection, Model, api, token, image;
const fixture = { IDGV: 'GV001', Fullname: 'Ngô Lê Quân', Image: '', SumClass: 5 };
const auth = (request) => request.set('Authorization', `Bearer ${token}`);
const uniqueCode = () => `T${randomUUID().replaceAll('-', '').slice(0, 12)}`;
async function createRow(overrides = {}) {
  const value = {
    IDGV: uniqueCode(),
    Fullname: 'Giảng viên kiểm thử',
    Image: '',
    SumClass: 3,
    ...overrides,
  };
  const response = await auth(api.post('/api/giang-vien')).send(value).expect(201);
  return response.body;
}

before(
  async () => {
    mongo = await MongoMemoryServer.create({ instance: { dbName } });
    connection = await mongoose
      .createConnection(mongo.getUri(), { dbName, autoIndex: false, autoCreate: false })
      .asPromise();
    assert.match(connection.host, /127\.0\.0\.1|localhost/);
    assert.notEqual(connection.name, 'QLHocPhan');
    Model = lecturerModel(connection);
    await prepareCollection(Model);
    await Model.create(fixture); // Fixture giả lập, chỉ có trong database kiểm thử tạm.
    api = supertest(createApp({ config, Model }));
    const login = await api
      .post('/api/auth/login')
      .send({ username: config.adminUsername, password })
      .expect(200);
    token = login.body.token;
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#0B7267' } })
      .png()
      .toBuffer();
    image = `data:image/png;base64,${png.toString('base64')}`;
  },
  { timeout: 240000 },
);

after(async () => {
  await connection?.close();
  await mongo?.stop();
});

test('health báo kết nối MongoDB thật của môi trường kiểm thử', async () => {
  const response = await api.get('/api/health').expect(200);
  assert.equal(response.body.database, 'connected');
});
test('đăng nhập đúng trả token có hạn; sai tài khoản/mật khẩu trả 401', async () => {
  const response = await api
    .post('/api/auth/login')
    .send({ username: config.adminUsername, password })
    .expect(200);
  assert.ok(response.body.expiresAt > Date.now());
  const payload = jwt.verify(response.body.token, config.jwtSecret);
  assert.equal(payload.sub, config.adminUsername);
  assert.ok(payload.exp > payload.iat);
  await api
    .post('/api/auth/login')
    .send({ username: config.adminUsername, password: 'wrong' })
    .expect(401);
  await api.post('/api/auth/login').send({ username: 'wrong', password }).expect(401);
  await api
    .post('/api/auth/login')
    .send({ username: config.adminUsername, password: `x${password.slice(1)}` })
    .expect(401);
});
test('đăng nhập từ chối body sai và mật khẩu vượt giới hạn 72 byte', async () => {
  await api.post('/api/auth/login').send({ username: {}, password }).expect(400);
  await api
    .post('/api/auth/login')
    .send({ username: config.adminUsername, password: 'a'.repeat(73) })
    .expect(400);
});
test('tất cả API quản lý và export từ chối truy cập chưa đăng nhập', async () => {
  const id = new mongoose.Types.ObjectId().toHexString();
  for (const [method, path] of [
    ['get', ''],
    ['get', '/export'],
    ['get', `/${id}`],
    ['post', ''],
    ['put', `/${id}`],
    ['delete', `/${id}`],
  ]) {
    await api[method](`/api/giang-vien${path}`).expect(401);
  }
});
test('token hết hạn, sai chữ ký và sai chủ thể bị từ chối', async () => {
  const options = {
    algorithm: 'HS256',
    issuer: 'ql-giang-vien-api',
    audience: 'ql-giang-vien-admin',
  };
  const expired = jwt.sign({ sub: config.adminUsername }, config.jwtSecret, {
    ...options,
    expiresIn: -1,
  });
  const wrongUser = jwt.sign({ sub: 'someone-else' }, config.jwtSecret, {
    ...options,
    expiresIn: 60,
  });
  for (const invalid of [expired, wrongUser, `${token}x`])
    await api.get('/api/giang-vien').set('Authorization', `Bearer ${invalid}`).expect(401);
});
test('đọc fixture GV001 đúng bốn trường và giữ nguyên ảnh rỗng', async () => {
  const response = await auth(api.get('/api/giang-vien?q=GV001')).expect(200);
  assert.equal(response.body.total, 1);
  const { _id, ...business } = response.body.data[0];
  assert.ok(_id);
  assert.deepEqual(business, fixture);
});
test('thêm hợp lệ trim mã/tên và lưu thật đúng collection GiangVien', async () => {
  const row = await createRow({ IDGV: '  TEST-TRIM  ', Fullname: '  Nguyễn Thị Ánh  ' });
  const stored = await connection.db
    .collection('GiangVien')
    .findOne({ _id: new mongoose.Types.ObjectId(row._id) });
  assert.equal(stored.IDGV, 'TEST-TRIM');
  assert.equal(stored.Fullname, 'Nguyễn Thị Ánh');
  assert.deepEqual(
    Object.keys(stored).sort(),
    ['_id', 'IDGV', 'Fullname', 'Image', 'SumClass'].sort(),
  );
});
test('chặn tạo mã trùng kể cả khoảng trắng', async () => {
  const row = await createRow();
  const response = await auth(api.post('/api/giang-vien'))
    .send({ IDGV: ` ${row.IDGV} `, Fullname: 'Khác', Image: '', SumClass: 0 })
    .expect(409);
  assert.ok(response.body.fields.IDGV);
});
test('unique index chặn hai request tạo cùng mã đồng thời', async () => {
  const value = { IDGV: uniqueCode(), Fullname: 'Đồng thời', Image: '', SumClass: 0 };
  const responses = await Promise.all([
    auth(api.post('/api/giang-vien')).send(value),
    auth(api.post('/api/giang-vien')).send(value),
  ]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
});
test('từ chối số lớp âm, thập phân, chuỗi, null, số vượt phạm vi', async () => {
  for (const SumClass of [-1, 1.5, '5', null, Number.MAX_SAFE_INTEGER + 1]) {
    const response = await auth(api.post('/api/giang-vien'))
      .send({ ...fixture, IDGV: uniqueCode(), SumClass })
      .expect(400);
    assert.ok(response.body.fields.SumClass);
  }
});
test('từ chối trường dư, toán tử Mongo và trường bắt buộc thiếu', async () => {
  for (const body of [
    { ...fixture, role: 'ADMIN' },
    { ...fixture, __v: 0 },
    { ...fixture, createdAt: new Date() },
    { $set: fixture },
    { ...fixture, IDGV: ' ' },
    { ...fixture, Fullname: '' },
    { IDGV: uniqueCode(), Fullname: 'Thiếu ảnh', SumClass: 0 },
  ]) {
    await auth(api.post('/api/giang-vien')).send(body).expect(400);
  }
});
test('lưu ảnh Base64 hợp lệ, đọc lại qua API vẫn còn nguyên', async () => {
  const row = await createRow({ Image: image });
  const response = await auth(api.get(`/api/giang-vien/${row._id}`)).expect(200);
  assert.equal(response.body.Image, image);
  const stored = await Model.findById(row._id).lean();
  assert.equal(stored.Image, image);
});
test('chấp nhận URL HTTPS, từ chối ảnh hỏng/MIME giả và đường dẫn cục bộ', async () => {
  await createRow({ Image: 'https://example.org/avatar.jpg' });
  for (const Image of [
    'http://example.org/a.jpg',
    'file:///tmp/a.jpg',
    'blob:local',
    'https://',
    'https://user:pass@example.org/a.jpg',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'data:image/png;base64,bm90IGFuIGltYWdl',
    image.replace('image/png', 'image/jpeg'),
  ]) {
    const response = await auth(api.post('/api/giang-vien'))
      .send({ ...fixture, IDGV: uniqueCode(), Image })
      .expect(400);
    assert.ok(response.body.fields.Image);
  }
});
test('chặn ảnh trên 1 MiB và body trên giới hạn JSON', async () => {
  const Image = `data:image/png;base64,${Buffer.alloc(1024 * 1024 + 1).toString('base64')}`;
  await auth(api.post('/api/giang-vien'))
    .send({ ...fixture, IDGV: uniqueCode(), Image })
    .expect(400);
  await auth(api.post('/api/giang-vien'))
    .send({ data: 'x'.repeat(1600 * 1024) })
    .expect(413);
});
test('sửa đủ bốn trường, đổi mã và giữ ảnh nếu gửi nguyên ảnh hiện tại', async () => {
  const row = await createRow({ Image: image });
  const value = { IDGV: uniqueCode(), Fullname: 'Tên đã sửa', Image: row.Image, SumClass: 0 };
  const response = await auth(api.put(`/api/giang-vien/${row._id}`))
    .send(value)
    .expect(200);
  assert.deepEqual(response.body, { _id: row._id, ...value });
  assert.equal((await Model.findById(row._id).lean()).Fullname, value.Fullname);
  await auth(api.put(`/api/giang-vien/${row._id}`))
    .send({ ...value, Image: '' })
    .expect(200);
  assert.equal((await Model.findById(row._id).lean()).Image, '');
});
test('sửa mã trùng và trường dư bị từ chối, không thay đổi bản gốc', async () => {
  const row = await createRow();
  const value = { IDGV: 'GV001', Fullname: row.Fullname, Image: '', SumClass: row.SumClass };
  await auth(api.put(`/api/giang-vien/${row._id}`))
    .send(value)
    .expect(409);
  await auth(api.put(`/api/giang-vien/${row._id}`))
    .send({ ...value, updatedAt: 'now' })
    .expect(400);
  assert.equal((await Model.findById(row._id).lean()).IDGV, row.IDGV);
});
test('xóa đúng bản ghi kiểm thử, lần hai 404, không ảnh hưởng GV001', async () => {
  const row = await createRow();
  await auth(api.delete(`/api/giang-vien/${row._id}`)).expect(200);
  assert.equal(await Model.findById(row._id), null);
  await auth(api.delete(`/api/giang-vien/${row._id}`)).expect(404);
  assert.equal(await Model.countDocuments({ IDGV: 'GV001' }), 1);
});
test('phân biệt id sai định dạng 400 và bản ghi không tồn tại 404', async () => {
  await auth(api.get('/api/giang-vien/not-an-id')).expect(400);
  await auth(api.get(`/api/giang-vien/${new mongoose.Types.ObjectId()}`)).expect(404);
});
test('tìm kiếm tên tiếng Việt và mã không phân biệt hoa thường; escape regex', async () => {
  const found = await auth(api.get('/api/giang-vien').query({ q: 'ngô lê quân' })).expect(200);
  assert.equal(found.body.total, 1);
  assert.equal(found.body.data[0].IDGV, 'GV001');
  const byCode = await auth(api.get('/api/giang-vien?q=gv001')).expect(200);
  assert.equal(byCode.body.total, 1);
  const literal = await auth(api.get('/api/giang-vien').query({ q: '.*' })).expect(200);
  assert.equal(literal.body.total, 0);
});
test('sắp xếp tên/số lớp và phân trang ổn định', async () => {
  for (const [Fullname, SumClass] of [
    ['Kiểm thử sort C', 8],
    ['Kiểm thử sort A', 1],
    ['Kiểm thử sort B', 4],
  ])
    await createRow({ Fullname, SumClass });
  const names = await auth(
    api
      .get('/api/giang-vien')
      .query({ q: 'Kiểm thử sort', sort: 'Fullname', order: 'asc', limit: 2 }),
  ).expect(200);
  assert.deepEqual(
    names.body.data.map((r) => r.Fullname),
    ['Kiểm thử sort A', 'Kiểm thử sort B'],
  );
  assert.equal(names.body.pages, 2);
  const numbers = await auth(
    api.get('/api/giang-vien').query({ q: 'Kiểm thử sort', sort: 'SumClass', order: 'desc' }),
  ).expect(200);
  assert.deepEqual(
    numbers.body.data.map((r) => r.SumClass),
    [8, 4, 1],
  );
  const second = await auth(
    api.get('/api/giang-vien').query({ q: 'Kiểm thử sort', page: 2, limit: 2 }),
  ).expect(200);
  assert.equal(second.body.data.length, 1);
});
test('từ chối query injection, sắp xếp không cho phép và phân trang sai', async () => {
  for (const query of [
    { sort: '$where' },
    { order: 'sideways' },
    { page: -1 },
    { limit: 1000 },
    { 'q[$ne]': '' },
    { q: ['a', 'b'] },
  ]) {
    await auth(api.get('/api/giang-vien').query(query)).expect(400);
  }
});
test('export có đúng bốn trường, chứa ảnh và không sửa document gốc', async () => {
  const count = await Model.countDocuments();
  const response = await auth(api.get('/api/giang-vien/export')).expect(200);
  assert.match(response.headers['content-disposition'], /GiangVien.json/);
  assert.equal(response.body.length, count);
  for (const row of response.body)
    assert.deepEqual(Object.keys(row).sort(), ['IDGV', 'Fullname', 'Image', 'SumClass'].sort());
  assert.ok(response.body.some((row) => row.Image === image));
  assert.equal(await Model.countDocuments(), count);
  const { _id, ...original } = await Model.findOne({ IDGV: 'GV001' }).lean();
  assert.deepEqual(original, fixture);
});
test('CORS chỉ cho phép origin cấu hình; native không gửi origin vẫn dùng được', async () => {
  const response = await api
    .options('/api/giang-vien')
    .set('Origin', config.origins[0])
    .set('Access-Control-Request-Method', 'GET')
    .expect(204);
  assert.equal(response.headers['access-control-allow-origin'], config.origins[0]);
  await api.get('/api/health').set('Origin', 'https://unknown.example').expect(403);
  await auth(api.get('/api/giang-vien')).expect(200);
});
test('database mất kết nối trả 503, không dùng dữ liệu giả', async () => {
  const offline = supertest(createApp({ config, Model, isReady: () => false }));
  await offline.get('/api/health').expect(503);
  await auth(offline.get('/api/giang-vien')).expect(503);
});
test('giới hạn đăng nhập sai sau 10 lần trong 15 phút', async () => {
  const limited = supertest(createApp({ config, Model }));
  for (let i = 0; i < 10; i++)
    await limited
      .post('/api/auth/login')
      .send({ username: config.adminUsername, password: 'wrong' })
      .expect(401);
  await limited
    .post('/api/auth/login')
    .send({ username: config.adminUsername, password })
    .expect(429);
});
test('phát hiện mã trùng trước khi tạo index, không xóa bản ghi', async () => {
  const other = connection.useDb(`${dbName}_duplicate`);
  const Duplicate = lecturerModel(other);
  await Duplicate.collection.insertMany([{ ...fixture }, { ...fixture, IDGV: ' GV001 ' }]);
  await assert.rejects(prepareCollection(Duplicate), /IDGV trùng.*GV001/);
  assert.equal(await Duplicate.countDocuments(), 2);
  const indexes = await Duplicate.collection.indexes();
  assert.equal(
    indexes.some((index) => index.name === 'IDGV_unique'),
    false,
  );
});
test('cấu hình thiếu URI, JWT secret hoặc mật khẩu admin hợp lệ bị chặn', () => {
  assert.throws(() => loadConfig({}), /MONGODB_URI/);
  assert.throws(() => loadConfig({ MONGODB_URI: 'mongodb://localhost/a' }), /JWT_SECRET/);
  assert.throws(
    () =>
      loadConfig({
        MONGODB_URI: 'mongodb://localhost/a',
        JWT_SECRET: config.jwtSecret,
        ADMIN_USERNAME: config.adminUsername,
        ADMIN_PASSWORD: 'short',
      }),
    /ADMIN_PASSWORD/,
  );
});

test('schema giữ nguyên collection và không tạo metadata; từ chối trường dư khi ghi trực tiếp', async () => {
  assert.equal(Model.collection.collectionName, 'GiangVien');
  assert.equal(Model.schema.options.versionKey, false);
  assert.equal(Model.schema.options.timestamps, false);
  assert.equal(Model.schema.options.strict, 'throw');
  assert.throws(() => new Model({ ...fixture, role: 'ADMIN' }), /role/);
  const indexes = await Model.collection.indexes();
  assert.equal(indexes.find((index) => index.name === 'IDGV_unique').unique, true);
});

test('JSON sai trả thông báo gọn, không có stack trace hay giá trị secrets', async () => {
  const response = await auth(api.post('/api/giang-vien'))
    .set('Content-Type', 'application/json')
    .send('{invalid-json')
    .expect(400);
  assert.deepEqual(Object.keys(response.body), ['message']);
  assert.ok(!response.text.includes(config.jwtSecret));
  assert.ok(!response.text.includes('SyntaxError'));
});

test('quy ước ảnh JPEG và WebP được giải mã, lưu và đọc lại như PNG', async () => {
  for (const format of ['jpeg', 'webp']) {
    const bytes = await sharp({
      create: { width: 12, height: 12, channels: 3, background: '#0B7267' },
    })
      .toFormat(format)
      .toBuffer();
    const Image = `data:image/${format};base64,${bytes.toString('base64')}`;
    const row = await createRow({ Image });
    const response = await auth(api.get(`/api/giang-vien/${row._id}`)).expect(200);
    assert.equal(response.body.Image, Image);
  }
});

test('dùng lại unique index IDGV có sẵn với tên khác, không đổi index hay dữ liệu', async () => {
  const other = connection.useDb(`${dbName}_existingindex`);
  const Existing = lecturerModel(other);
  await Existing.collection.insertOne({ ...fixture });
  await Existing.collection.createIndex({ IDGV: 1 }, { unique: true, name: 'IDGV_1' });
  await prepareCollection(Existing);
  const indexes = await Existing.collection.indexes();
  assert.equal(indexes.find((index) => index.name === 'IDGV_1').unique, true);
  assert.equal(
    indexes.some((index) => index.name === 'IDGV_unique'),
    false,
  );
  assert.equal(await Existing.countDocuments(), 1);
});

test('đọc ADMIN_PASSWORD trực tiếp từ env, giữ khoảng trắng và không yêu cầu hash', () => {
  const env = {
    MONGODB_URI: 'mongodb://127.0.0.1/QLHocPhan',
    JWT_SECRET: config.jwtSecret,
    ADMIN_USERNAME: ' admin ',
    ADMIN_PASSWORD: ` ${password} `,
  };
  const settings = loadConfig(env);
  assert.equal(settings.adminUsername, 'admin');
  assert.equal(settings.adminPassword, env.ADMIN_PASSWORD);
  assert.equal(Object.hasOwn(settings, 'adminPasswordHash'), false);
  for (const invalid of [undefined, '', 'short', ' '.repeat(8), 'a'.repeat(73)]) {
    assert.throws(() => loadConfig({ ...env, ADMIN_PASSWORD: invalid }), /ADMIN_PASSWORD/);
  }
});

test('đăng nhập bằng mật khẩu UTF-8 trong env; không chấp nhận mật khẩu bị trim hoặc thay byte', async () => {
  const adminPassword = ` Mật khẩu ${randomBytes(4).toString('hex')} `;
  const local = supertest(createApp({ config: { ...config, adminPassword }, Model }));
  const username = config.adminUsername;
  await local.post('/api/auth/login').send({ username, password: adminPassword }).expect(200);
  await local
    .post('/api/auth/login')
    .send({ username, password: adminPassword.trim() })
    .expect(401);
  await local
    .post('/api/auth/login')
    .send({ username, password: adminPassword.replace('Mật', 'Mát') })
    .expect(401);
});
