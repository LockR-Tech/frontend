import { Card, CardContent, Badge } from "~/components/ui";
import { Button } from "~/components/ui/button";
import { User, Trash2, Mail, Phone, Calendar } from "lucide-react";
import type { StaffContact } from "@/types/partner.type";

interface StaffListProps {
  staff: StaffContact[];
  isDeleting?: boolean;
  onDelete?: (staff: StaffContact) => void;
}

export function StaffList({ staff, isDeleting, onDelete }: StaffListProps) {
  if (staff.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <User className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground font-medium">Chưa có nhân viên nào</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Nhấn "Thêm nhân viên" để bắt đầu xây dựng đội ngũ
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {staff.map((member) => (
        <Card key={member.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            {/* Avatar + Name */}
            <div className="flex items-center gap-4 mb-4">
              {member.imageUrl ? (
                <img
                  src={member.imageUrl}
                  alt={member.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="text-blue-600" size={24} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {member.name}
                </h3>
                <p className="text-sm text-muted-foreground">ID: {member.id}</p>
              </div>
            </div>

            {/* Info */}
            <div className="space-y-2 mb-4">
              {member.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail size={14} className="shrink-0 text-muted-foreground/70" />
                  <span className="truncate">{member.email}</span>
                </div>
              )}
              {member.phoneNumber && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone size={14} className="shrink-0 text-muted-foreground/70" />
                  <span>{member.phoneNumber}</span>
                </div>
              )}
              {member.joinDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar size={14} className="shrink-0 text-muted-foreground/70" />
                  <span>Tham gia: {formatDate(member.joinDate)}</span>
                </div>
              )}
            </div>

            {/* Roles + Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex flex-wrap gap-1">
                {member.roles && member.roles.length > 0 ? (
                  member.roles.map((role) => (
                    <Badge key={role} variant="secondary" className="text-xs">
                      {role}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    STAFF
                  </Badge>
                )}
              </div>
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onDelete(member)}
                  disabled={isDeleting}
                  title="Xóa khỏi đội"
                >
                  <Trash2 size={15} />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
