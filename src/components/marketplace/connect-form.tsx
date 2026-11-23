"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiRequestError, startStripeOnboarding } from "@/lib/api-client";
import { isValidEmail } from "@/lib/listing-validation";

type ConnectFormProps = {
  /** Shown above the form, e.g. when a refreshed link couldn't be made. */
  notice?: string;
};

export function ConnectForm({ notice }: ConnectFormProps) {
  const baseId = useId();
  const emailId = `${baseId}-email`;
  const hintId = `${baseId}-hint`;
  const emailErrorId = `${baseId}-email-error`;
  const statusId = `${baseId}-status`;

  const emailRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [connected, setConnected] = useState(false);

  // Coming back from Stripe with the browser's back button can restore this page
  // exactly as it was left, with the button still busy.
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setWorking(false);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();

    const nextError = !value
      ? "Enter the email you use on your listings."
      : !isValidEmail(value)
        ? "Enter a valid email address."
        : null;

    setEmailError(nextError);
    setSubmitError(null);
    setConnected(false);

    if (nextError) {
      emailRef.current?.focus();
      return;
    }

    setWorking(true);
    try {
      const result = await startStripeOnboarding(value);
      if ("url" in result) {
        window.location.assign(result.url);
        // Stay busy while the browser leaves for Stripe.
        return;
      }
      setConnected(true);
    } catch (error) {
      showApiError(error);
    }
    setWorking(false);
  }

  function showApiError(error: unknown) {
    if (!(error instanceof ApiRequestError)) {
      setSubmitError("Couldn't reach Stripe. Please try again.");
      return;
    }

    if (error.fields?.seller_email) {
      setEmailError(error.fields.seller_email);
      emailRef.current?.focus();
      return;
    }

    setSubmitError(
      error.status === 503
        ? "Payments can't be set up right now because Stripe isn't configured yet."
        : error.message,
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-md flex-col gap-3">
      {notice && (
        <p role="status" className="text-sm text-destructive">
          {notice}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={emailId} className="text-sm font-medium">
          Your email
        </label>
        <Input
          ref={emailRef}
          id={emailId}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? `${hintId} ${emailErrorId}` : hintId}
        />
        <p id={hintId} className="text-sm text-muted-foreground">
          Use the email on your listings. We&apos;ll send you to Stripe to finish
          setting up payouts.
        </p>
        {emailError && (
          <p id={emailErrorId} className="text-sm text-destructive">
            {emailError}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={working}>
        {working ? (
          <>
            <Loader2Icon aria-hidden="true" className="animate-spin" />
            Opening Stripe...
          </>
        ) : (
          "Connect with Stripe"
        )}
      </Button>
      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className={submitError ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
      >
        {submitError ??
          (connected ? "This email is already connected to Stripe. You're all set." : "")}
      </p>
    </form>
  );
}
