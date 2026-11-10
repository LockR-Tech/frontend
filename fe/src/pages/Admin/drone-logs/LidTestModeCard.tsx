import { useState } from 'react';
import { AlertTriangle, ArrowRight, FlaskConical, Loader2, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent } from '~/components/ui/card';
import { Switch } from '~/components/ui/switch';
import { useUpdateBusinessSettingsMutation } from '~/stores/apis/admin/businessSettings';
import { useGetLidTestStatusQuery, type LidTestStatus } from '~/stores/apis/admin/droneCommLogs';
import { ConfirmActionDialog } from '~/pages/Admin/knowledge/ConfirmActionDialog';

/// Khoá setting (scope order) bật/tắt chế độ thử nắp — trùng OrderSettingsCatalog.DRONE_LID_TEST_ENABLED.
const LID_TEST_ENABLED_KEY = 'app.drone.lid-test.enabled';

interface Props {
  /// Tên hiển thị của tủ theo lockerId (vd. "CAB-TU01"); không có thì hiện "#id".
  lockerLabel: (lockerId: number) => string;
}

/// Bật/tắt chế độ thử nắp trượt theo mã ArUco: camera thấy mã trong danh sách ⇒ nắp ô tương ứng mở (thật),
/// giữ vài giây rồi đóng (thật). Không cần đơn; mọi thông điệp vẫn ghi vào nhật ký bên dưới.
export function LidTestModeCard({ lockerLabel }: Props) {
  const { t } = useTranslation();
  const { data, isLoading, refetch } = useGetLidTestStatusQuery(undefined, { pollingInterval: 5000 });
  const [updateSettings, { isLoading: saving }] = useUpdateBusinessSettingsMutation();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  // Bật = camera chỉ thử nắp (motor quay thật, ngừng xử lý giao hàng) ⇒ hỏi lại; tắt thì làm ngay.
  const [confirmOn, setConfirmOn] = useState(false);

  const status: LidTestStatus | undefined = data?.data;
  const enabled = optimistic ?? status?.enabled ?? false;
  const activeCount = status?.activeSessions?.length ?? 0;

  const toggle = async (next: boolean) => {
    setOptimistic(next);
    try {
      await updateSettings({ scope: 'order', values: { [LID_TEST_ENABLED_KEY]: next } }).unwrap();
      toast.success(next ? t('admin.droneLogs.lidTest.toastOn') : t('admin.droneLogs.lidTest.toastOff'));
      await refetch();
    } catch {
      toast.error(t('admin.droneLogs.lidTest.toastError'));
    } finally {
      setOptimistic(null);
    }
  };

  return (
    <Card className={enabled ? 'border-amber-400 dark:border-amber-600' : undefined}>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <FlaskConical
              className={`w-5 h-5 mt-0.5 shrink-0 ${enabled ? 'text-amber-500' : 'text-muted-foreground'}`}
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{t('admin.droneLogs.lidTest.title')}</h3>
                <Badge
                  variant="outline"
                  className={
                    enabled
                      ? 'text-amber-700 border-amber-300 bg-amber-50 dark:text-amber-300 dark:border-amber-700 dark:bg-amber-950/40 text-[11px]'
                      : 'text-muted-foreground text-[11px]'
                  }
                >
                  {enabled ? t('admin.droneLogs.lidTest.on') : t('admin.droneLogs.lidTest.off')}
                </Badge>
                {activeCount > 0 && (
                  <Badge className="bg-sky-600 text-white text-[11px]">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    {t('admin.droneLogs.lidTest.running', { count: activeCount })}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {t('admin.droneLogs.lidTest.description', { seconds: status?.holdSeconds ?? 5 })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(saving || isLoading) && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Switch
              checked={enabled}
              disabled={saving || isLoading || !status}
              onCheckedChange={(next) => (next ? setConfirmOn(true) : void toggle(false))}
              aria-label={t('admin.droneLogs.lidTest.title')}
            />
          </div>
        </div>

        {status && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {status.targets.map((target) => (
              <span
                key={`${target.markerId}-${target.boxId}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1"
                title={target.problem ?? undefined}
              >
                <Badge
                  variant="outline"
                  className="font-mono text-[11px] bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800"
                >
                  {t('admin.droneLogs.lidTest.marker', { id: target.markerId })}
                </Badge>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium">
                  {target.boxNumber
                    ? t('admin.droneLogs.boxNumber', { n: target.boxNumber })
                    : t('admin.droneLogs.boxId', { id: target.boxId })}
                </span>
                <span className="text-muted-foreground">· {lockerLabel(status.lockerId)}</span>
                {target.problem && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
              </span>
            ))}
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Timer className="w-3.5 h-3.5" />
              {t('admin.droneLogs.lidTest.hold', { seconds: status.holdSeconds })}
            </span>
          </div>
        )}

        {status?.targets.some((target) => target.problem) && (
          <ul className="text-[11px] text-amber-700 dark:text-amber-300 space-y-0.5">
            {status.targets
              .filter((target) => target.problem)
              .map((target) => (
                <li key={target.markerId}>
                  {t('admin.droneLogs.lidTest.marker', { id: target.markerId })}: {target.problem}
                </li>
              ))}
          </ul>
        )}

        {enabled && (
          <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
            {t('admin.droneLogs.lidTest.warning')}
          </p>
        )}
      </CardContent>
      <ConfirmActionDialog
        open={confirmOn}
        onOpenChange={setConfirmOn}
        title={t('admin.droneLogs.lidTest.confirmTitle')}
        description={
          <>
            <p>{t('admin.droneLogs.lidTest.description', { seconds: status?.holdSeconds ?? 5 })}</p>
            <p className="font-medium text-amber-700 dark:text-amber-300">{t('admin.droneLogs.lidTest.warning')}</p>
          </>
        }
        actionLabel={t('admin.droneLogs.lidTest.confirmAction')}
        loading={saving}
        onConfirm={() => void toggle(true).finally(() => setConfirmOn(false))}
      />
    </Card>
  );
}
