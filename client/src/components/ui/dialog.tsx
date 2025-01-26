import React, { useEffect, useRef } from "react";

interface DialogProps {
  dialogTrigger: React.ReactNode;
  dialogContent: React.ReactNode;
  isLoading?: boolean;
}

export default function Dialog({
  dialogTrigger,
  dialogContent,
  isLoading = false,
}: DialogProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading) {
        setIsDialogOpen(false);
      }
    };

    if (isDialogOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "visible";
    };
  }, [isDialogOpen, isLoading]);

  useEffect(() => {
    if (isDialogOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isDialogOpen]);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !isLoading) {
      setIsDialogOpen(false);
    }
  };

  return (
    <>
      <div onClick={() => setIsDialogOpen(true)}>{dialogTrigger}</div>

      {isDialogOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/70 transition-opacity duration-200"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            className="fixed left-1/2 top-1/2 z-50 w-full min-w-[300px] max-w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-slate-800 p-6 shadow-xl transition-all duration-200 focus:outline-none sm:max-w-lg"
          >
            {dialogContent}
            {!isLoading && (
              <button
                onClick={() => setIsDialogOpen(false)}
                className="absolute right-4 top-4 text-gray-400 hover:text-white focus:outline-none"
                aria-label="Close dialog"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}
