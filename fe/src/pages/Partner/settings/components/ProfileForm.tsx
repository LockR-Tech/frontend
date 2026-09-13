import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from "~/components/ui";

interface PartnerProfile {
  businessName: string;
  contactPhone: string;
  businessAddress: string;
}

interface ProfileFormProps {
  profile: PartnerProfile;
  onSubmit: (data: { businessName: string; phone: string; address: string }) => void;
  isLoading: boolean;
  successMessage: string | null;
}

export function ProfileForm({ profile, onSubmit, isLoading, successMessage }: ProfileFormProps) {
  const [formData, setFormData] = useState({
    businessName: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        businessName: profile.businessName || "",
        phone: profile.contactPhone || "",
        address: profile.businessAddress || "",
      });
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thông tin cửa hàng</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Tên cửa hàng</Label>
            <Input
              id="businessName"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Số điện thoại</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Địa chỉ</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          {successMessage && (
            <div className="bg-green-50 text-green-700 p-3 rounded-lg">{successMessage}</div>
          )}

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
