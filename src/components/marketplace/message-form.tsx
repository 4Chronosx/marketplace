"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendMessage } from "@/lib/listings";

const MESSAGE_MAX = 1000;

type MessageFormProps = {
  listingId: string;
  sellerName: string;
};

export function MessageForm({ listingId, sellerName }: MessageFormProps) {
  const fieldId = useId();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    if (!text) {
      setSent(false);
      setError("Write a message before sending.");
      return;
    }
    setError(null);
    setSent(false);
    setSending(true);
    try {
      await sendMessage({ listingId, message: text });
      setMessage("");
      setSent(true);
    } catch {
      setError("Couldn't send your message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <label htmlFor={fieldId} className="text-sm font-medium">
        Send seller a message
      </label>
      <Textarea
        id={fieldId}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Hi, is this still available?"
        maxLength={MESSAGE_MAX}
        disabled={sending}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${fieldId}-status`}
        className="min-h-32"
      />
      <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={sending}>
        {sending ? "Sending..." : "Send"}
      </Button>
      <p
        id={`${fieldId}-status`}
        role="status"
        aria-live="polite"
        className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
      >
        {error ?? (sent ? `Message sent to ${sellerName}.` : "")}
      </p>
    </form>
  );
}
