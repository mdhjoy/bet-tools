(() => {
  const WIDGET_ID = 'live-quick-bet-topbar';
  if (window.self !== window.top || document.getElementById(WIDGET_ID)) return;

  let isEnabled = true;
  let soundEnabled = localStorage.getItem('qbi_sound') !== 'false';
  let acceptOddsEnabled = localStorage.getItem('qbi_accept_odds') !== 'false';
  let limitEnabled = localStorage.getItem('qbi_limit_on') === 'true';
  let maxBetLimit = parseInt(localStorage.getItem('qbi_max_limit') || '10', 10);
  let heldStake = localStorage.getItem('qbi_stake_val') || '100';
  let betCount = parseInt(localStorage.getItem('qbi_bet_count') || '0', 10);
  let isExecuting = false;

  function playSuccessBeep() {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  }

  // রেসপন্সিভ সিএসএস
  const style = document.createElement('style');
  style.innerHTML = `
    #${WIDGET_ID} {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      background: #0f172a !important;
      color: #ffffff !important;
      border-bottom: 2px solid #38bdf8 !important;
      display: flex !important;
      flex-wrap: wrap !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 6px 12px !important;
      box-sizing: border-box !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.8) !important;
      z-index: 2147483647 !important;
      font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif !important;
      user-select: none !important;
      gap: 6px !important;
    }
    .qbi-sec { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    @media (max-width: 600px) {
      #${WIDGET_ID} {
        flex-direction: column !important;
        align-items: stretch !important;
        padding: 8px !important;
      }
      .qbi-sec {
        justify-content: space-between !important;
        width: 100% !important;
      }
    }
  `;
  document.head.appendChild(style);

  const bar = document.createElement('div');
  bar.id = WIDGET_ID;

  bar.innerHTML = `
    <div class="qbi-sec">
      <span style="font-weight:bold; font-size:12px; color:#38bdf8;">⚡ FAST BET</span>
      <input type="text" id="qbi-stake-number" value="${heldStake}" placeholder="Stake" style="width:65px; padding:3px 4px; background:#1e293b; color:#38bdf8; border:1px solid #334155; border-radius:4px; font-size:12px; font-weight:bold; text-align:center; outline:none;" />
      <div style="display:flex; gap:3px;">
        <button class="qbi-preset-btn" data-val="100" style="background:#334155; color:#fff; border:none; border-radius:3px; padding:3px 6px; font-size:11px; cursor:pointer;">100</button>
        <button class="qbi-preset-btn" data-val="500" style="background:#334155; color:#fff; border:none; border-radius:3px; padding:3px 6px; font-size:11px; cursor:pointer;">500</button>
        <button class="qbi-preset-btn" data-val="1000" style="background:#334155; color:#fff; border:none; border-radius:3px; padding:3px 6px; font-size:11px; cursor:pointer;">1K</button>
        <button class="qbi-preset-btn" data-val="5000" style="background:#334155; color:#fff; border:none; border-radius:3px; padding:3px 6px; font-size:11px; cursor:pointer;">5K</button>
      </div>
    </div>

    <div class="qbi-sec" style="font-size:11px;">
      <label style="display:flex; align-items:center; gap:2px; cursor:pointer;">
        <input type="checkbox" id="qbi-toggle-sound" ${soundEnabled ? 'checked' : ''}> 🔔
      </label>
      <label style="display:flex; align-items:center; gap:2px; cursor:pointer;">
        <input type="checkbox" id="qbi-toggle-accept" ${acceptOddsEnabled ? 'checked' : ''}> ✅ Auto-Odds
      </label>
      <label style="display:flex; align-items:center; gap:2px; cursor:pointer;">
        <input type="checkbox" id="qbi-toggle-limit" ${limitEnabled ? 'checked' : ''}> 🛑 Limit
      </label>
      <input type="number" id="qbi-limit-val" value="${maxBetLimit}" style="width:36px; padding:2px; background:#1e293b; color:#fff; border:1px solid #334155; border-radius:3px; font-size:11px; text-align:center;" />
      <div id="qbi-bet-counter" title="Reset Count" style="background:#0284c7; padding:2px 6px; border-radius:8px; font-weight:bold; cursor:pointer;">
        Placed: <span id="qbi-count-num">${betCount}</span> ⟲
      </div>
    </div>

    <div class="qbi-sec" style="justify-content:flex-end;">
      <button id="qbi-status-toggle" style="padding:4px 10px; background:#16a34a; color:white; border:none; border-radius:4px; font-size:11px; font-weight:bold; cursor:pointer;">
        ACTIVE
      </button>
      <button id="qbi-close-ui" title="Close" style="background:none; border:none; color:#9ca3af; font-size:16px; cursor:pointer; line-height:1;">✕</button>
    </div>
  `;

  document.documentElement.appendChild(bar);

  const input = bar.querySelector('#qbi-stake-number');
  const toggle = bar.querySelector('#qbi-status-toggle');
  const soundCb = bar.querySelector('#qbi-toggle-sound');
  const acceptCb = bar.querySelector('#qbi-toggle-accept');
  const limitCb = bar.querySelector('#qbi-toggle-limit');
  const limitInp = bar.querySelector('#qbi-limit-val');
  const counterNum = bar.querySelector('#qbi-count-num');
  const counterBadge = bar.querySelector('#qbi-bet-counter');

  bar.querySelectorAll('.qbi-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      heldStake = btn.dataset.val;
      input.value = heldStake;
      localStorage.setItem('qbi_stake_val', heldStake);
    });
  });

  input.addEventListener('input', (e) => {
    heldStake = e.target.value.trim();
    localStorage.setItem('qbi_stake_val', heldStake);
  });

  soundCb.addEventListener('change', (e) => {
    soundEnabled = e.target.checked;
    localStorage.setItem('qbi_sound', soundEnabled);
  });

  acceptCb.addEventListener('change', (e) => {
    acceptOddsEnabled = e.target.checked;
    localStorage.setItem('qbi_accept_odds', acceptOddsEnabled);
  });

  limitCb.addEventListener('change', (e) => {
    limitEnabled = e.target.checked;
    localStorage.setItem('qbi_limit_on', limitEnabled);
  });

  limitInp.addEventListener('input', (e) => {
    maxBetLimit = parseInt(e.target.value || '10', 10);
    localStorage.setItem('qbi_max_limit', maxBetLimit);
  });

  counterBadge.addEventListener('click', () => {
    betCount = 0;
    counterNum.innerText = '0';
    localStorage.setItem('qbi_bet_count', '0');
  });

  toggle.addEventListener('click', () => {
    isEnabled = !isEnabled;
    toggle.innerText = isEnabled ? 'ACTIVE' : 'PAUSED';
    toggle.style.background = isEnabled ? '#16a34a' : '#64748b';
  });

  bar.querySelector('#qbi-close-ui').addEventListener('click', () => {
    isEnabled = false;
    bar.remove();
  });

  function setNativeInputValue(element, value) {
    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
      prototypeValueSetter.call(element, value);
    } else if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function executeStakeAndBet() {
    if (!isEnabled || !heldStake || isExecuting) return;

    if (limitEnabled && betCount >= maxBetLimit) {
      isEnabled = false;
      const toggle = document.querySelector('#qbi-status-toggle');
      if (toggle) {
        toggle.innerText = 'LIMIT REACHED';
        toggle.style.background = '#dc2626';
      }
      return;
    }

    const allButtons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], div[role="button"], a'));
    const placeBetBtn = allButtons.find(btn => {
      const txt = (btn.innerText || btn.value || '').trim().toLowerCase();
      return (txt.includes('place bet') || txt.includes('place bets')) && btn.offsetWidth > 0 && btn.offsetHeight > 0;
    });

    if (!placeBetBtn) return;

    const container = placeBetBtn.closest('form, tr, tbody, table, div[class*="slip"], div[class*="bet"], div[class*="market"], section') || placeBetBtn.parentElement.parentElement;

    if (acceptOddsEnabled) {
      const acceptCheckbox = container.querySelector('input[type="checkbox"]');
      if (acceptCheckbox && !acceptCheckbox.checked) {
        acceptCheckbox.click();
      }
    }

    const allInputs = Array.from(container.querySelectorAll('input[type="text"], input[type="number"], input:not([type="checkbox"]):not([type="hidden"])'));
    const targetInput = allInputs.find(inp => inp.offsetWidth > 0 && inp.offsetHeight > 0 && inp.id !== 'qbi-stake-number');

    if (targetInput && !targetInput.dataset.fastFilled) {
      isExecuting = true;
      targetInput.dataset.fastFilled = "true";

      targetInput.focus();
      setNativeInputValue(targetInput, heldStake);

      setTimeout(() => {
        if (isEnabled && !placeBetBtn.disabled) {
          placeBetBtn.click();
          betCount++;
          const cNum = document.querySelector('#qbi-count-num');
          if (cNum) cNum.innerText = betCount;
          localStorage.setItem('qbi_bet_count', betCount);
          playSuccessBeep();
        }
        setTimeout(() => {
          delete targetInput.dataset.fastFilled;
          isExecuting = false;
        }, 300);
      }, 50);
    }
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest(`#${WIDGET_ID}`)) return;
    setTimeout(executeStakeAndBet, 40);
  }, true);

  const observer = new MutationObserver(() => {
    if (!isExecuting && isEnabled) {
      executeStakeAndBet();
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
