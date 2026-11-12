# Quản lý giảng viên — bài giữa kỳ lập trình đa nền tảng

Ứng dụng phân hệ admin dùng Expo/React Native trên web và Android. Frontend gọi REST API Express; chỉ backend kết nối MongoDB Atlas `QLHocPhan.GiangVien`.

Đã triển khai đăng nhập, danh sách, thêm/sửa/xóa, chọn và nén ảnh, tìm kiếm, sắp xếp, phân trang, tải lại và xuất JSON. Code không seed/reset database, không tạo collection tài khoản. Khi thiếu cấu hình hoặc MongoDB lỗi, API không tự chuyển sang dữ liệu mẫu.

**Trạng thái bàn giao:** lint, TypeScript, build web, bundle Android và 37 bài kiểm thử backend đã đạt. Kiểm thử backend dùng MongoDB tạm riêng trên localhost. Đã kết nối Atlas thật và đọc GV001 đúng dữ liệu; health, đăng nhập và danh sách API trả HTTP 200 sau cấu hình DNS riêng cho Node. Chưa chạy trên điện thoại, chưa có ảnh minh họa hoặc JSON xuất từ Atlas. Xem [báo cáo](docs/bao-cao.md) và [checklist demo](docs/demo-checklist.md).

## 1. Môi trường và cấu trúc

- Windows PowerShell, Node.js **22.13 trở lên** (đã kiểm tra với 22.23.2), npm.
- Expo SDK **58**, React Native **0.88.1**, React **19.3**, TypeScript.
- Tài khoản MongoDB Atlas và database/collection đang có. Không tạo lại GV001.
- Android: Expo Go tương thích SDK 58 hoặc development build. Muốn dùng emulator cần cài sẵn emulator; build APK trên EAS không cần Android Studio.

Các lệnh dưới dùng `npm.cmd`/`npx.cmd` để tránh lỗi PowerShell chặn chạy `npm.ps1`; không cần đổi Execution Policy.

```text
src/app/                 Các route Expo Router: login, index, lecturers/new, lecturers/[id]
src/components/          Form giảng viên và thành phần giao diện dùng chung
src/context/auth.tsx     Phiên đăng nhập, đăng xuất, xử lý token hết hạn/HTTP 401
src/services/            Gọi API, lưu token, chọn/nén ảnh, tải JSON riêng cho web
src/types/               Kiểu dữ liệu frontend
server/src/              Cấu hình, MongoDB/schema, validation, REST API, khởi động
server/scripts/          Tạo JWT secret, xuất và kiểm tra JSON
server/test/             Kiểm thử tích hợp trên mongod tạm, không dùng Atlas
docs/                    Báo cáo, checklist demo, vị trí bổ sung ảnh
exports/                 JSON thật sau khi bạn xuất; được gitignore
```

Luồng xử lý: màn hình → `request()` có Bearer token → Express xác thực và validation → Mongoose → Atlas → phản hồi → cập nhật danh sách. Frontend chỉ biết URL API; không biết URI MongoDB hay mật khẩu admin trong cấu hình.

## 2. Cài dependency từ source đã bàn giao

Mở PowerShell tại project:

```powershell
Set-Location D:\midtem-danentang
npm.cmd ci
Set-Location server
npm.cmd ci
Set-Location ..
```

Các lệnh đã dùng để bổ sung thư viện (phục vụ báo cáo, không cần chạy lại sau `npm ci`):

```powershell
# Tại thư mục gốc — Expo tự chọn phiên bản tương thích SDK 58
npx.cmd expo install expo-image-picker expo-image-manipulator expo-secure-store
npx.cmd expo install expo-dev-client expo-build-properties
npx.cmd expo install eslint eslint-config-expo --dev
npx.cmd expo install prettier --dev

# Tại server — backend Node riêng, không sử dụng Expo SDK
Set-Location server
npm.cmd install express mongoose cors dotenv jsonwebtoken express-rate-limit helmet sharp
npm.cmd install --save-dev supertest mongodb-memory-server
```

