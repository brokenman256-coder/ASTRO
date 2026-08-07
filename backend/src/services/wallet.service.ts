import QRCode from "qrcode";
import { v4 as uuid } from "uuid";

/**
 * Builds a UPI-style payment string and renders it as a QR code data URL.
 * This is a SIMULATED payment flow: no real payment gateway is wired in, so
 * scanning it will not move real money. It exists so the UI and admin
 * approval workflow are fully functional; swap `payeeVpa` for a real
 * merchant VPA and connect a gateway webhook to make it live.
 */
export async function buildTopupQr(params: { amountPaise: number; payeeVpa?: string }) {
  const referenceCode = `ASTRO-${uuid().split("-")[0].toUpperCase()}`;
  const amountRupees = (params.amountPaise / 100).toFixed(2);
  const payeeVpa = params.payeeVpa ?? "astro-wallet@sim";
  const upiString = `upi://pay?pa=${payeeVpa}&pn=AstroWallet&am=${amountRupees}&cu=INR&tn=${referenceCode}`;
  const qrDataUrl = await QRCode.toDataURL(upiString);
  return { referenceCode, qrPayload: upiString, qrDataUrl };
}
