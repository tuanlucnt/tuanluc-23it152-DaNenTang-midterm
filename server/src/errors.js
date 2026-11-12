export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export function errorHandler(error, _req, res, _next) {
  if (res.headersSent) {
    res.destroy();
    return;
  }
  if (error instanceof HttpError) {
    res
      .status(error.status)
      .json({ message: error.message, ...(error.fields && { fields: error.fields }) });
  } else if (error.code === 11000) {
    res.status(409).json({
      message: 'Mã giảng viên đã tồn tại.',
      fields: { IDGV: 'Mã giảng viên đã tồn tại.' },
    });
  } else if (error.type === 'entity.too.large') {
    res.status(413).json({ message: 'Dữ liệu quá lớn. Ảnh sau nén phải không quá 1 MiB.' });
  } else if (error.type === 'entity.parse.failed') {
    res.status(400).json({ message: 'Nội dung JSON không hợp lệ.' });
  } else if (['ValidationError', 'StrictModeError', 'CastError'].includes(error.name)) {
    res.status(400).json({ message: 'Dữ liệu không đúng cấu trúc giảng viên.' });
  } else {
    // Không log error.message/stack: lỗi driver có thể chứa URI hoặc dữ liệu nhạy cảm.
    console.error('Yêu cầu thất bại:', error.name || 'Error');
    res.status(503).json({ message: 'Không thể xử lý dữ liệu lúc này. Vui lòng thử lại.' });
  }
}
