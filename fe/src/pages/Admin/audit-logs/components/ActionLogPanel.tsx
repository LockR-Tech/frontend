import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { TableToolbar } from "~/components/shared/data-table";
import { useGetActionLogsQuery, type ActionLogParams } from "~/stores/apis/admin/auditLogs";
import { ActionLogTable } from "./ActionLogTable";

/**
 * Nhật ký thao tác của MỘT tủ hoặc MỘT drone (F3-G16) — gắn ở trang chi tiết: ai bật bảo trì, ai kích hoạt,
 * ai gán / bỏ KTV, ô nào báo hỏng / mở lại, lúc nào.
 */
export function ActionLogPanel({
  scope,
  title,
}: {
  scope: Pick<ActionLogParams, "lockerId" | "targetType" | "targetId">;
  title?: string;
}) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const scopeKey = `${scope.lockerId ?? ""}|${scope.targetType ?? ""}|${scope.targetId ?? ""}`;
  useEffect(() => setPage(0), [scopeKey]);

  const { data, isFetching, refetch } = useGetActionLogsQuery(
    { ...scope, page, size: pageSize },
    { refetchOnMountOrArgChange: true, refetchOnFocus: true },
  );
  const result = data?.data;

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          {title ?? t("admin.auditLogs.panelTitle")}
        </CardTitle>
        <TableToolbar onRefresh={() => void refetch()} />
      </CardHeader>
      <CardContent>
        <ActionLogTable
          rows={result?.content ?? []}
          isLoading={isFetching && !result}
          page={page}
          pageSize={pageSize}
          totalPages={result?.totalPages ?? 0}
          totalElements={result?.totalElements ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(0);
          }}
          hideTarget={scope.targetType === "DRONE" && scope.targetId != null}
        />
      </CardContent>
    </Card>
  );
}
