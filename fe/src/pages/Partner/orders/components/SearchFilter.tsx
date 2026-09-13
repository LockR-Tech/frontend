import { Search, Filter } from "lucide-react";
import { Button, Input } from "~/components/ui";

interface SearchFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function SearchFilter({ searchQuery, onSearchChange }: SearchFilterProps) {
  return (
    <div className="flex gap-4 mb-6">
      <div className="flex-1 relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/70"
          size={20}
        />
        <Input
          placeholder="Tìm kiếm theo mã đơn, khách hàng, số điện thoại..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <Button variant="outline" className="flex items-center gap-2">
        <Filter size={18} />
        Bộ lọc
      </Button>
    </div>
  );
}
