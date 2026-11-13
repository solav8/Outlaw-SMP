/* =========================================================
   OUTLAW SMP — store logic
   ========================================================= */
(() => {
  "use strict";

  const DISCORD = "https://discord.gg/outlawsmp";
  const CONFIG = window.OUTLAW_CONFIG || {};
  const ORDER_WEBHOOK = typeof CONFIG.discordOrderWebhook === "string"
    ? CONFIG.discordOrderWebhook.trim()
    : "";
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  const CRATES = {
    normal: {
      name: "Normal",
      price: 2,
      color: "#22d3c5",
      preview: "assets/menu-normal.png",
      blurb: "Enchanted gear, sword, pickaxe, axe, shovel and the essentials to get moving.",
      long: "The everyday workhorse. The in-game menu shows an enchanted armour set, sword, pickaxe, axe, shovel and bonus loot — everything you need to start stacking.",
      wide: false,
      imageAlt: "Normal Crate reward menu"
    },
    gold: {
      name: "Gold",
      price: 2,
      color: "#f5c84c",
      preview: "assets/menu-gold.png",
      blurb: "Full gear set, tools and bonus loot. A little extra shine in every key.",
      long: "A full gear set and tools, plus bonus loot. Open the in-game preview for the exact items shown in the Gold Crate menu.",
      wide: false,
      imageAlt: "Gold Crate reward menu"
    },
    spawner: {
      name: "Spawner",
      price: 2,
      color: "#8094a8",
      preview: "assets/menu-spawner.png",
      blurb: "Seven spawners. Build the farm. Ruin your sleep schedule.",
      long: "Seven spawners in one key. The in-game menu is stacked with them — build the farm of your dreams (or your nightmares).",
      wide: false,
      imageAlt: "Spawner Crate reward menu"
    },
    seasonal: {
      name: "Seasonal",
      price: 2,
      color: "#ff8a2a",
      preview: "assets/menu-seasonal.png",
      blurb: "Seasonal armour set, tools and bonus loot while the season lasts.",
      long: "Seasonal-themed gear, tools and bonus loot. Available while the current season is running — ask in Discord if you're not sure what's live.",
      wide: false,
      imageAlt: "Seasonal Crate reward menu"
    },
    special: {
      name: "Special",
      price: 2,
      color: "#3aa0ff",
      preview: "assets/menu-special.png",
      blurb: "Special tools, a gold block, a trident and more. For the loot goblins.",
      long: "A little bit of everything for the loot goblins: special tools, a gold block, a trident and more. Check the in-game menu for the preview.",
      wide: false,
      imageAlt: "Special Crate reward menu"
    },
    keyall: {
      name: "Keyall",
      price: 2,
      color: "#52e05a",
      preview: "assets/crate-hall.jpg",
      blurb: "The community crate. Hype up the lobby and spread the loot.",
      long: "The community crate. It lives at the end of the crate hall — the green one. Full reward details and current odds are in the Discord.",
      wide: true,
      imageAlt: "The Keyall Crate in the Outlaw SMP crate hall"
    }
  };

  const RANKS = {
    prime: {
      name: "Prime",
      price: 1,
      kit: "assets/kit-prime.png",
      defaultKeys: ["normal", "gold"]
    },
    outlaw: {
      name: "Outlaw+",
      price: 5,
      kit: "assets/kit-outlaw.png",
      defaultKeys: ["normal", "gold"]
    }
  };

  const money = (value) => `$${Number(value).toFixed(2)}`;
  const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));

  const storage = {
    get(key, fallback) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* private mode / storage disabled — the cart still works for this tab */
      }
    }
  };

  /* ---------------------------------------------------------
     Sound — synthesised, so there are no audio files to load.
     --------------------------------------------------------- */
  const sound = (() => {
    let ctx = null;
    let enabled = storage.get("outlaw_sound", true);
    const AudioCtx = window.AudioContext || window.webkitAudioContext;

    function unlock() {
      if (!AudioCtx) return;
      if (!ctx) {
        try { ctx = new AudioCtx(); } catch { ctx = null; return; }
      }
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
    }

    function beep(freq, duration, type = "triangle", volume = 0.03, delay = 0, slideTo = null) {
      if (!ctx) return;
      const start = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(40, freq), start);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), start + duration);
      }
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.03);
    }

    function play(kind = "click") {
      if (!enabled) return;
      unlock();
      if (!ctx) return;
      switch (kind) {
        case "tick":
          beep(1180, 0.028, "square", 0.012, 0, 920);
          break;
        case "buy":
          beep(520, 0.065, "square", 0.028);
          beep(780, 0.1, "triangle", 0.03, 0.065);
          break;
        case "success":
          beep(523.25, 0.09, "triangle", 0.03, 0);
          beep(659.25, 0.09, "triangle", 0.03, 0.075);
          beep(783.99, 0.09, "triangle", 0.03, 0.15);
          beep(1046.5, 0.18, "triangle", 0.028, 0.225);
          break;
        case "error":
          beep(170, 0.16, "sawtooth", 0.028, 0, 105);
          break;
        case "toggle":
          beep(880, 0.06, "sine", 0.025, 0, 1100);
          break;
        case "click":
        default:
          beep(760, 0.045, "triangle", 0.03, 0, 420);
          break;
      }
    }

    function toggle() {
      if (enabled) {
        play("click");
        enabled = false;
      } else {
        enabled = true;
        play("toggle");
      }
      storage.set("outlaw_sound", enabled);
      return enabled;
    }

    return {
      play,
      toggle,
      unlock,
      isEnabled: () => enabled
    };
  })();

  /* ---------------------------------------------------------
     Global click sounds + ripple
     --------------------------------------------------------- */
  let lastSoundAt = 0;
  document.addEventListener("pointerdown", (event) => {
    const target = event.target.closest("[data-sound], .btn, button, a, summary");
    if (!target || target.disabled) return;
    if (target.closest("#soundToggle")) return;
    const now = Date.now();
    if (now - lastSoundAt < 28) return;
    lastSoundAt = now;
    sound.play(target.dataset.sound || "click");
  }, { passive: true });

  document.addEventListener("pointerdown", (event) => {
    const button = event.target.closest(".btn");
    if (!button || button.disabled) return;
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.setAttribute("aria-hidden", "true");
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;
    button.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 620);
  }, { passive: true });

  /* ---------------------------------------------------------
     Header / scroll progress / reveal / tilt
     --------------------------------------------------------- */
  const header = $("#siteHeader");
  const scrollBar = $("#scrollBar");
  let scrollTick = false;

  function updateScrollUI() {
    header.classList.toggle("scrolled", window.scrollY > 18);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    scrollBar.style.transform = `scaleX(${progress})`;
    scrollTick = false;
  }
  window.addEventListener("scroll", () => {
    if (!scrollTick) {
      scrollTick = true;
      window.requestAnimationFrame(updateScrollUI);
    }
  }, { passive: true });
  updateScrollUI();

  if (!reducedMotion && "IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    $$(".reveal").forEach((el) => revealObserver.observe(el));
  } else {
    $$(".reveal").forEach((el) => el.classList.add("in"));
  }

  if (finePointer && !reducedMotion) {
    $$("[data-tilt]").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        if (event.pointerType !== "mouse") return;
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty("--ry", `${x * 4}deg`);
        card.style.setProperty("--rx", `${-y * 4}deg`);
      });
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--ry", "0deg");
        card.style.setProperty("--rx", "0deg");
      });
    });
  }

  if (finePointer && !reducedMotion) {
    document.body.classList.add("has-pointer");
    const glow = $("#cursorGlow");
    document.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse") return;
      glow.style.transform = `translate3d(${event.clientX - 210}px, ${event.clientY - 210}px, 0)`;
    }, { passive: true });
  }

  /* ---------------------------------------------------------
     Ember canvas
     --------------------------------------------------------- */
  const emberCanvas = $("#embers");
  if (emberCanvas && !reducedMotion) {
    const ctx = emberCanvas.getContext("2d");
    const hero = emberCanvas.parentElement;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles = [];
    let raf = null;
    let heroVisible = true;

    function makeParticle(initial = false) {
      return {
        x: Math.random() * width,
        y: initial ? Math.random() * height : height + 12,
        size: Math.random() * 1.7 + 0.6,
        speed: Math.random() * 0.34 + 0.1,
        drift: (Math.random() - 0.5) * 0.2,
        alpha: Math.random() * 0.5 + 0.12,
        color: Math.random() > 0.62 ? "255, 74, 58" : "255, 157, 88"
      };
    }

    function resetParticle(particle) {
      Object.assign(particle, makeParticle(false));
    }

    function resizeEmbers() {
      const rect = hero.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      emberCanvas.width = Math.round(width * dpr);
      emberCanvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(72, Math.max(26, width / 18)));
      particles = Array.from({ length: count }, () => makeParticle(true));
    }

    function drawEmbers() {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      for (const particle of particles) {
        particle.y -= particle.speed;
        particle.x += particle.drift + Math.sin((particle.y + particle.x) * 0.012) * 0.06;
        particle.alpha += (Math.random() - 0.5) * 0.012;
        particle.alpha = Math.max(0.06, Math.min(0.7, particle.alpha));
        ctx.fillStyle = `rgba(${particle.color}, ${particle.alpha})`;
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
        if (particle.y < -12 || particle.x < -12 || particle.x > width + 12) {
          resetParticle(particle);
        }
      }
      ctx.globalCompositeOperation = "source-over";
      raf = window.requestAnimationFrame(drawEmbers);
    }

    function startEmbers() {
      if (raf === null && heroVisible && !document.hidden) {
        raf = window.requestAnimationFrame(drawEmbers);
      }
    }

    function stopEmbers() {
      if (raf !== null) window.cancelAnimationFrame(raf);
      raf = null;
      ctx.clearRect(0, 0, width, height);
    }

    resizeEmbers();
    startEmbers();

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resizeEmbers, 180);
    }, { passive: true });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopEmbers();
      else if (heroVisible) startEmbers();
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        heroVisible = entries[0].isIntersecting;
        if (heroVisible) startEmbers();
        else stopEmbers();
      }, { threshold: 0 }).observe(hero);
    }
  }

  /* ---------------------------------------------------------
     Scrollspy
     --------------------------------------------------------- */
  const navLinks = $$(".nav a");
  if ("IntersectionObserver" in window && navLinks.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const hash = `#${entry.target.id}`;
        navLinks.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === hash));
      });
    }, { rootMargin: "-42% 0px -52% 0px" });
    $$("main section[id]").forEach((section) => spy.observe(section));
  }

  /* ---------------------------------------------------------
     Cart state
     --------------------------------------------------------- */
  const CART_KEY = "outlaw_cart_v2";
  let cart = storage.get(CART_KEY, []);
  if (!Array.isArray(cart)) cart = [];
  cart = cart.filter((item) => item && typeof item === "object" && item.id && item.type && item.price >= 0);

  const cartCountEl = $("#cartCount");
  const cartBody = $("#cartBody");
  const cartTotalEl = $("#cartTotal");
  const checkoutBtn = $("#checkoutBtn");
  const clearCartBtn = $("#clearCart");
  const cartDrawer = $("#cartDrawer");
  const cartBackdrop = $("#drawerBackdrop");
  const cartCloseBtn = $("#cartClose");
  const cartOpenBtn = $("#cartOpen");

  let cartIsOpen = false;
  let modalIsOpen = false;
  let navIsOpen = false;
  let cartTrigger = null;
  let modalTrigger = null;
  let cartCloseTimer = null;
  let modalCloseTimer = null;
  let navCloseTimer = null;

  function makeId() {
    return `li_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function saveCart() {
    storage.set(CART_KEY, cart);
  }

  function cartQuantity() {
    return cart.reduce((total, item) => total + item.qty, 0);
  }

  function cartSubtotal() {
    return cart.reduce((total, item) => total + item.price * item.qty, 0);
  }

  function keyNames(item) {
    return (item.keys || []).map((key) => CRATES[key]?.name || key).join(" + ");
  }

  function syncBodyLock() {
    document.body.classList.toggle("no-scroll", cartIsOpen || modalIsOpen || navIsOpen);
  }

  function bumpCartCount() {
    cartCountEl.classList.remove("bump");
    void cartCountEl.offsetWidth;
    cartCountEl.classList.add("bump");
  }

  function updateCartTotals() {
    cartCountEl.textContent = String(cartQuantity());
    cartTotalEl.textContent = money(cartSubtotal());
    checkoutBtn.disabled = cart.length === 0;
    clearCartBtn.hidden = cart.length === 0;
  }

  function toast(message) {
    const wrap = $("#toastWrap");
    if (!wrap) return;
    while (wrap.children.length >= 3) wrap.firstElementChild.remove();
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    wrap.appendChild(el);
    window.setTimeout(() => {
      el.classList.add("out");
      window.setTimeout(() => el.remove(), 320);
    }, 3400);
  }

  function crateOptions(selectedKey) {
    return Object.entries(CRATES).map(([key, crate]) =>
      `<option value="${key}"${key === selectedKey ? " selected" : ""}>${crate.name}</option>`
    ).join("");
  }

  function renderCart() {
    cartBody.textContent = "";

    if (cart.length === 0) {
      cartBody.innerHTML = `
        <div class="cart-empty">
          <div class="empty-cards" aria-hidden="true">A♦ Q♠</div>
          <h3>Nothing in here.</h3>
          <p>Grab a rank or add a crate key. The loot isn't going to buy itself.</p>
          <a class="btn btn-ghost btn-sm" href="#ranks" data-close-cart data-sound="click">Browse ranks</a>
        </div>`;
      updateCartTotals();
      return;
    }

    const fragment = document.createDocumentFragment();

    cart.forEach((item) => {
      const row = document.createElement("div");
      row.className = "cart-item";
      row.dataset.id = item.id;

      const thumb = document.createElement("div");
      thumb.className = "cart-thumb";
      if (item.type === "rank") {
        thumb.innerHTML = `<img src="${RANKS[item.rank]?.kit || "assets/kit-outlaw.png"}" alt="" width="62" height="62" loading="lazy">`;
      } else {
        const crate = CRATES[item.crate];
        thumb.classList.add("crate-thumb");
        thumb.style.setProperty("--c", crate?.color || "#ffffff");
        thumb.setAttribute("aria-hidden", "true");
      }

      const info = document.createElement("div");
      info.className = "cart-item-info";
      const title = document.createElement("h4");
      title.textContent = item.name;
      const meta = document.createElement("div");
      meta.className = "cart-meta";
      const keyLabel = keyNames(item);
      meta.textContent = item.type === "rank"
        ? `${money(item.price)} each · ${keyLabel ? `Keys: ${keyLabel}` : "2 keys included"}`
        : `${money(item.price)} per key`;
      info.append(title, meta);

      if (item.type === "rank") {
        const keyWrap = document.createElement("div");
        keyWrap.className = "cart-key-selects";
        [0, 1].forEach((index) => {
          const select = document.createElement("select");
          select.dataset.keyIndex = String(index);
          select.setAttribute("aria-label", `Key ${index + 1} for ${item.name}`);
          select.innerHTML = crateOptions(item.keys?.[index] || "normal");
          keyWrap.appendChild(select);
        });
        info.appendChild(keyWrap);
      }

      const right = document.createElement("div");
      right.className = "cart-item-right";
      const price = document.createElement("span");
      price.className = "cart-item-price";
      price.textContent = money(item.price * item.qty);

      const qty = document.createElement("div");
      qty.className = "qty";
      qty.innerHTML = `
        <button type="button" data-action="dec" aria-label="Decrease quantity" data-sound="tick"${item.qty <= 1 ? " disabled" : ""}>−</button>
        <span>${item.qty}</span>
        <button type="button" data-action="inc" aria-label="Increase quantity" data-sound="tick">+</button>`;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "cart-remove";
      remove.dataset.action = "remove";
      remove.setAttribute("aria-label", `Remove ${item.name} from cart`);
      remove.dataset.sound = "click";
      remove.textContent = "×";

      right.append(price, qty, remove);
      row.append(thumb, info, right);
      fragment.appendChild(row);
    });

    cartBody.appendChild(fragment);
    updateCartTotals();
  }

  function addRank(rankKey, keys) {
    const rank = RANKS[rankKey];
    if (!rank) return;
    const cleanKeys = (keys || rank.defaultKeys).filter((key) => CRATES[key]).slice(0, 2);
    if (cleanKeys.length !== 2) {
      toast("Pick exactly 2 crate keys first.");
      sound.play("error");
      return;
    }

    const existing = cart.find((item) =>
      item.type === "rank" &&
      item.rank === rankKey &&
      item.keys?.[0] === cleanKeys[0] &&
      item.keys?.[1] === cleanKeys[1]
    );

    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        id: makeId(),
        type: "rank",
        rank: rankKey,
        name: `${rank.name} Rank`,
        price: rank.price,
        qty: 1,
        keys: cleanKeys
      });
    }

    saveCart();
    renderCart();
    bumpCartCount();
    toast(`${rank.name} added — 2 keys: ${keyNames({ keys: cleanKeys })}.`);
  }

  function addCrate(crateKey) {
    const crate = CRATES[crateKey];
    if (!crate) return;
    const existing = cart.find((item) => item.type === "crate" && item.crate === crateKey);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        id: makeId(),
        type: "crate",
        crate: crateKey,
        name: `${crate.name} Crate Key`,
        price: crate.price,
        qty: 1
      });
    }
    saveCart();
    renderCart();
    bumpCartCount();
    toast(`${crate.name} key added — ${money(crate.price)}.`);
  }

  function openCart() {
    if (cartIsOpen) return;
    cartIsOpen = true;
    cartTrigger = document.activeElement;
    window.clearTimeout(cartCloseTimer);
    renderCart();
    cartBackdrop.hidden = false;
    cartDrawer.hidden = false;
    cartDrawer.setAttribute("aria-hidden", "false");
    window.requestAnimationFrame(() => {
      cartBackdrop.classList.add("is-open");
      cartDrawer.classList.add("is-open");
    });
    syncBodyLock();
    window.setTimeout(() => cartCloseBtn.focus(), 60);
  }

  function closeCart() {
    if (!cartIsOpen) return;
    cartIsOpen = false;
    cartBackdrop.classList.remove("is-open");
    cartDrawer.classList.remove("is-open");
    cartDrawer.setAttribute("aria-hidden", "true");
    syncBodyLock();
    cartCloseTimer = window.setTimeout(() => {
      if (!cartIsOpen) {
        cartBackdrop.hidden = true;
        cartDrawer.hidden = true;
      }
    }, 360);
    if (cartTrigger && typeof cartTrigger.focus === "function") {
      window.setTimeout(() => cartTrigger.focus(), 50);
    }
  }

  cartOpenBtn.addEventListener("click", openCart);
  cartCloseBtn.addEventListener("click", closeCart);
  cartBackdrop.addEventListener("click", closeCart);

  cartBody.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-cart]")) {
      closeCart();
      return;
    }
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) return;
    const row = actionEl.closest(".cart-item");
    if (!row) return;
    const item = cart.find((entry) => entry.id === row.dataset.id);
    if (!item) return;

    const action = actionEl.dataset.action;
    if (action === "inc") item.qty += 1;
    if (action === "dec") item.qty = Math.max(1, item.qty - 1);
    if (action === "remove") cart = cart.filter((entry) => entry.id !== item.id);

    saveCart();
    renderCart();
    if (action === "remove") toast(`${item.name} removed.`);
  });

  cartBody.addEventListener("change", (event) => {
    const select = event.target.closest("select[data-key-index]");
    if (!select) return;
    const row = select.closest(".cart-item");
    const item = cart.find((entry) => entry.id === row?.dataset.id);
    if (!item || item.type !== "rank") return;
    const index = Number(select.dataset.keyIndex);
    item.keys[index] = select.value;
    saveCart();
    const meta = row.querySelector(".cart-meta");
    if (meta) meta.textContent = `${money(item.price)} each · Keys: ${keyNames(item)}`;
    toast(`Key ${index + 1} set to ${CRATES[select.value]?.name || select.value}.`);
  });

  clearCartBtn.addEventListener("click", () => {
    if (!cart.length) return;
    cart = [];
    saveCart();
    renderCart();
    toast("Cart cleared.");
  });

  checkoutBtn.addEventListener("click", () => {
    if (!cart.length) {
      toast("Your cart is empty — add a rank or key first.");
      return;
    }
    openCheckout();
  });

  /* ---------------------------------------------------------
     Modal system
     --------------------------------------------------------- */
  const modal = $("#modal");
  const modalBackdrop = $("#modalBackdrop");
  const modalContent = $("#modalContent");
  const modalCloseBtn = $("#modalClose");

  function openModal(html) {
    if (!modalIsOpen) modalTrigger = document.activeElement;
    window.clearTimeout(modalCloseTimer);
    modalContent.innerHTML = html;
    modalIsOpen = true;
    modalBackdrop.hidden = false;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    window.requestAnimationFrame(() => {
      modalBackdrop.classList.add("is-open");
      modal.classList.add("is-open");
    });
    syncBodyLock();
    window.setTimeout(() => {
      const target = modalContent.querySelector("input, textarea, select, .btn, button, a");
      (target || modalCloseBtn).focus();
    }, 70);
  }

  function closeModal() {
    if (!modalIsOpen) return;
    modalIsOpen = false;
    modalBackdrop.classList.remove("is-open");
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    syncBodyLock();
    modalCloseTimer = window.setTimeout(() => {
      if (!modalIsOpen) {
        modal.hidden = true;
        modalBackdrop.hidden = true;
        modalContent.textContent = "";
      }
    }, 300);
    if (modalTrigger && typeof modalTrigger.focus === "function") {
      window.setTimeout(() => modalTrigger.focus(), 60);
    }
  }

  modalCloseBtn.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", closeModal);

  /* ---------------------------------------------------------
     Lightbox + crate previews
     --------------------------------------------------------- */
  function openLightbox(src, title) {
    openModal(`
      <div class="lightbox">
        <div class="kicker">Kit preview</div>
        <h2 id="modalTitle">${escapeHtml(title)}</h2>
        <img src="${escapeHtml(src)}" alt="${escapeHtml(title)}" loading="eager">
        <p>In-game preview from Outlaw SMP. The full kit is delivered when staff process your order.</p>
      </div>`);
  }

  function openCratePreview(crateKey) {
    const crate = CRATES[crateKey];
    if (!crate) return;
    openModal(`
      <div class="crate-modal" style="--crate:${crate.color}">
        <div class="kicker">Crate preview</div>
        <h2 id="modalTitle">${crate.name} Crate</h2>
        <p class="modal-sub">${escapeHtml(crate.long)}</p>
        <img class="crate-modal-img${crate.wide ? " wide" : ""}" src="${crate.preview}" alt="${escapeHtml(crate.imageAlt)}" loading="eager">
        <div class="crate-modal-meta"><i></i> $2 per key · ${crate.wide ? "Crate hall" : "In-game reward menu"}</div>
        <div class="modal-actions">
          <button class="btn btn-primary" type="button" data-add-crate="${crateKey}" data-sound="buy">Add ${crate.name} key — $2</button>
          <a class="btn btn-ghost" href="${DISCORD}" target="_blank" rel="noopener" data-sound="click">Ask in Discord</a>
        </div>
        <p class="fine">Preview from the in-game crate ${crate.wide ? "hall" : "menu"}. Full reward list and odds are in Discord.</p>
      </div>`);
  }

  /* ---------------------------------------------------------
     Checkout
     --------------------------------------------------------- */
  let checkoutInFlight = false;

  function createOrderRef() {
    const time = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `OSMP-${time}-${rand}`;
  }

  function buildOrder(username, ref) {
    const divider = "--------------------------------";
    const lines = cart.map((item) => {
      let line = `${item.qty}x ${item.name} — ${money(item.price * item.qty)}`;
      if (item.type === "rank") line += `\n   Keys: ${keyNames(item)}`;
      return line;
    });
    return [
      "OUTLAW SMP ORDER",
      `ORDER REF: ${ref}`,
      `IGN: ${username}`,
      divider,
      ...lines,
      divider,
      `TOTAL: ${money(cartSubtotal())}`,
      "",
      "Please confirm payment and delivery in a Discord ticket.",
      "discord.gg/outlawsmp"
    ].join("\n");
  }

  function buildOrderLog(username, ref) {
    const items = cart.map((item) => {
      let line = `${item.qty}× ${item.name} — ${money(item.price * item.qty)}`;
      if (item.type === "rank") line += ` (keys: ${keyNames(item)})`;
      return line;
    }).join("\n");
    const itemsValue = items.length > 1000 ? `${items.slice(0, 997)}…` : items;

    return {
      username: "Outlaw SMP Orders",
      embeds: [{
        title: `New order — ${money(cartSubtotal())}`,
        color: 0xd21f2b,
        fields: [
          { name: "Minecraft username", value: `\`${username}\``, inline: true },
          { name: "Order ref", value: `\`${ref}\``, inline: true },
          { name: "Items", value: itemsValue || "—" },
          { name: "Payment", value: "Not collected on-site — confirm in a Discord ticket." }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: "Outlaw SMP storefront" }
      }]
    };
  }

  function logOrderToDiscord(username, ref) {
    if (!ORDER_WEBHOOK) return Promise.resolve(false);

    const url = `${ORDER_WEBHOOK}${ORDER_WEBHOOK.includes("?") ? "&" : "?"}wait=true`;
    const payload = JSON.stringify(buildOrderLog(username, ref));

    const attempt = (tryNumber) => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 8000);

      return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        signal: controller.signal
      })
        .then(async (response) => {
          if (response.ok) return true;
          if (response.status === 429 && tryNumber < 1) {
            const data = await response.json().catch(() => ({}));
            const wait = Math.min(Number(data.retry_after) || 1, 5) * 1000;
            await new Promise((resolve) => window.setTimeout(resolve, wait));
            return attempt(tryNumber + 1);
          }
          if (response.status >= 500 && tryNumber < 1) {
            await new Promise((resolve) => window.setTimeout(resolve, 1200));
            return attempt(tryNumber + 1);
          }
          throw new Error(`Discord responded ${response.status}`);
        })
        .catch((error) => {
          // One retry for dropped connections; don't retry a deliberate timeout.
          if (tryNumber < 1 && error.name !== "AbortError") {
            return new Promise((resolve) => window.setTimeout(resolve, 1200))
              .then(() => attempt(tryNumber + 1));
          }
          return false;
        })
        .finally(() => window.clearTimeout(timer));
    };

    return attempt(0);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch { ok = false; }
      area.remove();
      if (ok) resolve();
      else reject(new Error("copy failed"));
    });
  }

  function openCheckout() {
    checkoutInFlight = false;
    const lines = cart.map((item) => `
      <div class="checkout-line">
        <span>${item.qty}× ${escapeHtml(item.name)}${item.type === "rank" ? `<small>Keys: ${escapeHtml(keyNames(item))}</small>` : ""}</span>
        <strong>${money(item.price * item.qty)}</strong>
      </div>`).join("");

    openModal(`
      <div class="kicker">Checkout</div>
      <h2 id="modalTitle">Finish your <span class="red">order.</span></h2>
      <p class="modal-sub">Enter your Minecraft username, copy the order and finish it in a Discord ticket. No payment is taken on this site.</p>
      <div class="checkout-summary">
        ${lines}
        <div class="checkout-total"><span>Total</span><strong>${money(cartSubtotal())}</strong></div>
      </div>
      <form class="checkout-form" id="checkoutForm" novalidate>
        <label class="field">
          <span>Minecraft username</span>
          <input id="mcName" name="mcName" type="text" maxlength="16" placeholder="Your exact IGN" required autocomplete="username" spellcheck="false">
        </label>
        <p class="error-text" id="checkoutError" hidden></p>
        <button class="btn btn-primary btn-block" type="submit" data-sound="click">Copy order &amp; open Discord <span class="arrow" aria-hidden="true">↗</span></button>
      </form>
      <div class="checkout-note">Use your exact Java username — staff can't deliver to a typo.</div>
      <p class="fine">This storefront doesn't process payments. Your IGN and order are sent to the staff Discord log; payment and delivery happen in a ticket at discord.gg/outlawsmp.</p>
    `);

    const form = $("#checkoutForm");
    if (form) form.addEventListener("submit", handleCheckoutSubmit);
    window.setTimeout(() => $("#mcName")?.focus(), 90);
  }

  function handleCheckoutSubmit(event) {
    event.preventDefault();
    const input = $("#mcName");
    const error = $("#checkoutError");
    const username = input.value.trim();

    if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
      if (error) {
        error.hidden = false;
        error.textContent = "Enter a valid Java username: 3–16 letters, numbers or underscores.";
      }
      input.focus();
      sound.play("error");
      return;
    }

    if (checkoutInFlight) return;
    checkoutInFlight = true;

    const ref = createOrderRef();
    const order = buildOrder(username, ref);
    let logResult;
    logOrderToDiscord(username, ref).then((logged) => {
      logResult = logged;
      setOrderLogStatus(logged);
    });
    const discordWindow = window.open(DISCORD, "_blank", "noopener");

    copyText(order)
      .then(() => {
        // The order is safely copied — empty the cart so a refresh or a second
        // click can't accidentally submit the same order twice.
        cart = [];
        saveCart();
        renderCart();
        if (cartIsOpen) {
          modalTrigger = cartOpenBtn;
          closeCart();
        }
        showCheckoutSuccess(order, true, ref);
        if (logResult !== undefined) setOrderLogStatus(logResult);
      })
      .catch(() => {
        showCheckoutSuccess(order, false, ref);
        if (logResult !== undefined) setOrderLogStatus(logResult);
      });

    if (!discordWindow) {
      toast("Popup blocked — use the Open Discord button after copying.");
    }
    sound.play("success");
  }

  function setOrderLogStatus(logged) {
    const status = $("#orderLogStatus");
    if (!status) return;
    status.textContent = logged
      ? "Order log sent to staff Discord."
      : "Couldn't send the order log — paste the order in your ticket instead.";
  }

  function showCheckoutSuccess(order, copied, ref) {
    openModal(`
      <div class="checkout-success">
        <div class="success-mark" aria-hidden="true">✓</div>
        <div class="kicker" style="justify-content:center">Order ready</div>
        <h2 id="modalTitle">${copied ? "Order <span class=\"red\">copied.</span>" : "Copy your <span class=\"red\">order.</span>"}</h2>
        <p>${copied
          ? "Your order is on the clipboard and Discord should be open in a new tab. Paste it into a ticket to finish up."
          : "Copy the order below, then paste it into a ticket in the Discord."}</p>
        <div class="order-box">${escapeHtml(order)}</div>
        <div class="modal-actions" style="justify-content:center">
          <a class="btn btn-discord" href="${DISCORD}" target="_blank" rel="noopener" data-sound="click">Open Discord</a>
          <button class="btn btn-ghost" type="button" id="copyOrderBtn" data-sound="click">Copy again</button>
          <button class="btn btn-ghost" type="button" id="backToStore" data-sound="click">Back to store</button>
        </div>
        <p class="fine">Order ${escapeHtml(ref)} · Not paid yet — staff will confirm the total and payment method in your ticket.</p>
        <p class="fine" id="orderLogStatus">Sending order log to staff Discord…</p>
      </div>
    `);

    $("#copyOrderBtn")?.addEventListener("click", () => {
      copyText(order)
        .then(() => toast("Order copied again."))
        .catch(() => toast("Couldn't copy automatically — select the order text and copy it."));
    });
    $("#backToStore")?.addEventListener("click", closeModal);
  }

  /* ---------------------------------------------------------
     Delegated shop actions
     --------------------------------------------------------- */
  document.addEventListener("click", (event) => {
    const rankButton = event.target.closest("[data-add-rank]");
    if (rankButton) {
      const rankKey = rankButton.dataset.addRank;
      const picker = $(`[data-key-picker="${rankKey}"]`);
      const keys = picker
        ? $$(".key-chip.is-on", picker).map((chip) => chip.dataset.key)
        : RANKS[rankKey]?.defaultKeys || [];
      addRank(rankKey, keys);
      return;
    }

    const crateButton = event.target.closest("[data-add-crate]");
    if (crateButton) {
      addCrate(crateButton.dataset.addCrate);
      if (modalIsOpen) closeModal();
      return;
    }

    const previewButton = event.target.closest("[data-preview]");
    if (previewButton) {
      openCratePreview(previewButton.dataset.preview);
      return;
    }

    const lightboxButton = event.target.closest("[data-lightbox]");
    if (lightboxButton) {
      openLightbox(lightboxButton.dataset.lightbox, lightboxButton.dataset.lightboxTitle || "Kit preview");
      return;
    }

    const keyChip = event.target.closest(".key-chip");
    if (keyChip) {
      const picker = keyChip.closest("[data-key-picker]");
      const chips = $$(".key-chip", picker);
      const active = chips.filter((chip) => chip.classList.contains("is-on"));
      if (keyChip.classList.contains("is-on")) {
        keyChip.classList.remove("is-on");
        keyChip.setAttribute("aria-pressed", "false");
      } else {
        if (active.length >= 2) {
          toast("2 keys max — deselect one first.");
          sound.play("error");
          return;
        }
        keyChip.classList.add("is-on");
        keyChip.setAttribute("aria-pressed", "true");
      }
      const count = chips.filter((chip) => chip.classList.contains("is-on")).length;
      const countEl = $(".key-count", picker);
      if (countEl) countEl.textContent = `${count}/2`;
    }
  });

  /* ---------------------------------------------------------
     Mobile navigation
     --------------------------------------------------------- */
  const mobileNav = $("#mobileNav");
  const menuBtn = $("#menuBtn");
  const mobileNavClose = $("#mobileNavClose");

  function openMobileNav() {
    if (navIsOpen) return;
    navIsOpen = true;
    window.clearTimeout(navCloseTimer);
    mobileNav.hidden = false;
    mobileNav.setAttribute("aria-hidden", "false");
    menuBtn.setAttribute("aria-expanded", "true");
    window.requestAnimationFrame(() => mobileNav.classList.add("is-open"));
    syncBodyLock();
    window.setTimeout(() => mobileNavClose.focus(), 60);
  }

  function closeMobileNav() {
    if (!navIsOpen) return;
    navIsOpen = false;
    mobileNav.classList.remove("is-open");
    mobileNav.setAttribute("aria-hidden", "true");
    menuBtn.setAttribute("aria-expanded", "false");
    syncBodyLock();
    navCloseTimer = window.setTimeout(() => {
      if (!navIsOpen) mobileNav.hidden = true;
    }, 300);
    menuBtn.focus();
  }

  menuBtn.addEventListener("click", () => {
    if (navIsOpen) closeMobileNav();
    else openMobileNav();
  });
  mobileNavClose.addEventListener("click", closeMobileNav);
  mobileNav.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMobileNav();
  });

  /* ---------------------------------------------------------
     Sound toggle
     --------------------------------------------------------- */
  const soundToggle = $("#soundToggle");
  function syncSoundUI() {
    const enabled = sound.isEnabled();
    soundToggle.classList.toggle("is-muted", !enabled);
    soundToggle.setAttribute("aria-pressed", String(enabled));
    soundToggle.title = enabled ? "Sound on — click to mute" : "Sound off — click to enable";
  }
  syncSoundUI();
  soundToggle.addEventListener("click", () => {
    sound.toggle();
    syncSoundUI();
    toast(sound.isEnabled() ? "Sound on." : "Sound off.");
  });

  /* ---------------------------------------------------------
     Reviews — real submissions only
     --------------------------------------------------------- */
  const REVIEW_KEY = "outlaw_reviews_v1";
  let reviews = storage.get(REVIEW_KEY, []);
  if (!Array.isArray(reviews)) reviews = [];
  reviews = reviews
    .filter((review) =>
      review &&
      typeof review.name === "string" &&
      typeof review.text === "string" &&
      Number.isInteger(review.rating) &&
      review.rating >= 1 &&
      review.rating <= 5
    )
    .slice(0, 60);

  const reviewsList = $("#reviewsList");
  const avgRating = $("#avgRating");
  const avgStars = $("#avgStars");
  const reviewCount = $("#reviewCount");
  const reviewForm = $("#reviewForm");
  const reviewOpen = $("#reviewOpen");
  const starInput = $("#starInput");
  const starButtons = $$("[data-star]", starInput);
  let formRating = 0;

  function starString(rating) {
    return "★".repeat(rating) + "☆".repeat(5 - rating);
  }

  function formatReviewDate(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function renderReviews() {
    reviewsList.textContent = "";

    if (reviews.length === 0) {
      const empty = document.createElement("div");
      empty.className = "reviews-empty";
      empty.innerHTML = `
        <div class="empty-cards" aria-hidden="true">A♦ Q♠</div>
        <h3>No vouches yet.</h3>
        <p>Be the first to leave a review for Outlaw SMP.</p>`;
      reviewsList.appendChild(empty);
      avgRating.textContent = "—";
      avgStars.textContent = "☆☆☆☆☆";
      reviewCount.textContent = "No reviews yet";
      return;
    }

    const average = reviews.reduce((total, review) => total + review.rating, 0) / reviews.length;
    avgRating.textContent = average.toFixed(1);
    avgStars.textContent = starString(Math.round(average));
    reviewCount.textContent = `${reviews.length} review${reviews.length === 1 ? "" : "s"}`;

    reviews.forEach((review) => {
      const card = document.createElement("article");
      card.className = "review-card";

      const top = document.createElement("div");
      top.className = "review-top";

      const user = document.createElement("div");
      user.className = "review-user";

      const avatar = document.createElement("div");
      avatar.className = "avatar";
      avatar.textContent = review.name.trim().charAt(0).toUpperCase() || "?";

      const identity = document.createElement("div");
      const name = document.createElement("span");
      name.className = "review-name";
      name.textContent = review.name;
      const date = document.createElement("span");
      date.className = "review-date";
      date.textContent = formatReviewDate(review.date);
      identity.append(name, date);
      user.append(avatar, identity);

      const stars = document.createElement("div");
      stars.className = "review-stars";
      stars.textContent = starString(review.rating);
      stars.setAttribute("aria-label", `${review.rating} out of 5 stars`);

      top.append(user, stars);
      const text = document.createElement("p");
      text.className = "review-text";
      text.textContent = review.text;
      card.append(top, text);
      reviewsList.appendChild(card);
    });

    if (reviews.length > 3) {
      const more = document.createElement("button");
      more.type = "button";
      more.className = "link-btn reviews-more";
      more.dataset.sound = "click";
      more.textContent = `Show all ${reviews.length} reviews`;
      more.addEventListener("click", () => {
        const expanded = reviewsList.classList.toggle("expanded");
        more.textContent = expanded ? "Show fewer reviews" : `Show all ${reviews.length} reviews`;
      });
      reviewsList.appendChild(more);
    }
  }

  function syncStars() {
    starButtons.forEach((button, index) => {
      const active = index < formRating;
      button.classList.toggle("is-on", active);
      button.setAttribute("aria-checked", index + 1 === formRating ? "true" : "false");
    });
  }

  function openReviewForm() {
    reviewForm.hidden = false;
    formRating = 0;
    syncStars();
    reviewForm.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    window.setTimeout(() => $("#reviewName")?.focus(), reducedMotion ? 0 : 350);
  }

  function closeReviewForm() {
    reviewForm.hidden = true;
    reviewForm.reset();
    formRating = 0;
    syncStars();
  }

  reviewOpen.addEventListener("click", openReviewForm);
  $("#reviewCancel").addEventListener("click", closeReviewForm);
  $("#reviewCancel2").addEventListener("click", closeReviewForm);
  reviewForm.noValidate = true;

  starButtons.forEach((button) => {
    button.addEventListener("click", () => {
      formRating = Number(button.dataset.star);
      syncStars();
    });
  });

  reviewForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const nameInput = $("#reviewName");
    const textInput = $("#reviewText");
    const name = nameInput.value.trim();
    const text = textInput.value.trim();

    if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) {
      toast("Use a valid MC username: 3–16 letters, numbers or underscores.");
      nameInput.focus();
      sound.play("error");
      return;
    }
    if (!formRating) {
      toast("Pick a star rating first.");
      sound.play("error");
      return;
    }
    if (text.length < 3) {
      toast("Add a few words to your review.");
      textInput.focus();
      sound.play("error");
      return;
    }

    reviews.unshift({
      id: makeId(),
      name,
      rating: formRating,
      text: text.slice(0, 140),
      date: Date.now()
    });
    reviews = reviews.slice(0, 60);
    storage.set(REVIEW_KEY, reviews);
    renderReviews();
    closeReviewForm();
    toast("Review posted — thanks for the vouch.");
    sound.play("success");
  });

  renderReviews();

  /* ---------------------------------------------------------
     Focus trap + escape handling
     --------------------------------------------------------- */
  function activeOverlay() {
    if (modalIsOpen) return modal;
    if (cartIsOpen) return cartDrawer;
    if (navIsOpen) return mobileNav;
    return null;
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (modalIsOpen) { closeModal(); return; }
      if (cartIsOpen) { closeCart(); return; }
      if (navIsOpen) { closeMobileNav(); return; }
    }

    if (event.key !== "Tab") return;
    const overlay = activeOverlay();
    if (!overlay) return;
    const focusable = $$('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])', overlay)
      .filter((el) => el.getClientRects().length > 0);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  /* ---------------------------------------------------------
     Start
     --------------------------------------------------------- */
  renderCart();
  updateCartTotals();
})();
