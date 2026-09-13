import { useState } from "react";
import { UserPlus, Loader2, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import { Badge } from "~/components/ui/badge";
import { useCreateUserMutation } from "~/stores/apis/admin";

// Role model chuẩn (khớp JwtGatewayFilter.hasRequiredRole): MANAGER/STAFF đã khai tử.
const ALL_ROLES = ["CUSTOMER", "ADMIN", "MAINTENANCE", "TECHNICIAN"] as const;

const ROLE_STYLES: Record<string, string> = {
  ADMIN:
    "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30",
  MANAGER:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  CUSTOMER: "bg-muted/30 text-foreground/80 border-border/50",
  MAINTENANCE:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30",
  TECHNICIAN:
    "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30",
};

interface Props {
  open: boolean;
  onClose: () => void;
}

const EMPTY_FORM = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  phoneNumber: "",
  roles: ["CUSTOMER"] as string[],
  enabled: true,
};

export function CreateUserModal({ open, onClose }: Props) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createUser, { isLoading }] = useCreateUserMutation();

  const set = (field: string, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const toggleRole = (role: string) => {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role)
        ? f.roles.filter((r) => r !== role)
        : [...f.roles, role],
    }));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!form.email || !form.firstName) {
      setError("Email và Tên là bắt buộc.");
      return;
    }
    // Omit empty optional fields so the backend stores NULL instead of "".
    // (email & phone_number are UNIQUE; empty strings collide, NULLs don't.)
    const payload = {
      email: form.email.trim(),
      password: form.password,
      firstName: form.firstName.trim(),
      roles: form.roles,
      enabled: form.enabled,
      ...(form.lastName.trim() ? { lastName: form.lastName.trim() } : {}),
      ...(form.phoneNumber.trim()
        ? { phoneNumber: form.phoneNumber.trim() }
        : {}),
    };
    try {
      await createUser(payload).unwrap();
      setForm({ ...EMPTY_FORM });
      onClose();
    } catch (e: unknown) {
      const err = e as { status?: number; data?: { message?: string } };
      const msg = err?.data?.message ?? "";
      if (err?.status === 409 || /unique|integrity|constraint|exist|tồn tại/i.test(msg)) {
        setError(
          "Email hoặc số điện thoại đã tồn tại. Vui lòng dùng giá trị khác.",
        );
      } else {
        setError(msg || "Tạo người dùng thất bại.");
      }
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setForm({ ...EMPTY_FORM });
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <UserPlus size={18} className="text-blue-600" />
            Thêm người dùng mới
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Tên <span className="text-red-400">*</span>
              </label>
              <Input
                placeholder="Tên"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Họ
              </label>
              <Input
                placeholder="Họ"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Email <span className="text-red-400">*</span>
            </label>
            <Input
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Mật khẩu
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Tối thiểu 6 ký tự"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Số điện thoại
            </label>
            <Input
              placeholder="0901234567"
              value={form.phoneNumber}
              onChange={(e) => set("phoneNumber", e.target.value)}
            />
          </div>

          {/* Roles */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Vai trò
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map((role) => {
                const selected = form.roles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={`transition-all rounded-md border px-2 py-1 text-xs font-medium ${
                      selected
                        ? (ROLE_STYLES[role] ?? "bg-muted/50 text-foreground/80")
                        : "bg-background text-muted-foreground border-border hover:border-foreground/40"
                    }`}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Enabled */}
          <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm font-medium text-foreground/80">
                Kích hoạt tài khoản
              </p>
              <p className="text-xs text-muted-foreground/70">
                Tài khoản sẽ đăng nhập được ngay
              </p>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => set("enabled", v)}
              className="data-[state=checked]:bg-green-500"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 size={15} className="animate-spin mr-2" />
                Đang tạo...
              </>
            ) : (
              <>
                <UserPlus size={15} className="mr-2" />
                Tạo người dùng
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
