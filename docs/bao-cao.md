# BÁO CÁO GIỮA KỲ — LẬP TRÌNH ĐA NỀN TẢNG

**Đề tài:** Ứng dụng quản lý giảng viên — phân hệ admin  
**Sinh viên:** [BỔ SUNG họ tên, mã sinh viên, lớp]  
**Giảng viên hướng dẫn:** [BỔ SUNG]  
**Ngày ghi nhận kiểm tra source:** 12/11/2026  
**GitHub source code:** [BỔ SUNG link repository thật]  
**Video demo:** [BỔ SUNG link video thật]

> Báo cáo phân biệt phần đã triển khai bằng code, kiểm thử tự động đã chạy và phần còn cần thực hiện trên Atlas/thiết bị thật. Chưa có ảnh chụp hoặc JSON Atlas thật trong lần bàn giao này.

## 1. Bài toán và phạm vi

Admin cần quản lý thông tin giảng viên bằng một ứng dụng dùng chung source trên web và Android. Hồ sơ chỉ gồm mã giảng viên, họ và tên, hình ảnh và tổng số lớp. Ứng dụng hỗ trợ thêm/hiển thị theo yêu cầu chính, đồng thời bổ sung đăng nhập, sửa, xóa, tìm kiếm, sắp xếp và xuất JSON. Không mở rộng sang môn học, lớp học, sinh viên hay quản lý tài khoản trong MongoDB.

## 2. Đối chiếu yêu cầu đề

| Yêu cầu                                        | Cách triển khai                                                     | Bằng chứng hiện có / cần bổ sung                                        |
| ---------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Thêm và hiển thị trên web — nhóm 8 điểm        | Form và danh sách gọi Express, lưu/đọc MongoDB thật                 | Build web đạt; CRUD API đạt trên MongoDB tạm. Cần demo Atlas/web thật   |
| Database QLHocPhan, collection GiangVien       | Chỉ định rõ trong database.js; không pluralize collection           | Đã kiểm tra schema; kết nối Atlas thật và đọc GV001 thành công          |
| Bốn trường IDGV, Fullname, Image, SumClass     | Validation frontend/backend, strict schema; không thêm metadata     | Kiểm thử từ chối trường dư và kiểm tra keys đã đạt                      |
| Đăng nhập, sửa, xóa — nhóm 1,5 điểm            | Admin từ env, JWT, API được bảo vệ, form sửa, modal xác nhận xóa    | Test API đạt; cần ảnh thao tác UI thật                                  |
| Nâng cao                                       | Tìm kiếm mã/tên, sắp xếp họ tên/số lớp, phân trang, export JSON web | API tìm/sắp xếp/phân trang/export đạt trên database kiểm thử            |
| Nhập ảnh/hiển thị trên di động — nhóm 0,5 điểm | ImagePicker, ImageManipulator, Base64, preview, avatar fallback     | Bundle Android đạt; chưa kiểm tra picker/quyền/hiển thị trên điện thoại |
| Tài liệu, JSON, ảnh DB, GitHub, video          | README, báo cáo này, checklist demo, script export/verify-export    | Tài liệu và script có; ảnh, JSON Atlas, GitHub, video còn cần bổ sung   |

Các nhóm điểm là yêu cầu đề bài, không phải khẳng định điểm chấm hoặc đã nghiệm thu trên thiết bị thật.

## 3. Kiến trúc

```text
Expo / React Native / Expo Router
   Web: sessionStorage      Android: SecureStore
                |
                | REST JSON + Authorization: Bearer JWT
                v
Node.js / Express trong server/
   CORS → xác thực → validation → Mongoose
                |
                v
MongoDB Atlas: QLHocPhan.GiangVien
```

Backend giữ URI Atlas, mật khẩu admin và JWT secret. Frontend chỉ nhận URL API qua `EXPO_PUBLIC_API_URL`. Admin được cấu hình bằng môi trường, không cần collection tài khoản. Backend chỉ mở cổng sau khi database kết nối thành công và unique index sẵn sàng; mất kết nối sau đó trả lỗi 503.