Phiên bản chính xác đã khóa trong hai file `package-lock.json`. Không chạy `npm audit fix --force` để hạ Expo SDK hoặc phá tương thích.

## 3. Cấu hình MongoDB Atlas và admin

1. Atlas **Database Access**: dùng database user có quyền `readWrite` trên `QLHocPhan` (bao gồm tạo index). Đây là tài khoản database, khác tài khoản đăng nhập trang Atlas.
2. **Network Access**: thêm IP public hiện tại của máy chạy backend. Khi đổi mạng/VPN, kiểm tra lại IP. Không cần mở Atlas cho mọi IP để chạy bài.
3. **Connect → Drivers**: lấy URI, thay database user/password thật; percent-encode ký tự đặc biệt trong password. URI mẫu chỉ chứa placeholder.
4. Kiểm tra collection `GiangVien` đang có GV001 — Ngô Lê Quân — Image rỗng — SumClass 5. Không import hay chèn lại bản ghi này.

Tạo cấu hình một lần, không ghi đè nếu đã có `.env` riêng:

```powershell
Set-Location D:\midtem-danentang
if (-not (Test-Path server/.env)) { Copy-Item server/.env.example server/.env }
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
Set-Location server
npm.cmd run generate-secret
```

`generate-secret` ghi JWT secret ngẫu nhiên trực tiếp vào `server/.env`, không in giá trị và không ghi đè secret có sẵn. Điền `ADMIN_USERNAME` và `ADMIN_PASSWORD` trực tiếp trong file backend này; không cần tạo hash. Mật khẩu tối thiểu 8 ký tự, tối đa 72 **byte UTF-8** (tiếng Việt có thể nhiều byte/ký tự).

Mở `server/.env` bằng VS Code và điền:

| Biến                  | Nội dung cần cấu hình                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `MONGODB_URI`         | URI Atlas thật; backend luôn chỉ định `dbName: QLHocPhan`                                      |
| `MONGODB_DNS_SERVERS` | `1.1.1.1,8.8.8.8` để truy vấn Atlas SRV/TXT trong riêng Node; để trống dùng DNS hệ thống       |
| `ADMIN_USERNAME`      | Tên đăng nhập admin do bạn chọn                                                                |
| `ADMIN_PASSWORD`      | Mật khẩu admin dạng thường, đặt trong dấu nháy đơn; chỉ lưu trong server/.env                  |
| `JWT_SECRET`          | Đã được tiện ích sinh, giữ kín                                                                 |
| `JWT_TTL_MINUTES`     | Mặc định 60 phút                                                                               |
| `PORT`, `HOST`        | Mặc định `4000`, `0.0.0.0` để truy cập qua LAN                                                 |
| `CORS_ORIGINS`        | Origin web được phép, ví dụ `http://localhost:8081,http://127.0.0.1:8081`; không thêm `/` cuối |

Không đưa `.env`, mật khẩu, token hoặc URI thật vào ảnh chụp/GitHub/video. Không đặt chúng vào `EXPO_PUBLIC_*`. Không có tài khoản hay mật khẩu mặc định trong source.

### DNS riêng của backend khi Atlas báo querySrv ECONNREFUSED

Trong server/.env đã cấu hình:

```dotenv
MONGODB_DNS_SERVERS=1.1.1.1,8.8.8.8
```

Backend gọi dns.setServers trước khi kết nối URI mongodb+srv; cấu hình áp dụng cho resolver SRV/TXT của tiến trình Node, không thay DNS Windows và không thay URI/TLS. Script export dùng cùng cấu hình. Để trống biến này nếu muốn dùng DNS hệ thống. Đổi env xong cần dừng và chạy lại backend.

Kiểm tra Atlas chỉ đọc, không tạo index hay sửa dữ liệu:

```powershell
Set-Location D:\midtem-danentang\server
npm.cmd run check:db
```

