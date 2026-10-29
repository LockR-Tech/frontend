export interface DeleteManyResult {
  deleted: number[];
  failed: { id: number; message: string }[];
}

/// Xoá lần lượt từng mục qua API xoá lẻ: backend tự chặn mục không được xoá (còn tủ, đã có lượt dùng…),
/// mục lỗi không làm dừng các mục còn lại.
export async function deleteMany(ids: number[], deleteOne: (id: number) => Promise<unknown>): Promise<DeleteManyResult> {
  const result: DeleteManyResult = { deleted: [], failed: [] };
  for (const id of ids) {
    try {
      await deleteOne(id);
      result.deleted.push(id);
    } catch (err) {
      const e = err as { data?: { message?: string }; message?: string } | undefined;
      result.failed.push({ id, message: e?.data?.message || e?.message || "" });
    }
  }
  return result;
}
