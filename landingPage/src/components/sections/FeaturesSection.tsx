import React from "react";
import KineticTestimonial from "@/components/ui/kinetic-testimonials";

const testimonials = [
  {
    name: "Nguyễn Minh Anh",
    handle: "@nguyenminhanh",
    review:
      "Lock.R đã thay đổi hoàn toàn cách chúng tôi quản lý dịch vụ giặt ủi. Hệ thống tủ khóa thông minh giúp khách hàng tự phục vụ mọi lúc, mọi nơi.",
    avatar:
      "https://images.unsplash.com/photo-1611558709798-e009c8fd7706?q=80&w=100&auto=format&fit=crop&ixlib=rb-4.0.3",
  },
  {
    name: "Trần Thị Lan",
    handle: "@tranthilan",
    review:
      "Tôi yêu thích cách Lock.R giúp tôi gửi và nhận đồ giặt mà không cần chờ đợi. Bảo mật cao, tiện lợi và nhanh chóng!",
    avatar:
      "https://plus.unsplash.com/premium_photo-1692340973636-6f2ff926af39?q=80&w=100&auto=format&fit=crop&ixlib=rb-4.0.3",
  },
  {
    name: "Lê Hoàng Nam",
    handle: "@lehoangnam",
    review:
      "Hệ thống tự động hóa và ứng dụng di động của Lock.R giúp tôi tiết kiệm hàng giờ mỗi tuần trong việc quản lý đồ giặt!",
    avatar:
      "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?q=80&w=100&auto=format&fit=crop&ixlib=rb-4.0.3",
  },
  {
    name: "Phạm Thùy Linh",
    handle: "@phamthuylinh",
    review:
      "Sử dụng Lock.R thật tuyệt vời — dễ dàng tạo ra trải nghiệm giặt ủi hiện đại mà không cần quy trình phức tạp.",
    avatar:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=100&auto=format&fit=crop&ixlib=rb-4.0.3",
  },
  {
    name: "Đỗ Thị Hương",
    handle: "@dothihuong",
    review:
      "Công nghệ khóa điện tử của Lock.R cho phép tôi tùy chỉnh mọi thứ theo ý muốn — hiệu suất vượt trội, bảo mật tuyệt đối.",
    avatar:
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=100&auto=format&fit=crop&ixlib=rb-4.0.3",
  },
  {
    name: "Võ Minh Châu",
    handle: "@vominhchau",
    review:
      "Tôi giới thiệu Lock.R cho tất cả những ai tìm kiếm giải pháp giặt ủi thông minh, tiện lợi với công nghệ hiện đại.",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop&ixlib=rb-4.0.3",
  },
  {
    name: "Hoàng Văn Dũng",
    handle: "@hoangvandung",
    review:
      "Dịch vụ tuyệt vời! Tủ khóa an toàn, đáng tin cậy. Giờ tôi có thể gửi đồ giặt bất cứ lúc nào mà không lo lắng.",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop&ixlib=rb-4.0.3",
  },
  {
    name: "Bùi Thị Mai",
    handle: "@buithimai",
    review:
      "Lock.R đã giúp tôi tiết kiệm rất nhiều thời gian. Không còn phải xếp hàng chờ đợi nữa!",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=100&auto=format&fit=crop&ixlib=rb-4.0.3",
  },
  {
    name: "Trương Quốc Huy",
    handle: "@truongquochuy",
    review:
      "Ứng dụng rất dễ sử dụng, thao tác nhanh chóng. Tôi rất hài lòng với dịch vụ này.",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100&auto=format&fit=crop&ixlib=rb-4.0.3",
  },
  {
    name: "Phan Thị Ngọc",
    handle: "@phanthingoc",
    review:
      "Hệ thống thông minh, hiện đại. Quản lý đồ giặt chưa bao giờ dễ dàng đến thế!",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop&ixlib=rb-4.0.3",
  },
  {
    name: "Lý Thanh Tùng",
    handle: "@lythanhtung",
    review:
      "Camera giám sát 24/7 khiến tôi hoàn toàn yên tâm khi gửi đồ. Dịch vụ đáng tin cậy!",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=100&auto=format&fit=crop&ixlib=rb-4.0.3",
  },
  {
    name: "Đinh Thị Hà",
    handle: "@dinhthiha",
    review:
      "Thông báo real-time rất tiện lợi. Tôi luôn biết đồ của mình đang ở đâu và khi nào có thể lấy.",
    avatar:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=100&auto=format&fit=crop&ixlib=rb-4.0.3",
  },
];

export default function FeaturesSection() {
  return (
    <KineticTestimonial
      testimonials={testimonials}
      className="bg-black md:py-0 py-0 not-prose"
      cardClassName="hover:scale-105 shadow-lg bg-zinc-900/50 border-zinc-800"
      avatarClassName="ring-2 ring-white/20"
      desktopColumns={3}
      tabletColumns={3}
      mobileColumns={2}
      speed={1.5}
      title="Đánh giá khách hàng"
      subtitle="Những phản hồi từ người dùng Lock.R"
    />
  );
}
