import i18n from "~/utils/i18n";

/**
 * Ghi chú mốc đơn tiếng Anh còn trong dữ liệu cũ (server nay đã ghi tiếng Việt cho các câu này).
 * Server chỉ dịch Việt → Anh (ADR-0010), nên ở giao diện tiếng Việt các câu này được đổi lại tại đây.
 * Ghi chú tiếng Việt, hoặc do người gõ, giữ nguyên.
 */
const EN_NOTES: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /^Reported dropped parcel: (.+)$/, key: "shared.serverNote.droppedParcel" },
  { pattern: /^Sender dropped parcel; pickup PIN issued to receiver (.*)$/, key: "shared.serverNote.senderDropped" },
  { pattern: /^Renter placed items; multi-use PIN active until deadline$/, key: "shared.serverNote.renterPlaced" },
  { pattern: /^Customer confirmed items dropped in locker$/, key: "shared.serverNote.customerDropped" },
  { pattern: /^Order checked out by staff$/, key: "shared.serverNote.checkedOutByStaff" },
  { pattern: /^Rental ended, cell released$/, key: "shared.serverNote.rentalEnded" },
  { pattern: /^Storage order picked up$/, key: "shared.serverNote.storagePickedUp" },
];

export function localizeServerNote(note: string | null | undefined): string | null | undefined {
  if (!note || !i18n.language?.startsWith("vi")) return note;
  for (const { pattern, key } of EN_NOTES) {
    const match = pattern.exec(note.trim());
    if (match) return i18n.t(key, { value: match[1] ?? "" });
  }
  return note;
}
