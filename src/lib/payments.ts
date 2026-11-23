// Payment rules shared by the browser and the server. Pure: no server imports,
// so client components can use it too.

/** Share of each sale the marketplace keeps (an application fee on the charge). */
export const PLATFORM_FEE_RATE = 0.1;
export const CURRENCY = "usd";

// Stripe's limits for a USD charge, in cents ($0.50 to $999,999.99).
export const MIN_CHARGE_CENTS = 50;
export const MAX_CHARGE_CENTS = 99_999_999;

/** Dollars to cents, rounded so prices like 19.99 don't pick up float error. */
export function toMinorUnits(price: number): number {
  return Math.round(price * 100);
}

export function platformFee(amountCents: number): number {
  return Math.round(amountCents * PLATFORM_FEE_RATE);
}

export function isChargeable(price: number): boolean {
  const cents = toMinorUnits(price);
  return cents >= MIN_CHARGE_CENTS && cents <= MAX_CHARGE_CENTS;
}

/** Why a listing can or can't be bought right now. */
export type BuyStatus =
  | "ready"
  | "sold"
  | "no_seller_account"
  | "seller_not_ready"
  | "price_unsupported";

/** What we know about a seller's Stripe account: none saved, saved but can't take charges yet, or ready. */
export type SellerPayments = "none" | "not_ready" | "ready";

export function sellerPaymentsOf(
  account: { charges_enabled: boolean } | null,
): SellerPayments {
  if (account === null) return "none";
  return account.charges_enabled ? "ready" : "not_ready";
}

export function getBuyStatus(
  listing: { status: "available" | "sold"; price: number },
  seller: SellerPayments,
): BuyStatus {
  if (listing.status === "sold") return "sold";
  if (!isChargeable(listing.price)) return "price_unsupported";
  if (seller === "none") return "no_seller_account";
  if (seller === "not_ready") return "seller_not_ready";
  return "ready";
}

export type PurchaseRefusal = Exclude<BuyStatus, "ready">;

const REFUSAL_MESSAGES: Record<PurchaseRefusal, string> = {
  sold: "This item has already been sold.",
  no_seller_account: "This seller hasn't set up online payments yet.",
  price_unsupported: "This item's price can't be paid for online.",
  seller_not_ready: "This seller hasn't finished setting up payments yet.",
};

/** The server refused to start a checkout; routes answer 409 with the message. */
export class PurchaseNotAllowedError extends Error {
  readonly reason: PurchaseRefusal;

  constructor(reason: PurchaseRefusal) {
    super(REFUSAL_MESSAGES[reason]);
    this.name = "PurchaseNotAllowedError";
    this.reason = reason;
  }
}
