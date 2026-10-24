import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Loader2, RotateCcw, Unlock, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { useGetLockerLayoutQuery } from "~/stores/apis/admin/lockerOps";
import { useOpenCabinetBoxMutation } from "~/stores/apis/admin/cabinetControl";

type OpenState =
  | { kind: "sending" }
  | { kind: "done"; ok: boolean; message: string; at: Date };

/**
 * Đích của mã QR mở ô (tờ "QR mở ô để thử tủ" ở trang chi tiết tủ): vào trang là gửi lệnh mở ô
 * một lần, kèm nút mở lại. Trang nằm sau đăng nhập admin, lệnh đi qua API điều khiển tủ nên vẫn
 * kiểm ADMIN/KTV phụ trách tủ — mã QR một mình không mở được ô.
 */
export default function OpenBoxByQrPage() {
  const { t } = useTranslation();
  const params = useParams();
  const lockerId = Number(params.lockerId);
  const boxId = Number(params.boxId);
  const valid = Number.isInteger(lockerId) && lockerId > 0 && Number.isInteger(boxId) && boxId > 0;

  const { data: layoutData } = useGetLockerLayoutQuery(lockerId, { skip: !valid });
  const layout = layoutData?.data;
  const cell = layout?.cells?.find((c) => c.id === boxId);

  const [openBox] = useOpenCabinetBoxMutation();
  const [state, setState] = useState<OpenState | null>(null);
  // Chỉ tự mở một lần cho mỗi lần vào trang (StrictMode chạy effect hai lần ở dev).
  const autoOpened = useRef(false);

  const send = useCallback(async () => {
    setState({ kind: "sending" });
    try {
      const res = await openBox({ lockerId, boxId }).unwrap();
      const body = res?.data;
      setState({
        kind: "done",
        ok: Boolean(body?.accepted),
        message: body?.message || (body?.accepted ? "Đã gửi lệnh mở ô" : "Tủ không nhận lệnh mở ô"),
        at: new Date(),
      });
    } catch (err) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ||
        "Không gửi được lệnh mở ô — kiểm tra quyền tài khoản và kết nối của tủ";
      setState({ kind: "done", ok: false, message, at: new Date() });
    }
  }, [openBox, lockerId, boxId]);

  useEffect(() => {
    if (!valid || autoOpened.current) return;
    autoOpened.current = true;
    void send();
  }, [valid, send]);

  if (!valid) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {t("admin.lockers.openQr.invalidLink", "Mã QR không hợp lệ.")}
      </div>
    );
  }

  const boxLabel = cell ? `Ô ${cell.boxNumber}` : `Ô #${boxId}`;
  const lockerLabel = layout?.code ?? `#${lockerId}`;

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <Card>
        <CardContent className="space-y-4 p-6 text-center">
          <p className="text-xs text-muted-foreground">
            {t("admin.lockers.openQr.pageTitle", "Mở ô bằng mã QR (thử tủ)")} · {lockerLabel}
          </p>
          <p className="text-4xl font-bold">{boxLabel}</p>

          {state?.kind === "sending" || state == null ? (
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              {t("admin.lockers.openQr.sending", "Đang gửi lệnh mở ô...")}
            </div>
          ) : state.ok ? (
            <div className="flex flex-col items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-12 w-12" />
              <span className="font-semibold">{state.message}</span>
              <span className="text-xs text-muted-foreground">{state.at.toLocaleTimeString("vi-VN")}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-sm text-rose-700 dark:text-rose-400">
              <XCircle className="h-12 w-12" />
              <span className="font-semibold">{state.message}</span>
              <span className="text-xs text-muted-foreground">{state.at.toLocaleTimeString("vi-VN")}</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={() => void send()} disabled={state?.kind === "sending"}>
              {state?.kind === "done" ? <RotateCcw className="mr-1.5 h-4 w-4" /> : <Unlock className="mr-1.5 h-4 w-4" />}
              {t("admin.lockers.openQr.openAgain", "Mở lại ô này")}
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/admin/lockers/${lockerId}`}>{t("admin.lockers.openQr.backToLocker", "Về trang tủ")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
