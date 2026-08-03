"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";

const INITIAL: FormState = {};

export function PinForm({
  action,
  mode,
  next,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  mode: "login" | "setup";
  next?: string;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const isSetup = mode === "setup";

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {next && <input type="hidden" name="next" value={next} />}

      <Field
        id="pin"
        name="pin"
        label={isSetup ? "Choose a PIN" : "PIN"}
        autoFocus
        autoComplete={isSetup ? "new-password" : "current-password"}
      />

      {isSetup && (
        <Field
          id="confirm"
          name="confirm"
          label="Confirm PIN"
          autoComplete="new-password"
        />
      )}

      <button
        type="submit"
        disabled={pending}
        className="
          w-full rounded-lg bg-ink px-4 py-3 font-cond text-sm font-semibold
          uppercase tracking-widest text-ground transition-opacity
          hover:opacity-90 disabled:opacity-40
        "
      >
        {pending ? "Working" : isSetup ? "Create PIN" : "Unlock"}
      </button>

      {state.error && (
        <p role="alert" className="text-sm text-up">
          {state.error}
        </p>
      )}
    </form>
  );
}

function Field({
  id,
  name,
  label,
  autoFocus,
  autoComplete,
}: {
  id: string;
  name: string;
  label: string;
  autoFocus?: boolean;
  autoComplete: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="password"
        inputMode="numeric"
        pattern="\d*"
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        className="
          tnum mt-2 w-full border-b-2 border-rule bg-transparent pb-1 text-3xl
          tracking-[0.3em] focus:border-trace focus:outline-none
        "
      />
    </div>
  );
}
