"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  idleLabel?: string;
  pendingLabel?: string;
  disabled?: boolean;
};

export function SubmitButton({
  idleLabel = "Submit Assessment",
  pendingLabel = "Submitting...",
  disabled = false,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button
      type="submit"
      className="btn btn-sm btn-secondary"
      disabled={isDisabled}
      aria-disabled={isDisabled}
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
