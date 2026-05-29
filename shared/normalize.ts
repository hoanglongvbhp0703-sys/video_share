/**
 * Normalise Vietnamese text sang dạng không dấu, chữ thường.
 * Dùng để lưu vào cột *Norm trong DB và chuẩn hoá query trước khi search,
 * cho phép tìm "honganh" → khớp "Hồng Anh", "duong" → "Đường", v.v.
 *
 * Thuật toán:
 *  1. NFD decompose: "ồ" → o + combining-circumflex + combining-grave
 *  2. Xoá toàn bộ combining diacritics (U+0300–U+036F)
 *  3. Thay đ/Đ → d (ký tự này không tách được qua NFD)
 *  4. Lowercase toàn bộ
 */
export function normalizeVi(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[Đđ]/g, "d")
    .toLowerCase();
}
