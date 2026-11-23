"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sendMessage } from "@/lib/listings";
import { MESSAGE_MAX, isValidEmail } from "@/lib/listing-validation";

type MessageFormProps = {
  listingId: string;
  sellerName: string;
};

export function MessageForm({ listingId, sellerName }: MessageFormProps) {
  const baseId = useId();
  const emailId = `${baseId}-email`;
  const emailErrorId = `${baseId}-email-error`;
  const messageId = `${baseId}-message`;
  const messageErrorId = `${baseId}-message-error`;
  const statusId = `${baseId}-status`;

  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const [buyerEmail, setBuyerEmail] = useState("");
  const [message, setMessage] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = buyerEmail.trim();
    const text = message.trim();

    const nextEmailError = !email
      ? "Enter your email so the seller can reply."
      : !isValidEmail(email)
        ? "Enter a valid email address."
        : null;
    const nextMessageError = text ? null : "Write a message before sending.";

    setEmailError(nextEmailError);
    setMessageError(nextMessageError);
    setSubmitError(null);
    setSent(false);

    if (nextEmailError) {
      emailRef.current?.focus();
      return;
    }
    if (nextMessageError) {
      messageRef.current?.focus();
      return;
    }

    setSending(true);
    try {
      await sendMessage({ listingId, buyerEmail: email, message: text });
      setMessage("");
      setSent(true);
    } catch {
      setSubmitError("Couldn't send your message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={emailId} className="text-sm font-medium">
          Your email
        </label>
        <Input
          ref={emailRef}
          id={emailId}
          type="email"
          autoComplete="email"
          value={buyerEmail}
          onChange={(event) => setBuyerEmail(event.target.value)}
          disabled={sending}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? emailErrorId : undefined}
        />
        {emailError && (
          <p id={emailErrorId} className="text-sm text-destructive">
            {emailError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={messageId} className="text-sm font-medium">
          Send seller a message
        </label>
        <Textarea
          ref={messageRef}
          id={messageId}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Hi, is this still available?"
          maxLength={MESSAGE_MAX}
          disabled={sending}
          aria-invalid={messageError ? true : undefined}
          aria-describedby={messageError ? messageErrorId : undefined}
          className="min-h-32"
        />
        {messageError && (
          <p id={messageErrorId} className="text-sm text-destructive">
            {messageError}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={sending}>
        {sending ? "Sending..." : "Send"}
      </Button>
      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className={submitError ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
      >
        {submitError ?? (sent ? `Message sent to ${sellerName}.` : "")}
      </p>
    </form>
  );
}
