import { Resend } from "resend";

let resendClient: Resend | undefined;

export function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error("Missing RESEND_API_KEY environment variable");
    }

    resendClient = new Resend(apiKey);
  }

  return resendClient;
}
