import { useState, type KeyboardEvent } from "react";
import { Check, X } from "lucide-react";
import { cn } from "~/lib/utils";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { SettingView } from "~/stores/apis/admin/businessSettings";
import {
  EMPTY_SELECT_VALUE,
  allowedValuesOf,
  formatSettingValue,
  normalizeValue,
  splitList,
  validateListItem,
} from "./setting-utils";

interface SettingInputProps {
  id: string;
  setting: SettingView;
  value: string;
  invalid: boolean;
  disabled?: boolean;
  onChange: (raw: string) => void;
}

const invalidClass = "border-destructive focus-visible:ring-destructive";

/** Ô nhập theo `type` của quy tắc; `allowedValues` không rỗng -> chọn từ danh sách. */
export function SettingInput({ id, setting, value, invalid, disabled, onChange }: SettingInputProps) {
  const allowed = allowedValuesOf(setting);

  if (setting.type === "BOOLEAN") {
    const checked = value.trim().toLowerCase() === "true";
    return (
      <div className="flex h-10 items-center gap-3">
        <Switch
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(next) => onChange(next ? "true" : "false")}
        />
        <span className={cn("text-sm", checked ? "font-medium text-foreground" : "text-muted-foreground")}>
          {checked ? "Đang bật" : "Đang tắt"}
        </span>
      </div>
    );
  }

  if (setting.type === "INTEGER_LIST") {
    return allowed.length > 0 ? (
      <AllowedListPicker id={id} setting={setting} value={value} allowed={allowed} disabled={disabled} onChange={onChange} />
    ) : (
      <IntegerListEditor id={id} setting={setting} value={value} invalid={invalid} disabled={disabled} onChange={onChange} />
    );
  }

  if (allowed.length > 0) {
    return (
      <AllowedSelect id={id} setting={setting} value={value} allowed={allowed} invalid={invalid} disabled={disabled} onChange={onChange} />
    );
  }

  const numeric = setting.type === "INTEGER" || setting.type === "DECIMAL";
  return (
    <div className="flex">
      <Input
        id={id}
        value={value}
        disabled={disabled}
        inputMode={setting.type === "INTEGER" ? "numeric" : setting.type === "DECIMAL" ? "decimal" : "text"}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={invalid}
        placeholder={setting.type === "STRING" ? "(để trống)" : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          numeric && "tabular-nums",
          setting.unit && "rounded-r-none",
          invalid && invalidClass,
        )}
      />
      {setting.unit && (
        <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-r-md border border-l-0 border-input bg-muted px-3 text-xs font-medium text-muted-foreground">
          {setting.unit}
        </span>
      )}
    </div>
  );
}

function AllowedSelect({
  id,
  setting,
  value,
  allowed,
  invalid,
  disabled,
  onChange,
}: {
  id: string;
  setting: SettingView;
  value: string;
  allowed: string[];
  invalid: boolean;
  disabled?: boolean;
  onChange: (raw: string) => void;
}) {
  // Radix Select không nhận value rỗng -> dùng giá trị thay thế.
  const toOption = (v: string) => (v === "" ? EMPTY_SELECT_VALUE : v);
  const normalized = normalizeValue(setting, value);
  const selected = allowed.find((a) => normalizeValue(setting, a) === normalized);

  return (
    <Select
      value={selected !== undefined ? toOption(selected) : undefined}
      disabled={disabled}
      onValueChange={(v) => onChange(v === EMPTY_SELECT_VALUE ? "" : v)}
    >
      <SelectTrigger id={id} aria-invalid={invalid} className={cn(invalid && invalidClass)}>
        <SelectValue placeholder={value ? `${value} (không hợp lệ)` : "Chọn giá trị"} />
      </SelectTrigger>
      <SelectContent>
        {allowed.map((option) => (
          <SelectItem key={toOption(option)} value={toOption(option)}>
            {formatSettingValue(setting, option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function AllowedListPicker({
  id,
  setting,
  value,
  allowed,
  disabled,
  onChange,
}: {
  id: string;
  setting: SettingView;
  value: string;
  allowed: string[];
  disabled?: boolean;
  onChange: (raw: string) => void;
}) {
  const selected = new Set(splitList(value).map((item) => normalizeValue(setting, item)));

  const toggle = (option: string) => {
    const key = normalizeValue(setting, option);
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    // Giữ thứ tự theo danh sách cho phép.
    onChange(
      allowed
        .map((a) => normalizeValue(setting, a))
        .filter((a) => next.has(a))
        .join(","),
    );
  };

  return (
    <div id={id} role="group" className="flex flex-wrap gap-1.5">
      {allowed.map((option) => {
        const active = selected.has(normalizeValue(setting, option));
        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => toggle(option)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium tabular-nums transition-colors disabled:opacity-50",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {active && <Check className="h-3 w-3" />}
            {formatSettingValue(setting, option)}
          </button>
        );
      })}
    </div>
  );
}

function IntegerListEditor({
  id,
  setting,
  value,
  invalid,
  disabled,
  onChange,
}: {
  id: string;
  setting: SettingView;
  value: string;
  invalid: boolean;
  disabled?: boolean;
  onChange: (raw: string) => void;
}) {
  const [text, setText] = useState("");
  const items = splitList(value);

  const commit = (input: string) => {
    const parts = splitList(input);
    setText("");
    if (parts.length > 0) onChange([...items, ...parts].join(","));
  };

  const removeAt = (index: number) => {
    onChange(items.filter((_, i) => i !== index).join(","));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit(text);
    } else if (e.key === "Backspace" && text === "" && items.length > 0) {
      e.preventDefault();
      removeAt(items.length - 1);
    }
  };

  return (
    <div
      className={cn(
        "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background",
        invalid && "border-destructive focus-within:ring-destructive",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {items.map((item, index) => {
        const itemError = validateListItem(setting, item);
        return (
          <span
            key={`${item}-${index}`}
            title={itemError ?? undefined}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium tabular-nums",
              itemError ? "bg-destructive/10 text-destructive" : "bg-secondary text-secondary-foreground",
            )}
          >
            {item}
            {setting.unit && <span className="font-normal opacity-70">{setting.unit}</span>}
            <button
              type="button"
              disabled={disabled}
              onClick={() => removeAt(index)}
              className="-mr-0.5 rounded-sm p-0.5 opacity-60 hover:bg-background/60 hover:opacity-100"
              aria-label={`Xoá ${item}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}
      <input
        id={id}
        value={text}
        disabled={disabled}
        inputMode="numeric"
        autoComplete="off"
        aria-invalid={invalid}
        placeholder={items.length > 0 ? "Thêm…" : "Nhập số rồi Enter"}
        onChange={(e) => {
          const next = e.target.value;
          if (/[,;\s]/.test(next)) commit(next);
          else setText(next);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(text)}
        className="h-7 min-w-[6rem] flex-1 bg-transparent px-1 text-sm tabular-nums outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
    </div>
  );
}
