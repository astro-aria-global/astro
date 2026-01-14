/// <reference types="astro/client" />

interface TurnstileResponse {
  success: boolean;
  hostname?: string;
  challenge_ts?: string;
  "error-codes": string[];
  cdata?: string;
  action?: string;
}

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    otherLocals: {
      test: string;
    };
  }
}
