import Layout from "@/components/Layout";
import { useState } from "react";
import { ChevronDown, ChevronUp, Search, Upload, Play, Bell, Users, Shield, MessageSquare, Settings } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSection {
  icon: React.ReactNode;
  title: string;
  items: FaqItem[];
}

const faqSections: FaqSection[] = [
  {
    icon: <Play className="w-5 h-5 text-primary" />,
    title: "Xem video",
    items: [
      {
        question: "Làm thế nào để xem video?",
        answer: "Nhấn vào bất kỳ video nào trên trang chủ hoặc tìm kiếm video bạn muốn. Video sẽ tự động phát khi tải xong.",
      },
      {
        question: "Tại sao video bị giật hoặc tải chậm?",
        answer: "Có thể do đường truyền internet của bạn không ổn định. Thử tải lại trang, kiểm tra kết nối mạng, hoặc thử xem lại sau.",
      },
      {
        question: "Tôi có thể xem lịch sử video đã xem không?",
        answer: "Có! Đăng nhập và vào mục \"Lịch sử xem\" trong sidebar để xem lại tất cả các video bạn đã xem.",
      },
    ],
  },
  {
    icon: <Upload className="w-5 h-5 text-primary" />,
    title: "Đăng video",
    items: [
      {
        question: "Làm thế nào để đăng video lên VideoShare?",
        answer: "Đăng nhập vào tài khoản, nhấn nút Upload ở thanh điều hướng trên cùng, chọn file video từ máy tính, điền tiêu đề và mô tả, sau đó nhấn Đăng.",
      },
      {
        question: "Video của tôi có dung lượng tối đa bao nhiêu?",
        answer: "Hiện tại hệ thống hỗ trợ video tối đa khoảng 35MB. Với video lớn hơn, bạn cần nén video trước khi đăng.",
      },
      {
        question: "Định dạng video nào được hỗ trợ?",
        answer: "VideoShare hỗ trợ các định dạng phổ biến: MP4, WebM, MOV, AVI. Định dạng MP4 (H.264) được khuyến nghị để có chất lượng tốt nhất.",
      },
      {
        question: "Tôi có thể thêm thumbnail cho video không?",
        answer: "Có! Khi đăng video, hệ thống tự động tạo thumbnail từ giây đầu tiên của video. Bạn cũng có thể tải lên thumbnail tùy chỉnh của riêng mình.",
      },
    ],
  },
  {
    icon: <Users className="w-5 h-5 text-primary" />,
    title: "Tài khoản & Kênh",
    items: [
      {
        question: "Làm thế nào để tạo tài khoản?",
        answer: "Nhấn nút \"Đăng ký\" ở góc trên bên phải, điền email, tên hiển thị và mật khẩu, sau đó nhấn \"Tạo tài khoản\".",
      },
      {
        question: "Tôi quên mật khẩu thì phải làm sao?",
        answer: "Hiện tính năng khôi phục mật khẩu qua email đang được phát triển. Vui lòng liên hệ hỗ trợ nếu bạn không thể đăng nhập.",
      },
      {
        question: "Kênh của tôi hoạt động như thế nào?",
        answer: "Mỗi tài khoản tự động có một kênh. Tên kênh đồng bộ với tên tài khoản của bạn. Video bạn đăng sẽ xuất hiện trên kênh này.",
      },
      {
        question: "Làm thế nào để đổi tên hiển thị?",
        answer: "Vào Cài đặt → Thông tin cơ bản → sửa tên hiển thị → Lưu thay đổi. Tên kênh sẽ tự động cập nhật theo.",
      },
    ],
  },
  {
    icon: <Bell className="w-5 h-5 text-primary" />,
    title: "Thông báo & Đăng ký",
    items: [
      {
        question: "Làm thế nào để đăng ký kênh?",
        answer: "Vào trang xem video hoặc trang kênh, nhấn nút \"Đăng ký\". Bạn sẽ nhận thông báo khi kênh đó đăng video mới.",
      },
      {
        question: "Tôi xem thông báo ở đâu?",
        answer: "Nhấn vào biểu tượng chuông 🔔 ở góc trên bên phải để xem thông báo gần đây. Nhấn \"Xem tất cả thông báo\" để xem đầy đủ.",
      },
    ],
  },
  {
    icon: <MessageSquare className="w-5 h-5 text-primary" />,
    title: "Bình luận & Tương tác",
    items: [
      {
        question: "Làm thế nào để bình luận?",
        answer: "Đăng nhập vào tài khoản, vào trang xem video, cuộn xuống phần bình luận, gõ bình luận của bạn và nhấn \"Bình luận\".",
      },
      {
        question: "Tôi có thể like/dislike video không?",
        answer: "Có! Nhấn nút 👍 hoặc 👎 dưới video. Bạn cần đăng nhập để thực hiện thao tác này. Nhấn lại lần nữa để bỏ like/dislike.",
      },
    ],
  },
  {
    icon: <Search className="w-5 h-5 text-primary" />,
    title: "Tìm kiếm",
    items: [
      {
        question: "Làm thế nào để tìm video?",
        answer: "Gõ từ khóa vào thanh tìm kiếm ở trên cùng. Khi gõ từ 2 ký tự trở lên, gợi ý tự động sẽ hiện ra. Nhấn Enter hoặc nút 🔍 để tìm kiếm đầy đủ.",
      },
      {
        question: "Tìm kiếm theo danh mục như thế nào?",
        answer: "Dùng sidebar bên trái để duyệt theo danh mục: Xu hướng, Âm nhạc, Gaming, Phim, Thể thao, Tin tức, v.v.",
      },
    ],
  },
  {
    icon: <Shield className="w-5 h-5 text-primary" />,
    title: "Báo cáo & An toàn",
    items: [
      {
        question: "Làm thế nào để báo cáo nội dung vi phạm?",
        answer: "Nhấn nút ⋮ (ba chấm) trên video hoặc bình luận, chọn \"Báo cáo\", chọn lý do phù hợp và xác nhận.",
      },
      {
        question: "VideoShare có quy tắc cộng đồng không?",
        answer: "Có. Nghiêm cấm nội dung bạo lực, phân biệt chủng tộc, xâm phạm quyền riêng tư, spam, và vi phạm bản quyền. Nội dung vi phạm sẽ bị xóa.",
      },
    ],
  },
  {
    icon: <Settings className="w-5 h-5 text-primary" />,
    title: "Cài đặt",
    items: [
      {
        question: "Tôi có thể đổi sang giao diện tối không?",
        answer: "Có! Vào Cài đặt → Giao diện → bật công tắc \"Chế độ tối\". Tùy chọn này được lưu lại cho lần sau.",
      },
      {
        question: "Làm thế nào để đổi mật khẩu?",
        answer: "Vào Cài đặt → Đổi mật khẩu, nhập mật khẩu hiện tại và mật khẩu mới, sau đó nhấn \"Đổi mật khẩu\".",
      },
    ],
  },
];