Không dùng 0.0.0.0/0 trong Atlas để sửa lỗi DNS. IP Access List nên chứa IP public của máy chạy backend (/32); khi IP public thay đổi thì cập nhật entry tương ứng. HOST=0.0.0.0 trong env là địa chỉ bind API để điện thoại truy cập LAN, khác với dải IP cho phép của Atlas.

## 4. Chạy backend và web

**Terminal 1 — backend:**

```powershell
Set-Location D:\midtem-danentang\server
npm.cmd run dev
```

API chỉ bắt đầu lắng nghe sau khi kết nối DB, kiểm tra mã trùng và tạo/kiểm tra unique index thành công. Không tự xóa document để xử lý mã trùng. Khi phát hiện trùng sau trim, log liệt kê tối đa 20 mã và số bản ghi để bạn kiểm tra thủ công. Không tự chuyển database theo tên tùy ý trong URI.

**Terminal 2 — kiểm tra kết nối rồi chạy web:**

```powershell
Set-Location D:\midtem-danentang
Invoke-RestMethod http://localhost:4000/api/health
# .env ở thư mục gốc phải có EXPO_PUBLIC_API_URL=http://localhost:4000/api
npx.cmd expo start --web --port 8081
```

Mở `http://localhost:8081`, đăng nhập bằng tài khoản bạn vừa cấu hình. Ảnh trống/tải thất bại sẽ hiển thị chữ viết tắt tên. Sau khi sửa `.env`, dừng Metro bằng Ctrl+C rồi khởi động lại với `--clear` nếu cần. Khi đổi cấu hình backend, cũng khởi động lại backend.

## 5. Chạy Android

URL frontend luôn có hậu tố `/api`:

| Thiết bị                              | `EXPO_PUBLIC_API_URL`                     |
| ------------------------------------- | ----------------------------------------- |
| Web trên máy chạy backend             | `http://localhost:4000/api`               |
| Android Emulator chuẩn Android Studio | `http://10.0.2.2:4000/api`                |
| Điện thoại thật                       | `http://<IPv4-LAN-của-máy-tính>:4000/api` |

Để dùng đồng thời web và điện thoại, bạn có thể dùng **cùng URL IP LAN** cho cả hai. Nếu mở web bằng `http://<IP-LAN>:8081`, thêm chính origin đó vào `CORS_ORIGINS` rồi restart backend.

**Điện thoại thật qua Expo Go:**

1. Chạy `ipconfig`; lấy IPv4 của Wi-Fi/Ethernet đang kết nối, không lấy adapter VPN/WSL.
2. Máy tính và điện thoại cùng Wi-Fi, tắt chế độ cách ly thiết bị của guest Wi-Fi nếu có.
3. Sửa `.env` gốc theo IP vừa lấy. Backend giữ `HOST=0.0.0.0`.
4. Trên trình duyệt điện thoại, thử `http://<IP-LAN>:4000/api/health`; phải báo connected trước khi thử app.
5. Khởi động Metro rồi quét QR bằng Expo Go tương thích SDK 58:

```powershell
Set-Location D:\midtem-danentang
npx.cmd expo start --go --lan --clear
```

Nếu Windows Firewall chặn mạng riêng, cho phép Node.js trên **Private network**. Nếu cần tạo rule cổng bằng PowerShell **Run as Administrator**, chỉ chạy lệnh phù hợp với mạng tin cậy của bạn:

```powershell
New-NetFirewallRule -DisplayName 'QLGV API LAN' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 4000 -Profile Private -RemoteAddress LocalSubnet
New-NetFirewallRule -DisplayName 'QLGV Expo LAN' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8081 -Profile Private -RemoteAddress LocalSubnet
```

Không tự thay đổi firewall trong quá trình triển khai source. Tunnel của Expo chỉ đưa Metro ra ngoài, **không** tự tunnel Express cổng 4000.

**Development build khi Expo Go chưa hỗ trợ SDK 58 hoặc cần native build:**

