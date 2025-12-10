import clsx from "clsx";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export default function KazButton({ 
  variant = "primary", 
  size = "md", 
  className, 
  children, 
  ...props 
}: Props) {

  const base = "rounded-lg font-medium transition select-none";

  const variants = {
    primary: "bg-[#0052FF] text-white hover:bg-[#0040CC]",
    secondary: "bg-[#121A33] text-gray-200 hover:bg-[#0E1A3A] border border-[#2A3558]",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "bg-transparent text-gray-300 hover:bg-[#1A243F]"
  };

  const sizes = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-3 text-base"
  };

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
