(function () {

  if (window.__robotRunning) {
    alert("Robô já ativo");
    return;
  }

  let START_LABEL = "iniciar";
  let STOP_LABEL = "parar";

  window.addEventListener("message", (e) => {

    if (!e.data) return;

    if (e.data.type === "CONFIG") {
      START_LABEL = (e.data.startText || "iniciar").toLowerCase();
      STOP_LABEL = (e.data.stopText || "parar").toLowerCase();

      console.log("Config recebida:", START_LABEL, STOP_LABEL);
    }
  });


  let ignoreNextChange = false;
  window.addEventListener("message", (e) => {

    if (e.data?.type === "START_ROBOT") {
      ignoreNextChange = true;
    }

  });

  window.__robotRunning = true;

  /* =========================
     COMUNICAÇÃO COM O PWA
  ========================= */

  function send(type, data = {}) {
    if (window.opener) {
      window.opener.postMessage({ type, ...data }, "*");
    }
  }

  /* =========================
     CAPTURA DE SALDO
  ========================= */

  function extractBalance() {

    const el = [...document.querySelectorAll("div,span")]
      .find(el => /^\$\d{1,3}(,\d{3})*\.\d{2}$/.test(el.innerText?.trim()));

    if (!el) return null;

    return parseFloat(
      el.innerText.replace("$", "").replace(/,/g, "")
    );
  }

  /* =========================
     ENVIA SALDO INICIAL
  ========================= */

  let initCandidate = null;
  let initTimer = null;
  let initialSent = false;

  function waitInitialBalance() {

    const interval = setInterval(() => {

      if (initialSent) {
        clearInterval(interval);
        return;
      }

      const balance = parseFloat(extractBalance().toFixed(2));
      if (balance == null) return;

      // saldo mudou → reinicia contagem
      if (balance !== initCandidate) {
        initCandidate = balance;

        if (initTimer) clearTimeout(initTimer);

        initTimer = setTimeout(() => {
          initialSent = true;
          lastKnownBalance = balance;

          console.log("Saldo inicial estável:", balance);
          send("BALANCE", { value: balance });

        }, 3000); // saldo parado por 3s = sem operação aberta
      }

    }, 400);
  }

  waitInitialBalance();

  /* =========================
     DETECÇÃO DE RESULTADO
  ========================= */

  let lastResultId = null;

  function getResultNotification() {

    const items = [...document.querySelectorAll("div,span")];

    return items.find(el => {
      const t = el.innerText?.toLowerCase() || "";
      return (
        t.includes("lucro") ||
        t.includes("perda") ||
        t.includes("ganhou") ||
        t.includes("perdeu")
      );
    });

  }

  /* =========================
     DETECÇÃO POR VARIAÇÃO DE SALDO (VERSÃO ESTÁVEL)
  ========================= */

  let lastProcessedBalance = null;
  let lastResultTime = 0;

  const MIN_OPERATION_INTERVAL = 45000; // 45s proteção
  const MIN_VALID_CHANGE = 0.01; // evita micro variação

  function monitorBalanceChange() {

    const balance = extractBalance();
    if (balance == null) return;

    const now = Date.now();

    // Primeira leitura
    if (lastProcessedBalance === null) {
      lastProcessedBalance = balance;
      return;
    }

    const diff = parseFloat((balance - lastProcessedBalance).toFixed(2));

    // Saldo não mudou
    if (Math.abs(diff) < MIN_VALID_CHANGE) return;

    // Proteção contra duplicação rápida
    if (now - lastResultTime < MIN_OPERATION_INTERVAL) {
      return;
    }

    let result = "DRAW";

    if (diff > 0) result = "WIN";
    if (diff < 0) result = "LOSS";

    console.log("Operação confirmada:", result, balance);

    lastProcessedBalance = balance;
    lastResultTime = now;

    send("RESULT", {
      result,
      balance: balance
    });

  }

  setInterval(monitorBalanceChange, 350);

  /* =========================
     FUNÇÕES DE CLIQUE
  ========================= */

  function clickButtonByText(text) {
    const btn = [...document.querySelectorAll("button")]
      .find(b => b.innerText.trim().toLowerCase().includes(text));

    if (!btn) return false;

    btn.click();
    return true;
  }

  function confirmModal() {
    setTimeout(() => {
      clickButtonByText("confirm") || clickButtonByText("sim") || clickButtonByText("ok") || clickButtonByText("yes");
    }, 900);
  }

  function startRobot() {
    console.log("Tentando iniciar robô...");

    function tryStart() {
      if (!clickButtonByText(START_LABEL)) {
        setTimeout(tryStart, 700);
        return;
      }

      confirmModal();

      // RESET DE CONTROLE
      const current = extractBalance();
      if (current != null) {
        lastProcessedBalance = current;
        lastResultTime = Date.now();
      }
    }

    tryStart();
  }

  function stopRobot() {
    console.log("Tentando parar robô...");

    if (clickButtonByText(STOP_LABEL)) {
      confirmModal();
    }
  }

  /* =========================
     RECEBER COMANDOS DO PWA
  ========================= */

  window.addEventListener("message", (e) => {

    if (!e.data) return;

    if (e.data.type === "START_ROBOT") {
      console.log("Recebi START");
      startRobot();
    }

    if (e.data.type === "STOP") {
      console.log("Recebi STOP");
      stopRobot();
    }

    if (e.data.type === "PING") {
      send("PONG");
    }

  });

  /* ========================= */

  alert("Monitoramento inteligente ativo");

})();