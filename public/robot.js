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

    const regex = /^(?:R\$|\$)\s?\d+(?:,\d{3})*\.\d{2}$/;

    let el = [...document.querySelectorAll("div,span,h6")]
      .find(el => regex.test(el.innerText?.trim()));

    if (!el) return null;

    return parseFloat(
      el.innerText
        .replace("R$", "")
        .replace("$", "")
        .replace(/,/g, "")
        .trim()
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

      const extracted = extractBalance();

      if (typeof extracted !== "number" || isNaN(extracted)) {
        console.log("Saldo inválido, ignorando...");
        return;
      }

      const balance = Number(extracted.toFixed(2));

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
  let balanceCandidate = null;
  let balanceTimer = null;
  let processedBalances = new Set();

  let lastOperationTimestamp = 0;
  const MIN_OPERATION_INTERVAL = 60000; // 1 minuto

  function monitorBalanceChange() {

    const balance = extractBalance();
    if (balance == null) return;

    // Primeira leitura
    if (lastProcessedBalance === null) {
      lastProcessedBalance = balance;
      return;
    }

    if (balance !== balanceCandidate) {

      balanceCandidate = balance;

      if (balanceTimer) clearTimeout(balanceTimer);

      // Pequena confirmação de estabilidade (1.5s)
      balanceTimer = setTimeout(() => {

        const now = Date.now();

        // 🔒 BLOQUEIO DE INTERVALO MÍNIMO
        if (now - lastOperationTimestamp < MIN_OPERATION_INTERVAL) {
          console.log("Ignorado - dentro do intervalo mínimo");
          return;
        }

        // 🔒 Evita duplicidade de saldo
        if (processedBalances.has(balanceCandidate)) {
          console.log("Ignorado - saldo já processado");
          return;
        }

        if (balanceCandidate === lastProcessedBalance) {
          return;
        }

        const result =
          balanceCandidate > lastProcessedBalance ? "WIN" :
            balanceCandidate < lastProcessedBalance ? "LOSS" :
              "DRAW";

        lastProcessedBalance = balanceCandidate;
        processedBalances.add(balanceCandidate);
        lastOperationTimestamp = now;

        console.log("Operação confirmada:", result, balanceCandidate);

        send("RESULT", {
          result,
          balance: balanceCandidate
        });

        // Limita tamanho do Set
        if (processedBalances.size > 20) {
          processedBalances = new Set(
            Array.from(processedBalances).slice(-10)
          );
        }

      }, 1500);

    }
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