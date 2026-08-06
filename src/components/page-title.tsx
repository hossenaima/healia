/** The one h1 on a page. Kept as a component so the entrance and the type
 *  scale stay identical across tabs rather than drifting per page. */
export function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="settle font-cond text-[2rem] font-bold leading-none tracking-tight">
      {children}
    </h1>
  );
}
