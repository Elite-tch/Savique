import { cn } from "./button";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
    return (
        <div className={cn("rounded-2xl glass p-6", className)}>
            {children}
        </div>
    );
}

export function CardHeader({ title, description }: { title: string; description?: string }) {
    return (
        <div className="mb-4">
            <h3 className="text-xl font-semibold text-white">{title}</h3>
            {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
        </div>
    );
}
