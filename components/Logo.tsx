interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "h-10 w-10 text-xs",
  md: "h-16 w-16 text-base",
  lg: "h-24 w-24 text-xl",
  xl: "h-36 w-36 text-2xl",
};

const textSizes = {
  sm: { vs: "text-sm tracking-tighter", sub: "text-[5px] tracking-widest mt-0.5" },
  md: { vs: "text-2xl tracking-tight font-extrabold", sub: "text-[8px] tracking-[0.2em] font-bold mt-0.5" },
  lg: { vs: "text-4xl tracking-tight font-extrabold", sub: "text-[11px] tracking-[0.25em] font-bold mt-1" },
  xl: { vs: "text-5xl tracking-tight font-extrabold", sub: "text-[14px] tracking-[0.3em] font-bold mt-1.5" },
};

export default function Logo({ size = "md", className = "" }: LogoProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`rounded-full bg-neutral-900 border border-neutral-800 text-white flex flex-col items-center justify-center font-sans shadow-lg relative overflow-hidden select-none ${sizeClasses[size]}`}
        style={{
          backgroundImage: "radial-gradient(circle, #2a2a2a 0%, #171717 100%)",
        }}
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />
        <span className={`font-black text-neutral-50 ${textSizes[size].vs} tracking-normal`}>VS</span>
        <span className={`text-neutral-400 font-medium uppercase leading-none ${textSizes[size].sub}`}>
          SNEAKERS
        </span>
      </div>
    </div>
  );
}