## 4. Thiết kế cơ sở dữ liệu

| Trường     | Kiểu   | Ràng buộc                                                       |
| ---------- | ------ | --------------------------------------------------------------- |
| `IDGV`     | String | Bắt buộc, trim, tối đa 50 ký tự, unique                         |
| `Fullname` | String | Bắt buộc, trim, hỗ trợ dấu tiếng Việt, tối đa 150 ký tự         |
| `Image`    | String | Rỗng cho dữ liệu cũ; Base64 JPEG/PNG/WebP hoặc URL HTTPS hợp lệ |
| `SumClass` | Number | Bắt buộc, số nguyên không âm và an toàn trong JavaScript        |

`_id` là định danh kỹ thuật do MongoDB tạo, không phải trường nhập trong form. Mongoose đặt `collection: 'GiangVien'`, `strict: 'throw'`, `versionKey: false`, `timestamps: false`, `autoIndex: false`. Trước khi tự tạo unique index `IDGV_unique`, ứng dụng aggregate kiểm tra trùng mã sau trim. Có trùng thì dừng và nêu mã/số lượng, không tự xóa hay hợp nhất document. Index unique tiếp tục bảo vệ trường hợp hai request tạo cùng mã đồng thời.

Theo thông tin người dùng, Atlas đã có GV001, Ngô Lê Quân, Image rỗng, SumClass 5. Code không seed/reset hoặc chèn lại bản ghi này. Kiểm thử có fixture cùng nội dung trong database **tạm riêng**, không phải bằng chứng đã đọc Atlas.

**VỊ TRÍ ẢNH DB — CHƯA BỔ SUNG:** chụp collection thật, tên database/collection, GV001 và bốn trường; không để lộ URI, user/password database. Tên ảnh dự kiến: `images/01-atlas-giangvien.png`.

## 5. Công nghệ và lệnh cài

| Thành phần                | Công nghệ / mục đích                                            |
| ------------------------- | --------------------------------------------------------------- |
| Frontend                  | Expo SDK 58, React 19.3, React Native 0.88.1, TypeScript        |
| Điều hướng                | Expo Router, Stack.Protected, router, useLocalSearchParams      |
| Chọn và xử lý ảnh         | expo-image-picker, expo-image-manipulator                       |
| Token Android             | expo-secure-store                                               |
| Android development build | expo-dev-client, expo-build-properties, eas.json                |
| REST backend              | Express 5, cors, helmet, dotenv                                 |
| Database                  | Mongoose 9, MongoDB Atlas                                       |
| Auth                      | node:crypto (timingSafeEqual), jsonwebtoken, express-rate-limit |
| Kiểm tra ảnh server       | Sharp phiên bản đã vá thuộc nhánh 0.35                          |
| Kiểm thử                  | node:test, Supertest, mongodb-memory-server                     |
| Chất lượng source         | ESLint cấu hình Expo, TypeScript, Prettier                      |

Phiên bản cài chính xác nằm trong `package-lock.json` ở root và server. Từ root:

```powershell
npx.cmd expo install expo-image-picker expo-image-manipulator expo-secure-store
npx.cmd expo install expo-dev-client expo-build-properties
npx.cmd expo install eslint eslint-config-expo --dev
npx.cmd expo install prettier --dev
Set-Location server
npm.cmd install express mongoose cors dotenv jsonwebtoken express-rate-limit helmet sharp
npm.cmd install --save-dev supertest mongodb-memory-server
```

Khi nhận source đã có lockfile, dùng `npm.cmd ci` tại root và server thay vì cài lại từng package. Dùng hậu tố `.cmd` để không phải thay PowerShell Execution Policy.

## 6. Các bước thực hiện

