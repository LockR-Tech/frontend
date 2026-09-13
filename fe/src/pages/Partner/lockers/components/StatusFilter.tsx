import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface StatusFilterProps {
  value: string;
  onChange: (value: string) => void;
}

const statusOptions = [
  { value: "ALL", label: "Tất cả" },
  { value: "AVAILABLE", label: "Trống" },
  { value: "OCCUPIED", label: "Đang dùng" },
  { value: "RESERVED", label: "Đã đặt" },
  { value: "ERROR", label: "Lỗi" },
];

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div className="space-y-2">
      <Label className="text-[#7BAAD1] font-medium">Lọc trạng thái</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="border-[#B0C8DA] bg-white">
          <SelectValue placeholder="Tất cả" />
        </SelectTrigger>
        <SelectContent className="bg-white border-[#E8E9EB]">
          {statusOptions.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="hover:bg-[#FAFCFF] focus:bg-[#FAFCFF]"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
