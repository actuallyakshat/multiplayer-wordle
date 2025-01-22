import React from "react";

export default function Dialog({
  dialogTrigger,
  dialogContent,
  isLoading,
}: {
  dialogTrigger: React.ReactNode;
  dialogContent: React.ReactNode;
  isLoading?: boolean;
}) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  return (
    <>
      <div onClick={() => setIsDialogOpen(true)}>{dialogTrigger}</div>

      <div
        className={`fixed inset-0 z-40 bg-black/70 transition-opacity duration-200 ${
          isDialogOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => {
          if (isLoading) return;
          setIsDialogOpen(false);
        }}
      />

      <div
        className={`fixed left-1/2 top-1/2 z-50 w-full min-w-[300px] max-w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-slate-800 p-6 shadow-xl transition-all duration-200 sm:max-w-lg ${
          isDialogOpen
            ? "scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        {dialogContent}
      </div>
    </>
  );
}