1. **Khảo sát:** đọc AGENTS.md, package.json, TypeScript, app.json, các route và template ban đầu. Project dùng Expo SDK 58, npm và Expo Router; không tạo lại project.
2. **Đối chiếu tài liệu:** đọc tài liệu versioned SDK 58 và index llms.txt; dùng ImageManipulator contextual API thay cho API cũ. Giữ import điều hướng từ expo-router.
3. **Backend:** tạo package độc lập trong server, kiểm tra env, kết nối đúng DB/collection, schema bốn trường, kiểm tra mã trùng và index unique.
4. **Xác thực:** đọc ADMIN_USERNAME/ADMIN_PASSWORD trực tiếp từ env backend, so sánh mật khẩu bằng timingSafeEqual, tiện ích sinh JWT secret không in giá trị, API login có rate limit, JWT có issuer/audience/hạn dùng, middleware bảo vệ toàn bộ API giảng viên.
5. **API:** health, danh sách có tìm/sắp xếp/phân trang, chi tiết, tạo, sửa, xóa và export; validation đầu vào và lỗi HTTP tiếng Việt.
6. **Frontend:** thay màn hình template bằng login/danh sách, thêm route tạo/sửa, form chung và UI tiếng Việt; giữ components/hooks ngoài src/app.
7. **Ảnh:** file picker trên web/system photo picker Android, resize và nén thành JPEG Base64; server kiểm tra dung lượng và giải mã. Có preview, bỏ ảnh, giữ ảnh cũ khi sửa và fallback khi ảnh lỗi.
8. **Đa nền tảng:** bảng cho web màn hình rộng, thẻ trên màn hình nhỏ; FlatList cuộn cả phần điều khiển/danh sách để không cắt nội dung điện thoại. Tách mã download browser vào file .web.ts.
9. **Xuất và tài liệu:** API download và script export thật, script kiểm tra JSON, env mẫu, README, checklist và báo cáo. Không tạo dữ liệu xuất giả hay link GitHub/video giả.
10. **Kiểm tra:** chạy lint, TypeScript, bundle web/Android, Doctor, syntax và test backend với mongod tạm. Ghi nhận rõ phần chưa kiểm chứng dưới đây.

## 7. Các màn hình và luồng sử dụng

| Route             | Thao tác                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `/login`          | Nhập tài khoản/mật khẩu, hiện/ẩn mật khẩu, lỗi đăng nhập, hạn chế gửi nhiều lần             |
| `/`               | Đọc danh sách, bốn trường, tải lại, tìm kiếm, sắp xếp, phân trang, xuất JSON web, đăng xuất |
| `/lecturers/new`  | Nhập mã/tên/số lớp, chọn ảnh hoặc HTTPS URL, preview, validation và lưu                     |
| `/lecturers/[id]` | Đọc chi tiết theo _id, sửa cả bốn trường, giữ ảnh nếu không đổi                             |
| Modal xóa         | Nêu tên/mã, Hủy hoặc Xóa, chờ request, lỗi/thành công                                       |

Thêm/sửa thành công quay về danh sách và đọc lại dữ liệu. Xóa thành công tải lại trang hiện tại; nếu trang cuối đã trống thì quay về trang hợp lệ. Request đang xử lý khóa nút gửi và có lock ở handler để chống bấm lặp. Danh sách hỗ trợ loading, trống, không có kết quả, lỗi và thử lại. API trả 401 hoặc phiên hết hạn thì xóa phiên phía client và đưa về login.

## 8. Bảo mật và xử lý dữ liệu

- Mật khẩu admin lưu dạng thường trong server/.env và được kiểm tra bằng timingSafeEqual của Node.js; không lưu trên client hoặc trong document GiangVien. Không đưa file env vào GitHub.
- JWT HS256 mặc định 60 phút. Web dùng sessionStorage; native dùng SecureStore. Đăng xuất phía client xóa token, không có cơ chế thu hồi token đã bị sao chép trước hạn.
- Login tối đa 10 lần thất bại/15 phút/IP, bộ đếm bộ nhớ phù hợp backend một tiến trình của bài học.
- Backend kiểm tra đủ bốn trường, từ chối trường dư/toán tử MongoDB, số lớp âm/thập phân/chuỗi; không chỉ tin frontend.
- Tìm kiếm escape regex, chỉ cho phép hai trường sort. CORS khai báo rõ origin web.
- Không trả stack trace/URI database trong response, không log lỗi driver nguyên văn có thể chứa secret.
- Source ignore env/token/keys/node_modules/exports. `.easignore` loại backend và env khỏi gói source build Android.
- HTTP LAN phục vụ demo qua cấu hình native; khi triển khai Internet cần HTTPS. Không có thay đổi firewall hay publish tự động.

