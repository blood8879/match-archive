"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root> {
  label?: string
  error?: string
  isError?: boolean
  icon?: React.ReactNode
  placeholder?: string
  className?: string
  children?: React.ReactNode
  fullWidth?: boolean
}

const Select = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectProps
>(({ 
  label, 
  error, 
  isError, 
  icon, 
  placeholder, 
  className, 
  children,
  fullWidth,
  ...props 
}, ref) => {
  const inputId = label?.toLowerCase().replace(/\s+/g, "-")
  const hasError = !!error || isError
  const isFullWidth = fullWidth ?? !!label

  return (
    <div className={cn(isFullWidth && "w-full", label && "space-y-2")}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium leading-none text-[var(--text-400)] peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </label>
      )}
      <SelectPrimitive.Root {...props}>
        <SelectPrimitive.Trigger
          ref={ref}
          id={inputId}
          className={cn(
            "flex h-10 items-center justify-between gap-2 rounded-lg border border-[var(--border-dark)] bg-[var(--surface-dark)] px-3 py-2 text-sm text-white ring-offset-[var(--background)] placeholder:text-[var(--text-400)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-[var(--text-400)] hover:bg-[var(--surface-dark-hover)] transition-colors duration-200",
            isFullWidth && "w-full h-12 px-4 py-3",
            hasError && "border-[var(--color-error)] focus:ring-[var(--color-error)]",
            className
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {icon && <span className="text-[var(--text-400)]">{icon}</span>}
            <SelectPrimitive.Value placeholder={placeholder} />
          </span>
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="h-4 w-4 opacity-50 transition-transform duration-200 ease-in-out group-data-[state=open]:rotate-180 text-[var(--text-400)]" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[rgba(22,46,35,0.95)] text-[var(--text-100)] shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 backdrop-blur-md"
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.Viewport
              className={cn(
                "p-1",
                "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
              )}
            >
              {children}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {error && (
        <p className="text-sm font-medium text-[var(--color-error)]">
          {error}
        </p>
      )}
    </div>
  )
})
Select.displayName = SelectPrimitive.Root.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2.5 pl-8 pr-2 text-sm outline-none focus:bg-[var(--surface-700)] focus:text-[var(--text-100)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors duration-150",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-[var(--primary)]" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold text-[var(--text-400)]", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-[var(--border-dark)]", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  type SelectProps
}