Project đã có `expo-dev-client` và profile `development` trong `eas.json`. Tài liệu Expo tại thời điểm triển khai có lưu ý giai đoạn chuyển SDK 58; kiểm tra phiên bản Expo Go thay vì hạ SDK của project. Bạn tự thực hiện build bằng tài khoản Expo của mình:

```powershell
Set-Location D:\midtem-danentang
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest build:configure
npx.cmd eas-cli@latest build --platform android --profile development
# Cài APK development được EAS tạo lên điện thoại/emulator, sau đó:
npx.cmd expo start --dev-client --lan
```

Không có native build/EAS upload nào đã được chạy thay bạn. Profile này tạo APK phát triển, không submit store. `expo-build-properties` cho phép HTTP trong bản demo LAN; khi triển khai ra Internet, dùng API HTTPS và tắt `usesCleartextTraffic`. Không tạo/sửa thư mục `android/` hoặc `ios/` bằng tay.

Emulator: sửa URL thành `10.0.2.2`, mở emulator đã cài, chạy `npx.cmd expo start --go --android` hoặc dùng development build đã cài và `--dev-client --android`.

## 6. Quy ước dữ liệu và ảnh

Database: **QLHocPhan**. Collection: **GiangVien** (đúng chữ hoa/thường).

| Trường     | Quy tắc                                                                        |
| ---------- | ------------------------------------------------------------------------------ |
| `IDGV`     | String bắt buộc, trim, tối đa 50 ký tự, unique phân biệt hoa/thường            |
| `Fullname` | String bắt buộc, trim, tối đa 150 ký tự, giữ dấu tiếng Việt                    |
| `Image`    | String rỗng, data URI JPEG/PNG/WebP hợp lệ hoặc URL HTTPS hợp lệ               |
| `SumClass` | Number bắt buộc, số nguyên không âm trong phạm vi số nguyên an toàn JavaScript |

MongoDB thêm `_id` kỹ thuật. Không có `__v`, timestamps hay trường đăng nhập trong schema. API từ chối trường dư, không nhận toán tử MongoDB từ form. PUT yêu cầu đủ bốn trường; frontend gửi nguyên ảnh hiện tại khi không đổi ảnh.

Chọn ảnh thực tế bằng `expo-image-picker`: web mở file picker; Android dùng system photo picker nên không đòi quyền đọc toàn bộ thư viện khi không cần. Nhánh iOS xử lý quyền ảnh. Nén bằng API `ImageManipulator.manipulate` SDK 58; không dùng API cũ đã deprecated. Ảnh gốc tối đa 10 MiB, cạnh dài sau resize tối đa 768 px, JPEG chất lượng 0.72. Ảnh gửi/lưu tối đa 1 MiB sau giải mã; server giới hạn body JSON 1500 KiB, kiểm tra Base64/MIME và giải mã ảnh bằng Sharp, giới hạn 16 megapixel. Ảnh nhiều khung hình bị từ chối. `file://` và `blob:` chỉ tồn tại tạm, không lưu vào DB.

URL HTTPS được kiểm tra cú pháp, không fetch từ backend; URL bên ngoài vẫn có thể hết hạn/không cho tải và khi đó UI dùng ảnh thay thế. Ưu tiên chọn ảnh để Base64 nằm trực tiếp trong MongoDB, hiển thị được sau tải lại và trên thiết bị khác.

## 7. API

Base URL: `http://localhost:4000/api`. Các route `giang-vien` yêu cầu `Authorization: Bearer <token>`. Health/login công khai.

| Method | Route                | Kết quả                                                      |
| ------ | -------------------- | ------------------------------------------------------------ |
| GET    | `/health`            | 200 khi DB sẵn sàng, 503 khi mất kết nối sau khởi động       |
| POST   | `/auth/login`        | Body `{username,password}`; trả `{token,expiresAt,username}` |
| GET    | `/giang-vien`        | `{data,total,page,limit,pages}`                              |
| GET    | `/giang-vien/:id`    | Chi tiết theo MongoDB `_id`                                  |
| POST   | `/giang-vien`        | Tạo với đúng bốn trường, 201                                 |
| PUT    | `/giang-vien/:id`    | Sửa đủ bốn trường, 200                                       |
| DELETE | `/giang-vien/:id`    | Xóa đúng document, 200                                       |
| GET    | `/giang-vien/export` | Tải toàn bộ collection thành mảng JSON đúng bốn trường       |