## 9. Quy trình ảnh

1. Admin bấm Chọn ảnh từ thiết bị; web mở chọn file, Android mở bộ chọn ảnh hệ thống.
2. Giới hạn ảnh gốc 10 MiB; downsample khi giải mã để giảm bộ nhớ, resize cạnh dài tối đa 768 px và nén JPEG 72%.
3. Hiển thị preview và giữ giá trị `data:image/jpeg;base64,...` trong form, chưa ghi DB.
4. POST/PUT gửi Image cùng ba trường còn lại. Backend giới hạn JSON body 1500 KiB; Image tối đa 1 MiB sau giải mã, Base64 hợp lệ, MIME khớp định dạng, giải mã được và không quá 16 megapixel.
5. MongoDB lưu trực tiếp chuỗi Image. Lần tải sau frontend nhận lại cùng chuỗi, không phụ thuộc đường dẫn máy cũ.

URL HTTPS là lựa chọn bổ sung, kiểm tra cú pháp và có fallback nếu nguồn ảnh không tải được. Không dùng dịch vụ ảnh trả phí, GridFS hay collection ảnh riêng. Chưa có bằng chứng thao tác picker/hiển thị native thật.

## 10. Kết quả kiểm tra thực tế

Môi trường: Windows, Node 22.23.2. Database kiểm thử là mongod tạm trên localhost, tên `QLHocPhan_test_*`; test không sử dụng URI Atlas. Thông tin này không thay thế kết quả nghiệm thu Atlas/điện thoại.

| Kiểm tra                                                                 | Kết quả đã ghi nhận                                                                                      |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `npm.cmd run lint` tại root                                              | Đạt, không lỗi/cảnh báo lint                                                                             |
| `npm.cmd run typecheck` tại root                                         | Đạt                                                                                                      |
| `npm.cmd run build:web`                                                  | Đạt, tạo dist/ với cấu hình web output server                                                            |
| `npx.cmd expo export --platform android --output-dir dist/android-check` | Đạt, tạo bundle Hermes; chưa tạo APK                                                                     |
| `npx.cmd expo-doctor`                                                    | 20/20 kiểm tra đạt                                                                                       |
| `npm.cmd run check` tại server                                           | Cú pháp các file JavaScript hợp lệ                                                                       |
| `npm.cmd test` tại server                                                | 37/37 bài đạt, 0 thất bại, 0 bỏ qua                                                                      |
| Kiểm tra dependency backend                                              | Không còn advisory sau cập nhật Sharp                                                                    |
| Kiểm tra dependency root Expo                                            | Còn 10 cảnh báo moderate trong cây công cụ Expo/ESLint/minimatch ở lần kiểm tra; không force hạ Expo SDK |
| Kiểm tra trình duyệt bằng Computer Use                                   | Chưa chạy được: browser access host và native pipe không khả dụng                                        |
| Kết nối Atlas, đọc GV001 thật                                            | Đạt sau khi dùng DNS riêng 1.1.1.1/8.8.8.8 cho Node; đọc được GV001 thật                                 |
| CRUD và export Atlas thật                                                | Chưa chạy, không thay dữ liệu hiện có                                                                    |
| Android Emulator/điện thoại, chọn ảnh và xem lại                         | Chưa chạy: chưa có phiên thiết bị/ứng dụng kết nối                                                       |
| EAS build/APK                                                            | Chưa chạy: cần tài khoản Expo và thực hiện build                                                         |

Đã kiểm tra thêm trên Atlas thật: luồng khởi động API và khởi tạo index hoạt động, health/login/danh sách trả HTTP 200; GV001 giữ nguyên Ngô Lê Quân, Image rỗng, SumClass 5. API kiểm tra chạy trên cổng local tạm; chưa kiểm thử UI hoặc CRUD trên Atlas. Lệnh check:db chỉ đọc và không tạo index. Không thay DNS Windows hay IP Access List.

