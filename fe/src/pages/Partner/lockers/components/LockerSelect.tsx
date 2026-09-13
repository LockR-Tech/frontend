import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { PartnerLocker } from "@/types/partner.type";

interface LockerSelectProps {
  lockers: PartnerLocker[];
  selectedLockerId?: string;
  onChange: (lockerId: string) => void;
}

export function LockerSelect({ lockers, selectedLockerId, onChange }: LockerSelectProps) {
  return (
    <div className="space-y-2">
      <Label className="text-[#7BAAD1] font-medium">Chọn Locker</Label>
      <Select value={selectedLockerId} onValueChange={onChange}>
        <SelectTrigger className="border-[#B0C8DA] bg-white">
          <SelectValue placeholder="Chọn locker" />
        </SelectTrigger>
        <SelectContent className="bg-white border-[#E8E9EB]">
          {lockers.map((locker) => (
            <SelectItem
              key={locker.id}
              value={locker.id.toString()}
              className="hover:bg-[#FAFCFF] focus:bg-[#FAFCFF]"
            >
              {locker.name} - {locker.location}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
