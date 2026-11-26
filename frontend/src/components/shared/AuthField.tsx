import type { ComponentProps } from "react";
import type { LucideIcon } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthFieldProps = {
  autoComplete: string;
  error?: string;
  icon: LucideIcon;
  iconAction?: { label: string; onClick: () => void };
  id: string;
  label: string;
  placeholder: string;
  registration: UseFormRegisterReturn;
  type?: ComponentProps<typeof Input>["type"];
};

export function AuthField({
  autoComplete,
  error,
  icon: Icon,
  iconAction,
  id,
  label,
  placeholder,
  registration,
  type = "text",
}: AuthFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-[14px] font-bold text-navy" htmlFor={id}>{label}</Label>
      <div className="auth-field-control">
        {iconAction ? (
          <button
            aria-label={iconAction.label}
            className="auth-field-icon-button"
            onClick={iconAction.onClick}
            type="button"
          >
            <Icon aria-hidden="true" className="size-5" />
          </button>
        ) : (
          <span className="auth-field-leading-icon"><Icon aria-hidden="true" className="size-5" /></span>
        )}
        <img className="auth-field-divider" src="/assets/auth-field-divider.svg" alt="" />
        <Input
          {...registration}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          autoComplete={autoComplete}
          className="auth-field-input"
          id={id}
          placeholder={placeholder}
          type={type}
        />
      </div>
      {error && <p className="text-sm text-destructive" id={`${id}-error`} role="alert">{error}</p>}
    </div>
  );
}
