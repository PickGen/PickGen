// Minimal Paddle.js (Billing v2) loader + checkout helper.

interface PaddleGlobal {
  Environment: { set: (e: string) => void };
  Initialize: (opts: { token: string }) => void;
  Checkout: { open: (opts: unknown) => void };
}
declare global {
  interface Window {
    Paddle?: PaddleGlobal;
  }
}

let ready: Promise<PaddleGlobal> | null = null;

/** Load paddle.js once and initialize it with the client-side token. */
export function loadPaddle(clientToken: string, env: string): Promise<PaddleGlobal> {
  if (ready) return ready;
  ready = new Promise((resolve, reject) => {
    const init = () => {
      const P = window.Paddle;
      if (!P) return reject(new Error('Paddle failed to load'));
      try {
        if (env === 'sandbox') P.Environment.set('sandbox');
        P.Initialize({ token: clientToken });
        resolve(P);
      } catch (e) {
        reject(e as Error);
      }
    };
    if (window.Paddle) return init();
    const s = document.createElement('script');
    s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    s.async = true;
    s.onload = init;
    s.onerror = () => reject(new Error('Paddle failed to load'));
    document.head.appendChild(s);
  });
  return ready;
}

/** Open the Paddle checkout overlay for a price, tagging the user + package. */
export async function openPaddleCheckout(params: {
  clientToken: string;
  env: string;
  priceId: string;
  userId: string;
  packageId: string;
  successUrl: string;
}): Promise<void> {
  const Paddle = await loadPaddle(params.clientToken, params.env);
  Paddle.Checkout.open({
    items: [{ priceId: params.priceId, quantity: 1 }],
    customData: { user_id: params.userId, package_id: params.packageId },
    settings: { displayMode: 'overlay', successUrl: params.successUrl },
  });
}
