import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Plus, Trash2, Package } from "lucide-react";
import { OrderType, OrderStatus } from "~/types/admin/enums";
import { toast } from "sonner";

interface OrderItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (orderData: {
    customerName: string;
    customerPhone: string;
    type: OrderType;
    items: OrderItem[];
    notes: string;
  }) => void;
}

export function CreateOrderModal({
  isOpen,
  onClose,
  onCreate,
}: CreateOrderModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderType, setOrderType] = useState<OrderType>(OrderType.LAUNDRY);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderItem[]>([
    { id: "1", name: "", qty: 1, price: 0 },
  ]);

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), name: "", qty: 1, price: 0 },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof OrderItem, value: string | number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.qty * item.price, 0);
  };

  const handleSubmit = () => {
    if (!customerName.trim()) {
      toast.error("Vui lòng nhập tên khách hàng");
      return;
    }
    if (items.some((item) => !item.name.trim())) {
      toast.error("Vui lòng nhập tên sản phẩm cho tất cả các mục");
      return;
    }

    onCreate({
      customerName,
      customerPhone,
      type: orderType,
      items,
      notes,
    });

    // Reset form
    setCustomerName("");
    setCustomerPhone("");
    setOrderType(OrderType.LAUNDRY);
    setNotes("");
    setItems([{ id: "1", name: "", qty: 1, price: 0 }]);
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Tạo đơn hàng mới
          </DialogTitle>
          <DialogDescription>
            Tạo đơn hàng mới cho khách hàng. Đơn hàng sẽ ở trạng thái khởi tạo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Info */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase">
              Thông tin khách hàng
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Họ tên *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Số điện thoại</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="0901234567"
                />
              </div>
            </div>
          </div>

          {/* Order Type */}
          <div className="space-y-2">
            <Label htmlFor="orderType">Loại đơn hàng</Label>
            <Select
              value={orderType}
              onValueChange={(value) => setOrderType(value as OrderType)}
            >
              <SelectTrigger id="orderType">
                <SelectValue placeholder="Chọn loại đơn hàng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OrderType.LAUNDRY}>Giặt ủi</SelectItem>
                <SelectItem value={OrderType.DRY_CLEAN}>Giặt khô</SelectItem>
                <SelectItem value={OrderType.STORAGE}>Gửi đồ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-muted-foreground uppercase">
                Sản phẩm
              </h4>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-1 h-4 w-4" />
                Thêm sản phẩm
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <Input
                      placeholder="Tên sản phẩm"
                      value={item.name}
                      onChange={(e) =>
                        updateItem(item.id, "name", e.target.value)
                      }
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      min="1"
                      placeholder="SL"
                      value={item.qty}
                      onChange={(e) =>
                        updateItem(item.id, "qty", parseInt(e.target.value) || 1)
                      }
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      min="0"
                      placeholder="Đơn giá"
                      value={item.price}
                      onChange={(e) =>
                        updateItem(item.id, "price", parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
              <span className="font-medium">Tổng cộng:</span>
              <span className="text-xl font-bold text-blue-600">
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(calculateTotal())}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú đặc biệt cho đơn hàng..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Hủy
          </Button>
          <Button onClick={handleSubmit}>Tạo đơn hàng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
