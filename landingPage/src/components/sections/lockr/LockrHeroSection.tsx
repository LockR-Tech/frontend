export default function LockrHeroSection() {
  return (
    <section className="relative w-full overflow-hidden flex items-center justify-center min-h-[600px] md:min-h-[800px] bg-lockr-surface-container-lowest">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          alt="Render 3D chân thực về một trung tâm logistics tương lai. Một drone giao hàng tự động màu trắng xanh nhạt bay gần một tòa nhà chọc trời hiện đại. Trên ban công của tòa nhà là một hệ thống tủ khóa thông minh hiện đại, phát ra ánh sáng LED xanh dịu nhẹ. Bối cảnh là buổi sáng sớm hoặc chiều muộn với ánh nắng ấm phản chiếu trên các mặt kính của thành phố."
          className="w-full h-full object-cover object-center"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDczRwNp_bINYtwGpYFzrnWd9C0uHuBuoN2dycvefiw51xK1_FFCnp0REVAJrGxy5KQFqTfkWeSQWPnJZZo--cYZedvgp2aMDbAKJrG7OVlq_21AS0Hn_EgQi56xtZXhi9w0D2_9YeM-9YkeAgL_dMf8bUj58HuvzTVGJQ5cpMRyTbh6nwDTbF8RNQl4UwHCBAowUVdrq6Q2xCCTExHIWocrSU2fouU3WFYjPf3_GyJW3jm9LCv4mGNYvQlZ0Ql_x1Sy2knec4wBZz2"
        />
        {/* Overlay to ensure text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-lockr-surface-container-lowest/90 via-lockr-surface-container-lowest/60 to-transparent" />
      </div>

      <div className="relative z-10 max-w-container-max mx-auto px-gutter w-full grid grid-cols-1 md:grid-cols-2 gap-lg items-center py-xl">
        <div className="lockr-glass-card p-lg rounded-xl lockr-ambient-shadow max-w-2xl">
          <h1 className="text-display-lg text-lockr-primary mb-md">
            Tương Lai Của Giao Nhận:
            <br />
            <span className="text-lockr-secondary">
              Tủ Khóa Thông Minh Kết Hợp Drone
            </span>
          </h1>

          <p className="text-body-lg text-lockr-on-surface-variant mb-lg">
            Lock.R mang đến giải pháp logistics 4.0 - Nhanh hơn, An toàn hơn,
            Tự động hóa hoàn toàn. Tối ưu hóa chuỗi cung ứng đô thị với sự kết
            hợp hoàn hảo giữa công nghệ hàng không không người lái và hạ tầng
            lưu trữ thông minh.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button className="bg-lockr-primary-container text-lockr-on-primary text-label-md px-lg py-sm rounded-lg hover:bg-lockr-primary transition-colors lockr-hover-lift flex items-center justify-center gap-xs">
              Trải Nghiệm Ngay
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px" }}
              >
                arrow_forward
              </span>
            </button>
            <button className="bg-lockr-surface-container-lowest border border-lockr-primary text-lockr-primary text-label-md px-lg py-sm rounded-lg hover:bg-lockr-surface-container-low transition-colors flex items-center justify-center">
              Tìm Hiểu Thêm
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
