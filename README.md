# Outlaw SMP — Store

A static storefront for the **Outlaw SMP** Minecraft server. Red / black / white theme, animated embers, card-suit accents, click sounds, a working cart, crate previews, checkout handoff to Discord and a real review section.

## Run it

No build step. Open `index.html` directly, or serve the folder with any static server:

```bash
npx serve outlaw-smp
# or VS Code Live Server, or python -m http.server
```

## What's included

- **Ranks:** Prime ($1) and Outlaw+ ($5), with kit previews, perks, and a 2-key picker. Both include 2 crate keys of the buyer's choice.
- **Crates:** Normal, Gold, Spawner, Seasonal, Special and Keyall — $2 per key. Each has an in-game reward preview modal.
- **Cart:** quantities, key selection for ranks, localStorage persistence, live subtotal.
- **Checkout:** collects the Minecraft username, copies a formatted order to the clipboard, opens the Discord so the buyer can finish in a ticket, and posts an order log to your Discord webhook. After a successful copy the cart empties and the drawer closes so the same order can't be submitted twice. **No payment is processed on this site.**
- **Reviews:** real submissions only. Starts empty. Stores reviews in the browser's localStorage in this demo.
- **Effects:** ember canvas, 3D CSS crates, tilt cards, scroll reveals, custom cursor glow, animated ticker, click sounds (Web Audio, no audio files), reduced-motion support.
- **Mobile:** responsive layout and a full-screen mobile menu.

## Important files

| Path | Purpose |
| --- | --- |
| `index.html` | All page content |
| `css/styles.css` | Theme, layout, animations |
| `js/config.js` | Discord order webhook URL |
| `js/main.js` | Cart, checkout, reviews, sound, effects |
| `assets/` | Kit screenshots, crate menus, builds, logo |

The Discord URL is `https://discord.gg/outlawsmp`. It appears in `index.html` and at the top of `js/main.js` (`const DISCORD`). Change it in both places if needed.

## Order webhook

Every checkout posts an embed to the webhook configured in `js/config.js` (`discordOrderWebhook`). The embed includes:

- Minecraft username
- Order reference (`OSMP-...`)
- Items, quantities and chosen crate keys
- Total
- A note that payment is confirmed in a ticket

The buyer also sees the order reference in the success dialog, plus a status line saying whether the log reached Discord.

**Security:** a webhook URL in a static site is public — anyone can open DevTools and post to it. For a small store this is usually fine to start. If it gets abused:

1. Rotate the webhook in Discord (Channel settings → Integrations → Webhooks).
2. Put a small proxy in front and point `discordOrderWebhook` at the proxy URL instead.
3. Add rate limiting or Cloudflare Turnstile to the proxy.

Minimal Cloudflare Worker proxy:

```js
export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    const body = await request.text();
    const response = await fetch(env.DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body
    });
    return new Response(null, { status: response.status });
  }
};
```

Store the real webhook as a secret named `DISCORD_WEBHOOK` in the Worker settings, then put the Worker URL in `js/config.js`.

## Before going live

1. **Payments.** The checkout currently copies the order and opens Discord. To take card/PayPal payments automatically, connect a checkout provider such as Tebex, Stripe Payment Links, or your server's webstore plugin. Replace the submit handler in `js/main.js` (`handleCheckoutSubmit`) with your provider's redirect. Once payments are automated, send the order log from the provider's server-side webhook instead — that keeps the Discord webhook URL private and only logs paid orders.
2. **Reviews.** The review form saves to `localStorage`, so submissions are only visible in that browser. To collect public reviews, point the form at a backend (Supabase, Firebase, Formspree, a small API, etc.) and render the returned reviews. Do not seed fake reviews — fake customer reviews are deceptive and can get a store banned or fined in many places.
3. **Discord delivery process.** Make sure staff know what a pasted order looks like. The generated text includes the IGN, each item, chosen keys, and the total.
4. **Prices / rewards.** Prices and perk text live in `index.html` and the `CRATES` / `RANKS` objects in `js/main.js`. Keep the crate reward descriptions aligned with the in-game menus and current odds.
5. **Legal.** The footer says the server is not affiliated with Mojang/Microsoft and that crate rewards are randomised. Keep a clear refund/delivery policy in your Discord.

## Images

The supplied screenshots were used:

- `kit-outlaw.png` — Outlaw+ kit preview
- `kit-prime.png` — Prime kit preview
- `menu-normal.png`, `menu-gold.png`, `menu-spawner.png`, `menu-seasonal.png`, `menu-special.png` — crate reward menus
- `hero-crates.jpg`, `crate-hall.jpg`, `skull-mountain.jpg`, `afk-zone.jpg` — builds/backgrounds
- `logo.png` — logo with the white background removed

You can replace any of these with newer screenshots at the same paths and filenames. Keep the kit images roughly 572×387 and the crate menus roughly 520×270 for the cleanest result.

## Notes

- Click sounds are synthesised with the Web Audio API and start after the first interaction. The speaker button in the header mutes/unmutes and remembers the choice.
- The `prefers-reduced-motion` media query disables the heavy animations for users who ask for it.
- No fake reviews were added. The review section is intentionally empty until real players submit one.
