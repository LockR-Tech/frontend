import { cn } from "~/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface StatusOption {
  value: string;
  label: string;
  color?: "blue" | "green" | "yellow" | "red" | "gray" | "purple";
  count?: number;
}

interface StatusDropdownProps {
  options: StatusOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const colorDotStyles: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
  gray: "bg-gray-500",
  purple: "bg-violet-500",
};

export function StatusDropdown({
  options,
  value,
  onChange,
  placeholder = "Trạng thái",
  className,
}: StatusDropdownProps) {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "w-[180px] h-10 bg-background border-input",
          className
        )}
      >
        <div className="flex items-center gap-2">
          {selectedOption?.color && (
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                colorDotStyles[selectedOption.color]
              )}
            />
          )}
          <SelectValue placeholder={placeholder} />
          {selectedOption?.count !== undefined && selectedOption.count > 0 && (
            <span className="ml-1 text-xs text-muted-foreground">
              ({selectedOption.count})
            </span>
          )}
        </div>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {option.color && (
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    colorDotStyles[option.color]
                  )}
                />
              )}
              <span>{option.label}</span>
              {option.count !== undefined && option.count > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {option.count}
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
