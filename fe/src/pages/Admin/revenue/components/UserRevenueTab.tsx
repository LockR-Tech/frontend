import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Search, ArrowUpDown, Eye, ArrowRight, ArrowUpRight } from "lucide-react";

interface UserRevenueData {
  id: number;
  name: string;
  phone: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate: string;
  tier: "VIP" | "Thân thiết" | "Tiêu chuẩn";
}

const MOCK_USERS_REVENUE: UserRevenueData[] = [
  {
    id: 1,
    name: "Quốc Bảo Nguyễn",
    phone: "0912 345 678",
    email: "baonq@gmail.com",
    totalOrders: 38,
    totalSpent: 3390000,
    averageOrderValue: 89200,
    lastOrderDate: "13/09/2026 18:42:15",
    tier: "VIP",
  },
  {
    id: 2,
    name: "Hoàng Minh Trần",
    phone: "0988 765 432",
    email: "tranminh@gmail.com",
    totalOrders: 27,
    totalSpent: 2150000,
    averageOrderValue: 79600,
    lastOrderDate: "12/09/2026 14:15:22",
    tier: "VIP",
  },
  {
    id: 3,
    name: "Thị Lan Hương Lê",
    phone: "0903 112 233",
    email: "lanhuong@fpt.edu.vn",
    totalOrders: 19,
    totalSpent: 1680000,
    averageOrderValue: 88400,
    lastOrderDate: "11/09/2026 09:30:45",
    tier: "Thân thiết",
  },
  {
    id: 4,
    name: "Anh Tuấn Vũ",
    phone: "0934 556 789",
    email: "tuanva@gmail.com",
    totalOrders: 14,
    totalSpent: 1250000,
    averageOrderValue: 89200,
    lastOrderDate: "10/09/2026 19:20:18",
    tier: "Thân thiết",
  },
  {
    id: 5,
    name: "Ngọc Mai Đỗ",
    phone: "0977 889 900",
    email: "maind@gmail.com",
    totalOrders: 11,
    totalSpent: 980000,
    averageOrderValue: 89000,
    lastOrderDate: "09/09/2026 11:10:05",
    tier: "Tiêu chuẩn",
  },
  {
    id: 6,
    name: "Quang Khải Phạm",
    phone: "0918 223 344",
    email: "khaipq@fpt.edu.vn",
    totalOrders: 8,
    totalSpent: 720000,
    averageOrderValue: 90000,
    lastOrderDate: "08/09/2026 16:45:30",
    tier: "Tiêu chuẩn",
  },
  {
    id: 7,
    name: "Minh Trang Đinh",
    phone: "0909 334 455",
    email: "trangdm@gmail.com",
    totalOrders: 6,
    totalSpent: 540000,
    averageOrderValue: 90000,
    lastOrderDate: "07/09/2026 08:20:12",
    tier: "Tiêu chuẩn",
  },
];

function formatVND(val: number) {
  return val.toLocaleString("vi-VN") + " đ";
}

export function UserRevenueTab() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"totalSpent" | "totalOrders">("totalSpent");
  const [sortAsc, setSortAsc] = useState(false);

  const filteredUsers = useMemo(() => {
    let list = MOCK_USERS_REVENUE.filter(
      (u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.phone.includes(search) ||
        u.email.toLowerCase().includes(search.toLowerCase()),
    );

    list.sort((a, b) => {
      const mult = sortAsc ? 1 : -1;
      return (a[sortField] - b[sortField]) * mult;
    });

    return list;
  }, [search, sortField, sortAsc]);

  const toggleSort = (field: "totalSpent" | "totalOrders") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, SĐT, email..."
            className="pl-9 h-9 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5"
            onClick={() => toggleSort("totalSpent")}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            Sắp xếp theo chi tiêu
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5"
            onClick={() => toggleSort("totalOrders")}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            Sắp xếp theo số đơn
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/70 overflow-hidden bg-card shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/40 border-b border-border text-muted-foreground font-medium uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Khách hàng</th>
              <th className="py-3 px-4">Hạng</th>
              <th className="py-3 px-4 text-right">Tổng đơn</th>
              <th className="py-3 px-4 text-right">Tổng chi tiêu</th>
              <th className="py-3 px-4 text-right">Đơn TB (AOV)</th>
              <th className="py-3 px-4 text-right">Lần đặt gần nhất</th>
              <th className="py-3 px-4 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredUsers.map((user, idx) => (
              <tr
                key={user.id}
                onClick={() => navigate(`/admin/revenue/${user.id}`)}
                className="hover:bg-muted/50 cursor-pointer transition-colors group"
                title="Nhấp để xem trang chi tiết doanh thu khách hàng"
              >
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center font-bold text-foreground text-xs shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                        {user.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{user.phone} • {user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold px-2 py-0.5 ${
                      user.tier === "VIP"
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-400/30"
                        : user.tier === "Thân thiết"
                          ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-400/30"
                          : "bg-secondary text-muted-foreground border-border"
                    }`}
                  >
                    {user.tier}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 text-right font-medium text-foreground">
                  {user.totalOrders} đơn
                </td>
                <td className="py-3.5 px-4 text-right">
                  <p className="font-bold text-foreground text-sm leading-tight">{formatVND(user.totalSpent)}</p>
                  <div className="flex items-center justify-end gap-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    <ArrowUpRight className="w-3 h-3 shrink-0" />
                    <span>+{formatVND(Math.round(user.totalSpent * 0.133))}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <p className="text-muted-foreground font-medium leading-tight">{formatVND(user.averageOrderValue)}</p>
                  <div className="flex items-center justify-end gap-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                    <ArrowUpRight className="w-2.5 h-2.5 shrink-0" />
                    <span>+{formatVND(Math.round(user.averageOrderValue * 0.048))}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right text-muted-foreground font-mono">
                  {user.lastOrderDate}
                </td>
                <td className="py-3.5 px-4 text-center">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 border-border/80 text-foreground hover:bg-primary hover:text-primary-foreground group-hover:border-primary/40 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/revenue/${user.id}`);
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Chi tiết
                    <ArrowRight className="h-3 w-3 ml-0.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
