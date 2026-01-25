"use client";

import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion, type HTMLMotionProps } from "framer-motion";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ButtonProps extends HTMLMotionProps<"button"> {
    variant?: "primary" | "secondary" | "ghost" | "outline" | "destructive";
    size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
        const variants = {
            primary: "bg-primary text-white hover:opacity-90 shadow-[0_0_20px_rgba(230,32,88,0.3)]",
            secondary: "bg-secondary text-white border border-border hover:bg-accent",
            ghost: "bg-transparent hover:bg-white/5 text-gray-300 hover:text-white",
            outline: "border border-primary/50 text-primary hover:bg-primary/10",
            destructive: "bg-red-600 text-white hover:bg-red-700 shadow-md",
        };

        const sizes = {
            sm: "px-3 py-1.5 text-sm",
            md: "px-5 py-2.5 text-base",
            lg: "px-8 py-3 text-lg font-medium",
            icon: "h-10 w-10 p-2",
        };

        return (
            <motion.button
                ref={ref}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                    "inline-flex items-center justify-center rounded-xl transition-colors disabled:opacity-50 disabled:pointer-events-none",
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            >
                {children}
            </motion.button>
        );
    }
);
Button.displayName = "Button";
