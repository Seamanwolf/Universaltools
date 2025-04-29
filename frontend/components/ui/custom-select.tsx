import * as React from "react";
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./select";
import { cn } from "@/lib/utils";

export interface CustomSelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  options: { value: string; label: string }[];
}

export function CustomSelect({
  value,
  defaultValue,
  onValueChange,
  className,
  options,
}: CustomSelectProps) {
  return (
    <SelectRoot value={value} defaultValue={defaultValue} onValueChange={onValueChange}>
      <div className={cn("relative", className)}>
        <SelectTrigger>
          <SelectValue placeholder="Выберите значение" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </div>
    </SelectRoot>
  );
} 