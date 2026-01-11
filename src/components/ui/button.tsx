"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      asChild = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-xl transition-all touch-feedback focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 disabled:pointer-events-none";

    const variantStyles = {
      primary:
        "bg-primary-500 text-black font-bold hover:bg-primary-600 hover:scale-105 active:scale-95",
      secondary:
        "bg-surface-700 text-white border border-white/10 hover:bg-surface-800 active:scale-95",
      ghost: "text-text-400 hover:text-white hover:bg-surface-700",
      destructive:
        "bg-destructive text-white font-bold hover:opacity-90 active:scale-95",
    };

    const sizeStyles = {
      sm: "h-9 px-3 text-sm",
      md: "h-11 px-4 text-base",
      lg: "h-14 px-6 text-lg",
    };

    return (
      <Comp
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {isLoading && (
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {children}
          </>
        )}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button, type ButtonProps };
