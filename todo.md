# Video Sharing Platform - TODO

## Database & Backend
- [x] Thiế kế schema: videos, channels, comments, likes, subscriptions
- [x] Tạo migration SQL cho database
- [x] Xây dựng API: CRUD videos, channels, comments
- [x] Xây dựng API: like/dislike, subscribe/unsubscribe
- [x] Xây dựng API: search videos
- [x] Xây dựng API: upload video to S3 (uploadPresignedUrl, uploadFile, createWithUrls)

## Frontend - Layout & Navigation
- [x] Thiết kế giao diện xanh lá + trắng trong index.css
- [x] Xây dựng top navigation bar (logo, search, upload, user avatar)
- [x] Xây dựng sidebar navigation (categories)
- [x] Tạo layout chính (top nav + sidebar + content area)

## Frontend - Authentication & Home
- [x] Tích hợp Manus OAuth (đăng nhập/đăng xuất)
- [x] Hiển thị user info trên navbar
- [x] Xây dựng trang chủ (home) với grid video
- [x] Hiển thị video thumbnail, title, channel, view count

## Frontend - Video Watching
- [x] Xây dựng trang xem video (watch page)
- [x] Tích hợp video player
- [x] Hiển thị video info (title, description, views, date, channel)
- [x] Hiển thị related videos sidebar

## Frontend - Interactions
- [x] Xây dựng like/dislike button
- [x] Hiển thị số lượt like
- [x] Xây dựng hệ thống bình luận (add comment, list comments)
- [x] Hiển thị bình luận theo video

## Frontend - Channel & Subscription
- [x] Xây dựng trang kênh cá nhân (channel page)
- [x] Hiển thị thông tin kênh (avatar, tên, số subscriber)
- [x] Hiển thị danh sách video của kênh
- [x] Xây dựng nút subscribe/unsubscribe

## Frontend - Upload & Search
- [x] Xây dựng trang upload video
- [x] Form upload (title, description, video file, thumbnail)
- [x] Xây dựng trang kết quả tìm kiếm
- [x] Tích hợp search functionality vào top nav

## Testing & Quality Assurance
- [x] Viết Vitest cho videos, comments, likes, subscriptions API
- [x] Kiểm tra tốt cả test case đăng nhập, upload, tìm kiếm
- [x] Xử lý lỗi và validation trong API
- [x] Viết test cho upload file functionality (23 tests pass)

## UI/UX & Polish
- [x] Kiểm tra responsive design
- [x] Tối ưu hóa hiệu suất
- [x] Thêm loading states, error handling
- [x] Kiểm tra tích hợp toàn bộ hệ thống

## New Features - Drag and Drop
- [x] Thêm drag and drop handler cho video file input
- [x] Thêm drag and drop handler cho thumbnail file input
- [x] Hiển thị visual feedback khi drag over (highlight, change color)
- [x] Xử lý multiple files drop (chỉ lấy file đầu tiên)
- [x] Hiển thị file preview sau khi drop (thumbnail image preview với object URL)
- [x] Viết test cho drag and drop & file validation
- [x] Thêm nút xóa file với xóa preview

## New Features - Advanced Progress Tracking
- [x] Thêm tracking upload speed (MB/s)
- [x] Tính toán thời gian còn lại (ETA)
- [x] Hiển thị bytes uploaded / total bytes
- [x] Thêm progress bar chi tiết với phần trăm
- [x] Hiển thị tốc độ upload real-time
- [x] Viết test cho progress tracking logic (23 tests + 18 file validation tests)

## New Features - Mock Data & Seeding
- [x] Tạo script seed mock data (videos, channels, comments, likes)
- [x] Tạo dữ liệu user test (5 channels)
- [x] Tạo dữ liệu video test (50 videos)
- [x] Tạo dữ liệu comments test (410 comments)
- [x] Tạo dữ liệu likes test (749 likes)
- [x] Tạo dữ liệu subscriptions test (118 subscriptions)
- [x] Sinh ảnh thumbnail mock bằng AI image generation (tùy chọn - placeholder URLs đã đủ, có thể chạy `pnpm generate:thumbnails` sau nếu cần)


## New Features - View Tracking & History
- [ ] Tạo bảng watchHistory trong schema để lưu lịch sử xem
- [ ] Thêm API incrementViewCount thực tế (không hardcode)
- [ ] Thêm API recordWatchHistory để lưu lịch sử xem
- [ ] Gọi API tự động khi user xem video (Watch page)
- [ ] Hiển thị view count từ database (không hardcode)
- [ ] Viết test cho view tracking functionality