Danh sách hỗ trợ `q`, `sort=Fullname|SumClass`, `order=asc|desc`, `page=1`, `limit=20` (tối đa 50). Tìm theo mã/họ tên, không phân biệt hoa thường; nhập dấu tiếng Việt đúng, chưa có tìm bỏ dấu. Sắp xếp theo toàn bộ Fullname bằng collation `vi`; `_id` giữ thứ tự ổn định khi bằng nhau. Export lấy **toàn bộ collection**, không chỉ trang hoặc bộ lọc đang xem.

Mã lỗi chính: 400 dữ liệu sai, 401 chưa đăng nhập/token hết hạn, 403 origin CORS chưa cho phép, 404 không tìm thấy, 409 mã trùng, 413 body quá lớn, 429 thử đăng nhập quá nhiều, 503 không thể xử lý DB. Không trả stack trace/URI. Sai đăng nhập tối đa 10 lần/15 phút/IP; bộ đếm chạy trong một tiến trình, restart sẽ reset. Đây là phạm vi backend một instance của bài học.

Token JWT HS256 mặc định 60 phút. Web dùng sessionStorage theo tab; Android dùng SecureStore. Không lưu mật khẩu trên client. Đăng xuất xóa token phía client; token đã bị sao chép trước đó vẫn có hiệu lực đến lúc hết hạn (không có collection/session blacklist).

## 8. Xuất JSON thật để nộp

Sau khi cấu hình và kết nối Atlas thành công, dùng nút **Xuất JSON** trên web sau đăng nhập. Hoặc chạy script đọc trực tiếp Atlas ở terminal backend:

```powershell
Set-Location D:\midtem-danentang\server
npm.cmd run export
# Mặc định tạo D:\midtem-danentang\exports\GiangVien.json
npm.cmd run verify-export -- ../exports/GiangVien.json
```

Script dùng `MONGODB_URI` và cấu hình tùy chọn `MONGODB_DNS_SERVERS` từ `server/.env`; không cần đăng nhập web, không tạo index/seed hay sửa dữ liệu. File đã tồn tại sẽ không bị ghi đè. Muốn bản xuất mới:

```powershell
npm.cmd run export -- ../exports/GiangVien-lan-2.json
npm.cmd run verify-export -- ../exports/GiangVien-lan-2.json
```

Nếu export thất bại giữa chừng, file có thể dở dang; chỉ dùng file của lần chạy thành công và đã `verify-export`. Bản xuất có Image Base64 có thể dài; không bỏ Image để làm file ngắn. Không đưa `_id`, `__v` hay thông tin admin vào bản nộp. Thư mục exports được ignore để bạn quyết định cách nộp dữ liệu thật, không tự đưa lên GitHub.

Chưa có file JSON Atlas thật trong bản bàn giao; không có dữ liệu mẫu giả làm bản xuất. Việc kiểm tra cấu trúc JSON không tự chứng minh nguồn gốc Atlas — cần kèm ảnh DB/demo thực tế.

## 9. Kiểm tra lại project

```powershell
Set-Location D:\midtem-danentang
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build:web
npx.cmd expo export --platform android --output-dir dist/android-check
npx.cmd expo-doctor
Set-Location server
npm.cmd run check
npm.cmd test
```

Test tự chạy một tiến trình mongod tạm, tên database ngẫu nhiên `QLHocPhan_test_*`, đóng và xóa môi trường tạm khi xong. Không đọc URI Atlas để chạy CRUD test. Lần cài/chạy đầu có thể cần Internet để tải binary MongoDB; lỗi tải binary là blocker môi trường, không phải kết quả test đạt. Không đổi test sang URI production để giải quyết lỗi này.