37 bài backend bao phủ:

- Health; đăng nhập đúng/sai và body đăng nhập sai; giới hạn mật khẩu 72 byte và số lần login.
- Tất cả API quản lý/export từ chối khi chưa xác thực; từ chối token hết hạn, sai chữ ký, sai chủ thể.
- Đọc fixture GV001 trong DB tạm; thêm hợp lệ, trim, unique index, mã trùng và hai request đồng thời.
- Từ chối số lớp âm, không nguyên, sai kiểu và vượt giới hạn; trường dư, metadata/toán tử và trường thiếu.
- Ảnh Base64 giải mã được được lưu và đọc lại từ MongoDB; chặn ảnh hỏng/sai MIME/file://blob:/quá lớn; chấp nhận HTTPS URL hợp lệ.
- Sửa bốn trường, đổi mã, giữ/bỏ ảnh; chặn sửa mã trùng; xóa đúng bản ghi kiểm thử và 404 khi không còn.
- Tìm tiếng Việt/không phân biệt hoa thường, regex literal; sắp xếp và phân trang; chặn query sai/injection.
- Export đúng bốn trường, có ảnh, không đổi dữ liệu; CORS; DB không sẵn sàng trả 503; kiểm tra trùng trước index mà không xóa.
- Schema đúng tên collection/no metadata/strict; JSON sai không lộ stack trace/secret; config thiếu bị từ chối.
- DNS công cộng áp dụng cho resolver Node callback/promises; URI local hoặc cấu hình trống giữ DNS cũ; từ chối DNS sai và CIDR; chuyển đúng cấu hình DNS từ env vào kết nối.

Build/typecheck không chứng minh UI hoạt động trên thiết bị thật. Test lưu/đọc ảnh qua API không chứng minh đã dùng file picker hoặc xem ảnh trên điện thoại. Chưa xác nhận script export với Atlas thật; endpoint export đã được kiểm tra trong database tạm.

## 11. Chạy sản phẩm và xuất dữ liệu nộp

Hướng dẫn đầy đủ, URL riêng cho web/emulator/điện thoại và xử lý firewall nằm trong [README](../README.md). Các bước chính:

```powershell
Set-Location D:\midtem-danentang
npm.cmd ci
Set-Location server
npm.cmd ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd run generate-secret
# Điền MONGODB_URI, ADMIN_USERNAME, ADMIN_PASSWORD trong server/.env
npm.cmd run dev
```

Ở terminal khác:

```powershell
Set-Location D:\midtem-danentang
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# EXPO_PUBLIC_API_URL=http://localhost:4000/api cho web
Invoke-RestMethod http://localhost:4000/api/health
npx.cmd expo start --web --port 8081
```

Sau khi demo thật:

```powershell
Set-Location D:\midtem-danentang\server
npm.cmd run export
npm.cmd run verify-export -- ../exports/GiangVien.json
```

Script export không sửa database và không ghi đè bản xuất có sẵn. File nộp là mảng JSON có đúng bốn trường, không có _id. Nút Xuất JSON trên web yêu cầu token và xuất toàn bộ collection. Chưa tạo file thật khi chưa có URI, không lấy fixture kiểm thử làm dữ liệu nộp.

## 12. Danh mục ảnh bắt buộc cần bổ sung

Tất cả vị trí dưới đây hiện là **CHƯA CHỤP**, không phải bằng chứng đã hoàn thành. Lưu ảnh thật vào `docs/images/`, sau đó chèn ảnh ngay dưới mục tương ứng hoặc thay vị trí chờ bằng Markdown ảnh.

