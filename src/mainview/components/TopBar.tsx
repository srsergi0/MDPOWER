import ThemeMenu from "./ThemeMenu";

export default function TopBar() {
  const bg = "bg-[var(--bg-header)]";
  const border = "border-b border-[var(--border-main)]";
  const textColor = "text-[var(--text-main)]";

  return (
    <div
      className={`relative flex items-center justify-end h-[38px] ${bg} ${border} ${textColor} select-none`}
    >
      <div className="flex items-center h-full pr-1">
        <ThemeMenu />
      </div>
    </div>
  );
}