function AccordionItem({ question, answer }: FaqItem) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-4 px-0 text-left gap-4 hover:text-primary transition-colors"
      >
        <span className="text-sm font-medium text-gray-900">{question}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        }
      </button>
      {open && (
        <p className="text-sm text-gray-600 pb-4 leading-relaxed">{answer}</p>
      )}
    </div>
  );
}

export default function Help() {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? faqSections.map((s) => ({
        ...s,
        items: s.items.filter(
          (i) =>
            i.question.toLowerCase().includes(search.toLowerCase()) ||
            i.answer.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((s) => s.items.length > 0)
    : faqSections;

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Trung tâm trợ giúp</h1>
          <p className="text-gray-500">Tìm câu trả lời cho các câu hỏi thường gặp</p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm câu hỏi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
          />
        </div>

        {/* FAQ sections */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">Không tìm thấy câu hỏi phù hợp</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filtered.map((section) => (
              <div key={section.title} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                  {section.icon}
                  <h2 className="font-semibold text-gray-900">{section.title}</h2>
                </div>
                <div className="px-5">
                  {section.items.map((item) => (
                    <AccordionItem key={item.question} {...item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Contact */}
        <div className="mt-8 p-5 bg-primary/5 rounded-xl border border-primary/10 text-center">
          <p className="text-sm font-medium text-gray-900 mb-1">Không tìm thấy câu trả lời?</p>
          <p className="text-sm text-gray-500">
            Liên hệ chúng tôi qua email:{" "}
            <a href="mailto:support@videoshare.vn" className="text-primary hover:underline font-medium">
              support@videoshare.vn
            </a>
          </p>
        </div>
      </div>
    </Layout>
  );
}