Web export tạo thư mục `dist/` với output `server` như cấu hình Expo hiện có; đây là build artifact, không phải backend Express. Để demo local vẫn chạy Express và `expo start --web` ở hai terminal. Android export chỉ kiểm tra bundle Hermes, không phải APK hay kiểm thử thiết bị.

## 10. Lỗi thường gặp

| Hiện tượng                                 | Cách xử lý                                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Chưa cấu hình EXPO_PUBLIC_API_URL          | Tạo `.env` ở **gốc**, điền URL có `/api`, restart Metro                                                       |
| ECONNREFUSED/không gọi được API            | Kiểm tra log backend; chỉ có API khi Atlas kết nối thành công                                                 |
| Web được nhưng điện thoại lỗi              | Không dùng localhost trên điện thoại; kiểm tra IP LAN, cùng Wi-Fi, port 4000, HOST và firewall                |
| Expo QR được nhưng API lỗi khi dùng tunnel | Tunnel Metro không tunnel backend; kiểm tra URL API độc lập                                                   |
| CORS                                       | Thêm đúng origin web gồm scheme/host/port; không thêm `/api` vào CORS_ORIGINS                                 |
| Atlas authentication failed                | Kiểm tra database user, password percent-encode và quyền QLHocPhan                                            |
| querySrv ECONNREFUSED/ETIMEOUT/ENOTFOUND   | Kiểm tra MONGODB_DNS_SERVERS=1.1.1.1,8.8.8.8 trong server/.env, restart backend rồi chạy npm.cmd run check:db |
| Server selection timeout                   | Kiểm tra IP Access List, cluster đang hoạt động và khả năng kết nối mạng                                      |
| IDGV trùng khi khởi động                   | Xem mã và số lượng báo lỗi; xử lý thủ công sau khi rà soát, không reset collection                            |
| 409 khi lưu                                | Chọn IDGV chưa được giảng viên khác sử dụng                                                                   |
| 401 sau một thời gian                      | Đăng nhập lại; kiểm tra giờ hệ thống nếu hết hạn bất thường                                                   |
| 429                                        | Chờ 15 phút, kiểm tra tài khoản/mật khẩu; không thử liên tục                                                  |
| 413/ảnh lỗi                                | Chọn ảnh nhỏ, hợp lệ; thao tác chọn thiết bị sẽ nén trước khi gửi                                             |
| SDK không tương thích Expo Go              | Dùng development build SDK 58 theo mục 5; không tự hạ thư viện                                                |
| Cleartext HTTP bị chặn trong APK cũ        | Build lại sau thay app.json/plugin; hoặc dùng API HTTPS                                                       |
| Cổng 4000/8081 bị chiếm                    | Dừng đúng tiến trình cũ hoặc đổi port và cập nhật URL/CORS tương ứng                                          |

## 11. Hoàn thiện hồ sơ nộp bài

1. Cấu hình và chạy Atlas thật; xác nhận GV001 giữ nguyên.
2. Thao tác web/Android theo [demo checklist](docs/demo-checklist.md).
3. Chụp ảnh thật và bổ sung đúng vị trí trong [báo cáo](docs/bao-cao.md).
4. Xuất và kiểm tra JSON thật; lưu bản nộp phù hợp yêu cầu giảng viên.
5. Tự tạo repository GitHub, rà soát secret trước khi commit/push; điền link trong báo cáo.
6. Quay và đăng video demo, điền link. Source chưa được tự push/publish thay bạn.

Tài liệu đối chiếu API: [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/), [ImagePicker](https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/), [ImageManipulator](https://docs.expo.dev/versions/v58.0.0/sdk/imagemanipulator/), [SecureStore](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/), [Expo Router auth](https://docs.expo.dev/router/advanced/authentication/), [development builds](https://docs.expo.dev/develop/development-builds/introduction/).
