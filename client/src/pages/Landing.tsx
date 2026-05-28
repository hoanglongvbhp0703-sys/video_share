import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Play, Upload, Users, Zap, Star, ArrowDown } from "lucide-react";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, inView };
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: string;
}

function FeatureCard({ icon, title, description, delay = "0ms" }: FeatureCardProps) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: delay }}
      className={`bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 transition-all duration-700 ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-white/70 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

interface StatCardProps {
  number: string;
  label: string;
  delay?: string;
}

function StatCard({ number, label, delay = "0ms" }: StatCardProps) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: delay }}
      className={`text-center transition-all duration-700 ${
        inView ? "opacity-100 scale-100" : "opacity-0 scale-90"
      }`}
    >
      <p className="text-4xl md:text-5xl font-extrabold text-white mb-2">{number}</p>
      <p className="text-white/60 text-sm">{label}</p>
    </div>
  );
}

export default function Landing() {
  const [, navigate] = useLocation();
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const featuresRef = useRef<HTMLElement>(null);
  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const features = [
    {
      icon: <Play className="w-6 h-6 text-white" />,
      title: "Xem video mọi lúc",
      description: "Thưởng thức hàng nghìn video từ mọi thể loại: âm nhạc, gaming, phim, thể thao và nhiều hơn nữa.",
      delay: "0ms",
    },
    {
      icon: <Upload className="w-6 h-6 text-white" />,
      title: "Chia sẻ sáng tạo",
      description: "Đăng tải video của bạn lên nền tảng, xây dựng kênh riêng và kết nối với khán giả yêu thích nội dung của bạn.",
      delay: "100ms",
    },
    {
      icon: <Users className="w-6 h-6 text-white" />,
      title: "Cộng đồng sôi động",
      description: "Đăng ký theo dõi những kênh bạn yêu thích, bình luận và tương tác với cộng đồng sáng tạo nội dung.",
      delay: "200ms",
    },
    {
      icon: <Zap className="w-6 h-6 text-white" />,
      title: "Tìm kiếm thông minh",
      description: "Tìm chính xác video bạn muốn với công nghệ tìm kiếm thông minh và gợi ý tự động theo từ khóa.",
      delay: "300ms",
    },
  ];

  const { ref: stepsRef, inView: stepsVisible } = useInView(0.1);
  const { ref: ctaRef, inView: ctaVisible } = useInView(0.2);

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* ── Hero Section ────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-purple-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px]" />

        {/* Floating video cards decoration */}
        <div className="absolute top-20 left-8 md:left-16 hidden lg:block animate-bounce" style={{ animationDuration: "3s" }}>
          <div className="w-36 h-20 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 flex items-center justify-center">
            <Play className="w-8 h-8 text-white/60" />
          </div>
        </div>
        <div className="absolute bottom-32 right-8 md:right-16 hidden lg:block animate-bounce" style={{ animationDuration: "4s", animationDelay: "0.5s" }}>
          <div className="w-40 h-22 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-3">
            <div className="w-full h-2 bg-white/30 rounded mb-2" />
            <div className="w-3/4 h-2 bg-white/20 rounded" />
          </div>
        </div>
        <div className="absolute top-40 right-12 hidden lg:block animate-bounce" style={{ animationDuration: "3.5s", animationDelay: "1s" }}>
          <div className="w-10 h-10 bg-yellow-400/80 rounded-full flex items-center justify-center">
            <Star className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Hero content */}
        <div className={`relative z-10 text-center px-4 transition-all duration-1000 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/40">
              <span className="text-white text-xl font-extrabold">VS</span>
            </div>
            <span className="text-4xl font-extrabold text-white tracking-tight">VideoShare</span>
          </div>

          <h1 className={`text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight transition-all duration-1000 delay-200 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            Nơi mọi khoảnh khắc<br />
            <span className="bg-gradient-to-r from-primary via-blue-400 to-purple-400 bg-clip-text text-transparent">
              trở thành câu chuyện
            </span>
          </h1>

          <p className={`text-lg md:text-xl text-white/70 max-w-xl mx-auto mb-10 leading-relaxed transition-all duration-1000 delay-300 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            Khám phá, chia sẻ và kết nối qua những video đầy cảm hứng. Tham gia cộng đồng sáng tạo của chúng tôi ngay hôm nay.
          </p>

          <div className={`flex flex-col sm:flex-row gap-4 justify-center transition-all duration-1000 delay-500 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <button
              onClick={() => navigate("/register")}
              className="px-8 py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-full text-lg transition-all hover:scale-105 hover:shadow-xl hover:shadow-primary/30 active:scale-95"
            >
              Bắt đầu miễn phí
            </button>
            <button
              onClick={() => navigate("/login")}
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-full text-lg transition-all border border-white/30 backdrop-blur-sm hover:scale-105"
            >
              Đã có tài khoản
            </button>
          </div>
        </div>

        {/* Scroll cue */}
        <button
          onClick={scrollToFeatures}
          className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 hover:text-white/80 transition-all duration-300 ${heroVisible ? "opacity-100" : "opacity-0"}`}
          style={{ transitionDelay: "800ms" }}
        >
          <span className="text-xs font-medium tracking-widest uppercase">Khám phá</span>
          <ArrowDown className="w-5 h-5 animate-bounce" />
        </button>
      </section>

      {/* ── Stats Section ────────────────────────────────────────────── */}
      <section className="py-16 bg-gradient-to-r from-primary to-blue-600">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatCard number="10K+" label="Video đã đăng" delay="0ms" />
          <StatCard number="5K+" label="Người dùng" delay="100ms" />
          <StatCard number="50K+" label="Lượt xem mỗi ngày" delay="200ms" />
          <StatCard number="100+" label="Kênh nội dung" delay="300ms" />
        </div>
      </section>

      {/* ── Features Section ────────────────────────────────────────── */}
      <section
        ref={featuresRef as any}
        className="py-20 bg-gradient-to-br from-[#0f3460] via-[#16213e] to-[#1a1a2e]"
      >
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
              Tại sao chọn VideoShare?
            </h2>
            <p className="text-white/60 max-w-lg mx-auto">
              Nền tảng chia sẻ video đơn giản, mạnh mẽ và thân thiện với người dùng Việt Nam.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
              Bắt đầu chỉ trong 3 bước
            </h2>
          </div>
          <div ref={stepsRef} className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Tạo tài khoản", desc: "Đăng ký miễn phí với email và mật khẩu trong vài giây.", delay: "0ms" },
              { step: "02", title: "Khám phá & xem", desc: "Duyệt video theo danh mục yêu thích hoặc tìm kiếm nội dung bạn muốn.", delay: "150ms" },
              { step: "03", title: "Tạo & chia sẻ", desc: "Upload video của bạn, xây dựng kênh và thu hút người theo dõi.", delay: "300ms" },
            ].map(({ step, title, desc, delay }) => (
              <div
                key={step}
                style={{ transitionDelay: delay }}
                className={`text-center transition-all duration-700 ${stepsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              >
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-extrabold text-primary">{step}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ──────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div
          ref={ctaRef}
          className={`relative z-10 max-w-2xl mx-auto px-4 text-center transition-all duration-1000 ${ctaVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Sẵn sàng tham gia chưa?
          </h2>
          <p className="text-white/60 mb-8 text-lg">
            Tham gia hàng nghìn người sáng tạo nội dung trên VideoShare ngay hôm nay.
          </p>
          <button
            onClick={() => navigate("/register")}
            className="px-10 py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-full text-xl transition-all hover:scale-105 hover:shadow-2xl hover:shadow-primary/30 active:scale-95"
          >
            Bắt đầu ngay — Miễn phí
          </button>
          <p className="text-white/40 text-sm mt-4">
            Không cần thẻ tín dụng • Đăng ký trong 30 giây
          </p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="py-8 bg-[#0d0d1a] text-center text-white/30 text-sm">
        <p>© 2025 VideoShare. Được xây dựng với ❤️ tại Việt Nam.</p>
      </footer>
    </div>
  );
}
