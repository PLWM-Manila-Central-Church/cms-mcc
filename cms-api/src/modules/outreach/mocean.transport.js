"use strict";

// Protocol implementation only. No request happens at import/configuration
// time. Live sending and status queries have NOT been provider-tested.
const { transportState } = require("./configuration");
class TransportError extends Error {
  constructor(code, { ambiguous = false, retryable = false } = {}) {
    super(code); this.code = code; this.ambiguous = ambiguous; this.retryable = retryable;
  }
}
const assertLiveEnabled = () => {
  const state = transportState();
  if (!state.sms_delivery_enabled || !state.provider_configured || !state.recipient_restriction_configured) throw new TransportError("LIVE_SMS_DISABLED");
};
const credentials = () => ({
  "mocean-api-key": process.env.MOCEAN_API_KEY, "mocean-api-secret": process.env.MOCEAN_API_SECRET,
  "mocean-resp-format": "json",
});
const send = async ({ phone, message }) => {
  assertLiveEnabled();
  const parameters = new URLSearchParams({ ...credentials(), "mocean-from": process.env.MOCEAN_SENDER_ID,
    "mocean-to": phone.replace(/^\+/, ""), "mocean-text": message });
  let response, body;
  try {
    response = await fetch("https://rest.moceanapi.com/rest/2/sms", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: parameters, signal: AbortSignal.timeout(10000), redirect: "error",
    });
    body = await response.json();
  } catch { throw new TransportError("PROVIDER_RESULT_UNKNOWN", { ambiguous: true }); }
  const item = body.messages?.[0];
  if (response.ok && Number(item?.status) === 0 && typeof item.msgid === "string") return { provider_message_id: item.msgid.slice(0, 150) };
  if (response.status === 429 && !item?.msgid) throw new TransportError("PROVIDER_RATE_LIMITED", { retryable: true });
  const code = Number(item?.status ?? body.status);
  // Only documented, definitive rejections may be retried automatically.
  const rejected = [1, 2, 4, 5, 6, 8, 9, 10, 17, 19, 20, 23, 26, 28, 32, 40];
  if (!item?.msgid && rejected.includes(code)) throw new TransportError("MOCEAN_REJECTED_" + code, { retryable: [32, 40].includes(code) });
  throw new TransportError("PROVIDER_RESULT_UNKNOWN", { ambiguous: true });
};
const queryStatus = async (messageId) => {
  assertLiveEnabled();
  const parameters = new URLSearchParams({ ...credentials(), "mocean-msgid": messageId });
  let response, body;
  try {
    response = await fetch("https://rest.moceanapi.com/rest/2/report/message?" + parameters.toString(), {
      signal: AbortSignal.timeout(10000), redirect: "error",
    });
    body = await response.json();
  } catch { throw new TransportError("PROVIDER_STATUS_UNAVAILABLE"); }
  if (!response.ok || Number(body.status) !== 0) throw new TransportError("PROVIDER_STATUS_UNAVAILABLE");
  return ({ 1: "delivered", 2: "failed", 3: "failed", 4: "sent", 5: "unknown" })[Number(body.message_status)] || "unknown";
};
module.exports = { send, queryStatus, TransportError };
