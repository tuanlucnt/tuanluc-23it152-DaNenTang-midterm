import mongoose from 'mongoose';
import { validateImage } from './validation.js';
import { configureMongoDns } from './mongo-dns.js';

export function lecturerModel(connection) {
  const schema = new mongoose.Schema(
    {
      IDGV: { type: String, required: true, trim: true, maxlength: 50 },
      Fullname: { type: String, required: true, trim: true, maxlength: 150 },
      Image: {
        type: String,
        default: '',
        validate: {
          validator: async (value) => {
            await validateImage(value);
            return true;
          },
          message: 'Ảnh không hợp lệ.',
        },
      },
      SumClass: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
    },
    {
      collection: 'GiangVien',
      versionKey: false,
      timestamps: false,
      strict: 'throw',
      autoIndex: false,
      autoCreate: false,
      bufferCommands: false,
    },
  );
  return connection.model('GiangVien', schema);
}

export async function prepareCollection(Model) {
  // Kiểm tra trước khi tạo index; không seed, sửa hay xóa bất kỳ document nào.
  const duplicates = await Model.aggregate([
    {
      $group: {
        _id: {
          $trim: { input: { $convert: { input: '$IDGV', to: 'string', onError: '', onNull: '' } } },
        },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $limit: 20 },
  ]);
  if (duplicates.length) {
    const list = duplicates
      .map((row) => `${JSON.stringify(row._id)} (${row.count} bản ghi)`)
      .join(', ');
    throw new Error(
      `IDGV trùng sau trim: ${list}. Hãy kiểm tra thủ công; ứng dụng không tự xóa dữ liệu.`,
    );
  }
  let indexes = [];
  try {
    indexes = await Model.collection.indexes();
  } catch (error) {
    if (error.code !== 26) throw error; // NamespaceNotFound: collection mới, chưa có index.
  }
  const existingUnique = indexes.some(
    (index) =>
      index.unique === true &&
      !index.sparse &&
      !index.partialFilterExpression &&
      Object.keys(index.key).length === 1 &&
      index.key.IDGV === 1,
  );
  // Atlas có thể đã có index IDGV_1. Giữ index hợp lệ, không đổi tên/drop index.
  if (!existingUnique)
    await Model.collection.createIndex({ IDGV: 1 }, { unique: true, name: 'IDGV_unique' });
}

export async function openDatabase(uri, dnsServers = []) {
  configureMongoDns(uri, dnsServers);
  const connection = mongoose.createConnection(uri, {
    dbName: 'QLHocPhan',
    autoIndex: false,
    autoCreate: false,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  try {
    await connection.asPromise();
    return connection;
  } catch (error) {
    await connection.close();
    throw error;
  }
}

export async function connectDatabase(uri, dnsServers = []) {
  const connection = await openDatabase(uri, dnsServers);
  try {
    const Model = lecturerModel(connection);
    await prepareCollection(Model);
    return { connection, Model };
  } catch (error) {
    await connection.close();
    throw error;
  }
}
