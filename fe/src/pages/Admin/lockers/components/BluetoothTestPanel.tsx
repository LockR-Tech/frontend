import { useMemo, useState } from "react";
import { Bluetooth, Check, ChevronsUpDown, Loader2, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { ConfirmActionDialog } from "~/pages/Admin/knowledge/ConfirmActionDialog";
import { formatDateTime } from "~/lib/datetime";
import { extractList } from "~/lib/extract-list";
import { useGetAllUsersQuery } from "~/stores/apis/admin/users";
import {
  useGetBleTestGrantsQuery,
  useGrantBleTestMutation,
  useRevokeBleTestMutation,
} from "~/stores/apis/admin/lockerOps";
import type { AdminUserResponse } from "~/types/admin/user";

const CUSTOMER_USERS_QUERY = { page: 0, size: 1000, role: "CUSTOMER" };

function apiError(err: unknown, fallback: string): string {
  const e = err as { data?: { message?: string }; message?: string } | undefined;
  return e?.data?.message || e?.message || fallback;
}

/** Bỏ dấu tiếng Việt để gõ "nguyen" vẫn tìm ra "Nguyễn". */
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

const matchUser = (value: string, search: string, keywords?: string[]) => {
  const q = fold(search.trim());
  if (!q) return 1;
  return fold((keywords?.length ? keywords : [value]).join(" ")).includes(q) ? 1 : 0;
};

const userLabel = (u: AdminUserResponse) => u.name || u.email || u.phoneNumber || `#${u.id}`;

interface BluetoothTestPanelProps {
  lockerId: number;
}

/**
 * Thử mở ô qua Bluetooth (F3-G11): admin chọn tài khoản khách được thử trên tủ này. Tài khoản được
 * cấp thấy nút "Bluetooth" ở trang Hồ sơ của app, chọn ô bất kỳ rồi mở thẳng qua BLE với Pi của tủ.
 */
export function BluetoothTestPanel({ lockerId }: BluetoothTestPanelProps) {
  const { t } = useTranslation();
  const { data: grantsData, isLoading } = useGetBleTestGrantsQuery(lockerId);
  const { data: usersData, isLoading: usersLoading } = useGetAllUsersQuery(CUSTOMER_USERS_QUERY);
  const [grantBleTest, { isLoading: granting }] = useGrantBleTestMutation();
  const [revokeBleTest, { isLoading: revoking }] = useRevokeBleTestMutation();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<{ userId: number; label: string } | null>(null);

  const grants = useMemo(() => grantsData?.data ?? [], [grantsData]);
  const customers = useMemo(() => extractList<AdminUserResponse>(usersData?.data), [usersData]);
  const usersById = useMemo(() => new Map(customers.map((u) => [u.id, u])), [customers]);
  const grantedIds = useMemo(() => new Set(grants.map((g) => g.userId)), [grants]);

  const handleGrant = async (user: AdminUserResponse) => {
    setPickerOpen(false);
    try {
      await grantBleTest({ lockerId, userId: user.id }).unwrap();
      toast.success(t("admin.lockers.bluetoothTest.toast.granted"), { description: userLabel(user) });
    } catch (err) {
      toast.error(t("admin.lockers.bluetoothTest.toast.grantFailed"), {
        description: apiError(err, t("common.pleaseRetry")),
      });
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await revokeBleTest({ lockerId, userId: revokeTarget.userId }).unwrap();
      toast.success(t("admin.lockers.bluetoothTest.toast.revoked"), { description: revokeTarget.label });
      setRevokeTarget(null);
    } catch (err) {
      toast.error(t("admin.lockers.bluetoothTest.toast.revokeFailed"), {
        description: apiError(err, t("common.pleaseRetry")),
      });
    }
  };

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Bluetooth className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t("admin.lockers.bluetoothTest.title")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("admin.lockers.bluetoothTest.description")}</p>
            </div>
          </div>

          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" className="h-9" role="combobox" aria-expanded={pickerOpen} disabled={granting}>
                {granting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1.5" />}
                {t("admin.lockers.bluetoothTest.add")}
                <ChevronsUpDown className="w-3.5 h-3.5 ml-1.5 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <Command filter={matchUser}>
                <CommandInput placeholder={t("admin.lockers.bluetoothTest.searchPlaceholder")} />
                <CommandList className="max-h-72">
                  <CommandEmpty>
                    {usersLoading ? t("common.loadingEllipsis") : t("admin.lockers.bluetoothTest.searchEmpty")}
                  </CommandEmpty>
                  <CommandGroup>
                    {customers.map((u) => {
                      const granted = grantedIds.has(u.id);
                      return (
                        <CommandItem
                          key={u.id}
                          value={String(u.id)}
                          keywords={[u.name ?? "", u.email ?? "", u.phoneNumber ?? ""]}
                          disabled={granted}
                          onSelect={() => handleGrant(u)}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm">{userLabel(u)}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {[u.email, u.phoneNumber].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <Check size={14} className={cn("ml-auto shrink-0", granted ? "opacity-100" : "opacity-0")} />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {isLoading ? (
          <p className="text-xs text-muted-foreground">{t("common.loadingEllipsis")}</p>
        ) : grants.length === 0 ? (
          <p className="text-xs text-muted-foreground rounded-md border border-dashed border-border px-3 py-2">
            {t("admin.lockers.bluetoothTest.empty")}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {grants.map((g) => {
              const user = usersById.get(g.userId);
              const label = user ? userLabel(user) : t("admin.lockers.bluetoothTest.unknownUser", { id: g.userId });
              return (
                <li key={g.userId} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{label}</p>
                      <Badge variant="outline" className="text-[10px] font-mono">#{g.userId}</Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {[user?.email, user?.phoneNumber, t("admin.lockers.bluetoothTest.grantedAt", { time: formatDateTime(g.createdAt) })]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                    onClick={() => setRevokeTarget({ userId: g.userId, label })}
                  >
                    <UserMinus className="w-4 h-4 mr-1.5" /> {t("admin.lockers.bluetoothTest.revoke")}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <ConfirmActionDialog
        open={revokeTarget != null}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        title={t("admin.lockers.bluetoothTest.confirmRevokeTitle")}
        description={t("admin.lockers.bluetoothTest.confirmRevokeDescription", { name: revokeTarget?.label ?? "" })}
        actionLabel={t("admin.lockers.bluetoothTest.revoke")}
        destructive
        loading={revoking}
        onConfirm={handleRevoke}
      />
    </Card>
  );
}
