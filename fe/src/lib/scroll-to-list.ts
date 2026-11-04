/** Đưa danh sách vào tầm nhìn sau khi bấm thẻ số (đợi một khung hình cho danh sách lọc xong). */
export function scrollToList(el: HTMLElement | null) {
  requestAnimationFrame(() => el?.scrollIntoView({ behavior: "smooth", block: "start" }));
}