| Vị trí / tên file dự kiến        | Nội dung ảnh cần thấy                                               | Trạng thái   |
| -------------------------------- | ------------------------------------------------------------------- | ------------ |
| `01-atlas-giangvien.png`         | QLHocPhan.GiangVien, GV001 và bốn trường, không lộ secret           | CHƯA BỔ SUNG |
| `02-login-web.png`               | Màn hình đăng nhập tiếng Việt, không hiển thị mật khẩu              | CHƯA BỔ SUNG |
| `03-login-error.png`             | Thông báo tài khoản/mật khẩu không đúng                             | CHƯA BỔ SUNG |
| `04-list-web.png`                | Danh sách web từ Atlas, mã/tên/ảnh/số lớp                           | CHƯA BỔ SUNG |
| `05-create-image.png`            | Form thêm, ảnh vừa chọn và preview                                  | CHƯA BỔ SUNG |
| `06-created-atlas.png`           | Bản ghi mới thật trong Atlas, Image Base64, không __v/timestamps    | CHƯA BỔ SUNG |
| `07-validation.png`              | Mã trùng hoặc số lớp không hợp lệ bị chặn                           | CHƯA BỔ SUNG |
| `08-edit.png`                    | Form sửa với dữ liệu có sẵn và kết quả cập nhật                     | CHƯA BỔ SUNG |
| `09-delete-confirm.png`          | Modal xác nhận nêu đúng mã/tên bản ghi demo được phép xóa           | CHƯA BỔ SUNG |
| `10-delete-result.png`           | Kết quả sau xóa bản ghi demo, GV001 vẫn còn                         | CHƯA BỔ SUNG |
| `11-search-sort.png`             | Tìm kiếm và thứ tự sắp xếp minh họa                                 | CHƯA BỔ SUNG |
| `12-export-json.png`             | JSON thật + kết quả verify-export, đúng bốn trường                  | CHƯA BỔ SUNG |
| `13-android-list.png`            | Danh sách chạy trên điện thoại thật/emulator, ghi rõ thiết bị       | CHƯA BỔ SUNG |
| `14-android-picker.png`          | Thao tác chọn ảnh từ thư viện Android                               | CHƯA BỔ SUNG |
| `15-android-persisted-image.png` | Ảnh còn sau tải lại và hiển thị cùng bản ghi trên web/thiết bị khác | CHƯA BỔ SUNG |

**VỊ TRÍ CHÈN ẢNH WEB:** [BỔ SUNG ảnh 02–12 cùng chú thích thao tác thực tế].

**VỊ TRÍ CHÈN ẢNH ANDROID:** [BỔ SUNG ảnh 13–15, tên thiết bị, Android version và Expo Go/development build].

Không chụp secrets trong terminal/env, mật khẩu đăng nhập, JWT response hoặc thông tin cá nhân không phục vụ bài. Không dùng ảnh thiết kế hay fixture để khẳng định đã kết nối Atlas.

## 13. Phần cần hoàn thành trước nộp

1. Cấu hình backend thật, kiểm tra health connected và đọc GV001 đúng thông tin ban đầu.
2. Demo CRUD bằng bản ghi mới do mình tạo, không xóa/sửa bản ghi hiện có để chạy test. Xác nhận schema/ảnh trong Atlas.
3. Thực hiện web và Android theo [checklist](demo-checklist.md), ghi ngày/thiết bị/kết quả thật.
4. Bổ sung đầy đủ ảnh vào báo cáo, xuất JSON Atlas thật và kiểm tra file.
5. Đưa source đã rà secret lên GitHub bằng tài khoản của mình; điền link đầu báo cáo.
6. Quay video, tải lên dịch vụ được yêu cầu, điền link thật và kiểm tra quyền xem.
7. Điền thông tin sinh viên/giảng viên, rà soát các mục BỔ SUNG trước khi chuyển báo cáo sang định dạng nộp.

## 14. Tài liệu tham khảo

- [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/)
- [Expo ImagePicker SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/)
- [Expo ImageManipulator SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/imagemanipulator/)
- [Expo SecureStore SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/)
- [Expo Router authentication](https://docs.expo.dev/router/advanced/authentication/)
- [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Express 5 API](https://expressjs.com/en/5x/api/)
- [Mongoose schema](https://mongoosejs.com/docs/guide.html)
