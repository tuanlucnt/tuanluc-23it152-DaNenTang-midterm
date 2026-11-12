# Checklist quay demo và nghiệm thu

Đây là kịch bản cần thực hiện trên sản phẩm thật sau khi cấu hình. Các ô chưa đánh dấu không phải kết quả kiểm thử đã chạy. Không hiển thị server/.env, URI/password database, JWT hoặc mật khẩu admin trong video.

## Chuẩn bị

- [ ] Điền thông tin sinh viên, GitHub, video trong báo cáo.
- [ ] Cài dependency bằng npm.cmd ci ở root và server.
- [ ] Cấu hình server/.env: Atlas, ADMIN_USERNAME/ADMIN_PASSWORD, JWT secret và CORS.
- [ ] Cấu hình .env gốc: URL API đúng cho thiết bị; restart Metro sau khi sửa.
- [ ] Khởi động backend; health báo connected. Dừng ngay nếu đang trỏ nhầm môi trường.
- [ ] Chụp GV001 thật: Ngô Lê Quân, Image rỗng, SumClass 5. Không sửa/xóa GV001.
- [ ] Chuẩn bị ảnh được phép sử dụng, dưới 10 MiB, không chứa dữ liệu riêng tư.
- [ ] Chọn mã demo chưa tồn tại, ví dụ DEMO001/DEMO002; chỉ xóa bản ghi demo do mình tạo.
- [ ] Chuẩn bị web tại localhost:8081 và Android qua cùng API. Nếu cùng chạy web/phone, dùng IP LAN chung.

## Phần web — khoảng 5–7 phút

1. [ ] Giới thiệu kiến trúc Expo → Express → Atlas và bốn trường dữ liệu.
2. [ ] Mở web ở trạng thái chưa đăng nhập; route quản lý đưa về login.
3. [ ] Đăng nhập sai một lần, ghi nhận thông báo. Đăng nhập đúng; không quay mật khẩu.
4. [ ] Hiển thị danh sách thật, đối chiếu GV001 và fallback ảnh trống.
5. [ ] Thêm một giảng viên demo với đủ thông tin. Bấm Chọn ảnh từ thiết bị, chọn file thực tế và xem preview trước lưu.
6. [ ] Lưu thành công; danh sách có bản ghi mới, ảnh/tổng lớp đúng. Tải lại trang, ảnh vẫn còn.
7. [ ] Mở Atlas, đối chiếu bản ghi mới: đúng bốn trường + _id, Image là Base64, không có __v/timestamps/username/password.
8. [ ] Thử thêm mã trùng bản ghi demo; nhận lỗi, database không thêm document trùng.
9. [ ] Thử số lớp -1 và 1.5 trong form, nhận validation; không cần lưu dữ liệu sai.
10. [ ] Sửa bản ghi demo: mã, tên, số lớp. Không đổi ảnh, lưu và xác nhận ảnh cũ được giữ.
11. [ ] Sửa tiếp và thay ảnh từ máy; lưu, tải lại và xác nhận ảnh mới.
12. [ ] Thử đổi mã demo thành mã đã có; nhận thông báo trùng, mã cũ vẫn giữ nguyên.
13. [ ] Tìm theo mã, tên có dấu; xóa bộ lọc để xem lại toàn bộ.
14. [ ] Sắp xếp Fullname A→Z/Z→A và số lớp tăng/giảm. Nói rõ sort theo toàn bộ họ tên.
15. [ ] Bấm Xóa bản ghi demo, chọn Hủy trước; danh sách không đổi. Mở lại modal, đối chiếu đúng mã/tên rồi xác nhận xóa bản ghi demo được phép xóa.
16. [ ] Kiểm tra bản ghi demo đã xóa trong Atlas; GV001 còn nguyên.
17. [ ] Xuất JSON trên web, mở file và kiểm tra bốn trường, ảnh, không _id. Export toàn collection, không chỉ bộ lọc.
18. [ ] Đăng xuất; tải lại/đi vào route sửa không thể xem quản lý khi chưa đăng nhập.

## Phần Android — khoảng 3–4 phút

- [ ] Ghi rõ thiết bị thật hay emulator, Android version, Expo Go hay development build SDK 58.
- [ ] Kiểm tra health từ browser điện thoại với IP LAN; không dùng localhost trên điện thoại thật.
- [ ] Đăng nhập, xem danh sách thẻ và ảnh từ cùng database Atlas.
- [ ] Thêm một bản ghi demo di động chưa tồn tại; chọn ảnh thực tế từ thư viện Android, xử lý quyền nếu hệ thống yêu cầu.
- [ ] Preview, nhập đủ mã/tên/tổng lớp và lưu. Không gửi nhiều lần khi đang loading.
- [ ] Tải lại danh sách hoặc đóng/mở app; ảnh vẫn hiện. Nếu token hết hạn, đăng nhập lại.
- [ ] Tìm cùng mã đó trên web, chứng minh ảnh được đọc từ MongoDB, không phụ thuộc file:// trên điện thoại.
- [ ] Sửa thông tin trên Android, kiểm tra web sau Tải lại.
- [ ] Xóa chỉ bản ghi demo di động nếu muốn dọn dữ liệu, có xác nhận rõ ràng.
- [ ] Chụp danh sách mobile, picker và ảnh đã lưu sau tải lại; không dùng ảnh web thu nhỏ làm bằng chứng Android.

## Lỗi, trạng thái và bảo vệ API

- [ ] Thử từ khóa không có kết quả; thấy trạng thái phù hợp.
- [ ] Dừng backend rồi bấm Tải lại; thấy lỗi kết nối, không có dữ liệu giả. Bật lại backend, Thử lại thành công.
- [ ] Gọi GET /api/giang-vien không có token bằng công cụ API, trả 401. Không quay token đăng nhập.
- [ ] Nếu cần demo token hết hạn: đặt JWT_TTL_MINUTES=1, restart backend, đăng nhập mới, chờ hết hạn rồi thao tác; sau demo trả về 60.
- [ ] Không chạy test phá hủy trên Atlas. Bộ `npm.cmd test` tại server đã dùng môi trường tạm, có thể trình bày riêng với số bài đạt.

## Hồ sơ nộp

```powershell
Set-Location D:\midtem-danentang\server
npm.cmd run export
npm.cmd run verify-export -- ../exports/GiangVien.json
```

- [ ] Export thật thành công và verify-export đạt; đổi tên file đích nếu đã tồn tại.
- [ ] Đối chiếu số document/ảnh dữ liệu thật; không nộp fixture trong test như bản xuất Atlas.
- [ ] Bổ sung 15 ảnh theo danh mục trong bao-cao.md và chú thích kết quả thực tế.
- [ ] Cập nhật mục kiểm thử với ngày, thiết bị, kết quả đã thực hiện; giữ phân biệt test tự động và demo thật.
- [ ] Rà git status/git diff, không đưa env, secrets, node_modules hoặc dist lên GitHub.
- [ ] Tự push source lên GitHub, điền link thật; chưa có thao tác push tự động.
- [ ] Quay/tải video demo và kiểm tra người chấm xem được; điền link thật.
- [ ] Kiểm tra lần cuối README, báo cáo, file JSON, source và video trước khi nộp.

Biên bản bổ sung: [NGÀY THỰC HIỆN] — [THIẾT BỊ] — [KẾT QUẢ] — [VẤN ĐỀ CÒN LẠI].
