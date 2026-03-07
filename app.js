let currentBalance = 0;
let initialBalance = null;
let restartCountdown = null;
let restartInterval = null;
let running = false;
let robotWindow = null;
let timerInterval = null;
let winStreak = 0;
let lossStreak = 0;
let endTime = null;
let manualStop = false;
let autoRestartEnabled = false;
let lastRobotActivity = Date.now();
let restarting = false;
let robotOperating = false;
let watchdogInterval = null;
let lastOperationTime = Date.now();
const favoriteCode = `javascript:(()=>{let s=document.createElement("script");s.src="https://marcos-dev.github.io/olymp-bot/public/robot.js?"+Date.now();document.body.appendChild(s)})();`;
const btnCopy = document.getElementById("btnCopyFavorite");

btnCopy.addEventListener("click", copyFavoriteCode);

//Botão voltar para configurações
document.getElementById("btn-back").addEventListener("click", () => {

    if (window.stopManual) {
        stopManual("Usuário retornou para configurações");
    }

    stopMonitoringUi();
});


window.addEventListener("load", () => {

    const savedEnd = Number(localStorage.getItem("robotEndTime"));

    if (savedEnd && savedEnd > Date.now()) {
        endTime = savedEnd;
        running = true;
        timerInterval = setInterval(updateTimerUI, 1000);
    }

});

document.getElementById("btnCopyFavorite")
    .addEventListener("click", copyFavoriteCode);

// Comunicação com o robot.js via mensagens
window.addEventListener("message", (e) => {
    if (!e.data) return;

    if (e.data.type === "BALANCE") {

        currentBalance = e.data.value;
        initialBalance = e.data.value;

        running = true;

        const cfg = JSON.parse(localStorage.getItem("robotConfig") || "{}");

        robotWindow.postMessage({
            type: "CONFIG",
            startText: cfg.startText,
            stopText: cfg.stopText
        }, "*");

        robotWindow.postMessage({
            type: "CHECK_ROBOT_STATE"
        }, "*");

        log('Sessão iniciada' + " | " + currentBalance.toFixed(2));

        startRobotUi();
        iniciarTimer();
        atualizarUI();

        // Verificar condições de parada após cada resultado
        checkStopConditions();
    }

    if (e.data.type === "ROBOT_STATE") {

        robotOperating = e.data.running;
        
        startRobotUi();

        if (running) {
            console.log("Robô já estava em execução");
        } else {
            console.log("Robô parado");
        }

    }

    if (e.data.type === "RESULT") {

        lastOperationTime = Date.now();
        robotOperating = true;

        if (initialBalance === null && manualStop === false) {
            startNewSession(e.data.balance);
        }

        currentBalance = e.data.balance;

        lastRobotActivity = Date.now();

        if (e.data.result === "LOSS") {
            lossStreak++;
            winStreak = 0;
        } else if (e.data.result === "WIN") {
            winStreak++;
            lossStreak = 0;
        }

        atualizarUI(); // Garantir que a interface atualize após o resultado

        // Exibir log do resultado
        log(e.data.result + " | " + currentBalance.toFixed(2));

        // Verificar condições de parada após cada resultado
        checkStopConditions();
    }



});

setInterval(() => {
    if (robotWindow) {
        robotWindow.postMessage({
            type: "CHECK_ROBOT_STATE"
        }, "*");
    }
}, 3000);

//watchdog
// WATCHDOG — parada de segurança
setInterval(() => {

    if (!robotOperating) return;

    const idle = Date.now() - lastRobotActivity;

    if (idle > 920000) {  // 15 minutos

        log("⛔ Robô sem atividade detectada");
        robotOperating = false;

        stopRobot("Perda de comunicação", "desconexao");
    }

}, 3000);




function startNewSession(balance) {

    initialBalance = balance;
    currentBalance = balance;

    log("Nova sessão iniciada | Saldo: $" + balance.toFixed(2));

    atualizarUI();
}

// Função para abrir a plataforma
function abrirPlataforma() {

    const cfg = JSON.parse(localStorage.getItem("robotConfig") || "{}");

    if (!cfg.platformUrl) {
        alert("Configure a URL da plataforma");
        return;
    }

    robotWindow = window.open(cfg.platformUrl, "robotWindow");

    if (!robotWindow) {
        alert("Permita popups para usar o robô");
        return;
    }

}



function copyFavoriteCode() {

    navigator.clipboard.writeText(favoriteCode)
        .then(() => {

            btnCopy.classList.add("copied");
            btnCopy.textContent = "✓ Copiado";

            setTimeout(() => {
                btnCopy.classList.remove("copied");
                btnCopy.textContent = "Copiar código do Favorito";
            }, 2000);

        })
        .catch(() => {
            btnCopy.textContent = "Erro ao copiar";

            setTimeout(() => {
                btnCopy.textContent = "Copiar código do Favorito";
            }, 2000);
        });
}
function resetTimer() {
    endTime = null;
    if (timerInterval) clearInterval(timerInterval);
}

function startRestartTimer(minutes) {

    const box = document.getElementById("restartTimerBox");
    const label = document.getElementById("restartTimer");

    let remaining = minutes * 60;

    box.classList.remove("hidden");

    if (restartInterval) clearInterval(restartInterval);

    restartInterval = setInterval(() => {

        const m = String(Math.floor(remaining / 60)).padStart(2, '0');
        const s = String(remaining % 60).padStart(2, '0');

        label.innerText = `${m}:${s}`;

        remaining--;

        if (remaining < 0) {

            clearInterval(restartInterval);
            box.classList.add("hidden");

        }

    }, 1000);
}

// Função para iniciar o timer (mantém no robot.js)
function iniciarTimer() {

    const cfg = JSON.parse(localStorage.getItem("robotConfig") || "{}");

    if (!cfg.time || cfg.time.trim() === "00:00:00") {
        document.getElementById("timeLeft").classList.add("hidden"); // esconde o timer;
        return;
    }

    document.getElementById("timeLeft").classList.remove("hidden"); // mostra o timer;

    const { h, m, s } = parseTimeString(cfg.time);

    const duration = (h * 3600 + m * 60 + s) * 1000;

    if (duration <= 0) return;

    endTime = Date.now() + duration;

    localStorage.setItem("robotEndTime", endTime);

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(updateTimerUI, 1000);
}

function parseTimeString(timeStr) {

    if (!timeStr) return { h: 0, m: 0, s: 0 };

    const parts = timeStr.split(":").map(Number);

    if (parts.length === 3) {
        return { h: parts[0], m: parts[1], s: parts[2] };
    }

    if (parts.length === 2) {
        return { h: parts[0], m: parts[1], s: 0 }; // ← CORREÇÃO
    }

    return { h: 0, m: 0, s: 0 };
}

// Verificar as condições de parada
function checkStopConditions() {

    if (!running) return;

    const cfg = JSON.parse(localStorage.getItem("robotConfig") || "{}");

    // --- STOP POR SALDO LUCRO ---
    if (cfg.lucro && currentBalance >= cfg.lucro) {
        stopRobot("Stop Win atingido", "saldo");
        return;
    }


    // --- STOP POR SALDO PERDAS ---
    if (cfg.valor && currentBalance <= cfg.valor) {
        stopRobot("Stop Loss atingido", "saldo");
        return;
    }

    // --- STOP LOSS POR VITORIAS ---
    if (cfg.vitorias && winStreak >= cfg.vitorias) {
        stopRobot("Máximo de vitórias seguidas atingido", "vitorias");
        winStreak = 0;
        lossStreak = 0;
        atualizarUI();
        return;

    }

    // --- STOP LOSS POR PERDAS ---
    if (cfg.perdas && lossStreak >= cfg.perdas) {
        stopRobot("Máximo de perdas", "perdas");
        winStreak = 0;
        lossStreak = 0;
        atualizarUI();
        return;
    }
}

function startMonitoring() {
    // Salva as configurações
    saveConfig();

    startMonitoringUi();
    atualizarUI();
}

function startRobot() {

    robotOperating = true;
    running = true;  // ← começa aqui
    lastRobotActivity = Date.now();
    startWatchdog();
    lastOperationTime = Date.now();

    winStreak = 0;
    lossStreak = 0;

    robotWindow.postMessage({
        type: "START_ROBOT"
    }, "*");


    startRobotUi();
    iniciarTimer();
}

function restartRobot() {


    if (!robotWindow || robotWindow.closed) {
        log("Janela fechada — não é possível reiniciar");
        return;
    }

    if (restartInterval) clearInterval(restartInterval);


    const box = document.getElementById("restartTimerBox");
    if (box) box.classList.add("hidden");

    // força sincronização de saldo
    initialBalance = currentBalance;


    log("♻️ Reiniciando robô");

    robotOperating = true;   // ← começa aqui
    lastRobotActivity = Date.now();

    atualizarUI();
    robotWindow.postMessage({
        type: "START_ROBOT"
    }, "*");


    startRobotUi();
    iniciarTimer();
}



// Parar o robô (envia mensagem ao robot.js)
function stopRobot(reason, stopType) {

    running = false;
    robotOperating = false;
    log("🚨 " + reason);

    stopRobotUi();

    if (robotWindow && !robotWindow.closed) {
        robotWindow.postMessage({ type: "STOP" }, "*");
    }

    if (watchdogInterval) {
        clearInterval(watchdogInterval);
    }

    // DESCONEXÃO NUNCA reinicia
    if (stopType === "desconexao") {
        log("Aguardando ação do usuário...");
        return;
    }


    const cfg = JSON.parse(localStorage.getItem("robotConfig") || "{}");

    const allowRestart =
        // (stopType === "saldo" && cfg.restart?.saldo) ||
        (stopType === "vitorias" && cfg.restart?.vitorias) ||
        (stopType === "perdas" && cfg.restart?.perdas) ||
        (stopType === "tempo" && cfg.restart?.tempo);

    if (allowRestart) {

        let delayMinutes = 0;

        if (stopType === "vitorias") {
            delayMinutes = cfg.restartDelay?.vitorias || 0;
        }

        if (stopType === "perdas") {
            delayMinutes = cfg.restartDelay?.perdas || 0;
        }

        if (stopType === "tempo") {
            delayMinutes = cfg.restartDelay?.tempo || 0;
        }

        if (delayMinutes > 0) {

            const delayMs = delayMinutes * 60000;

            log("⏳ Reinício automático em " + delayMinutes + " minuto(s)");

            startRestartTimer(delayMinutes);

            setTimeout(() => {

                log("🔄 Reiniciando robô...");
                restartRobot();

            }, delayMs);

        } else {

            log("🔄 Reinício automático imediato");
            setTimeout(restartRobot, 3000);

        }
    }

    running = true;

    clearInterval(timerInterval);
    localStorage.removeItem("robotEndTime");
}


function stopManual(reason) {
    manualStop = true;
    allowRestart = false; // Impede reinício automático após parada manual
    stopRobot(reason ? reason : "Parado pelo usuário", false);
    resetTimer(); // Permitir reiniciar manualmente após parar
}


function startWatchdog() {

    const MAX_IDLE_TIME = 180000; // 3 minutos

    if (watchdogInterval) clearInterval(watchdogInterval);

    watchdogInterval = setInterval(() => {

        if (!running) return;

        const now = Date.now();
        const diff = now - lastOperationTime;

        if (diff > MAX_IDLE_TIME) {

            log("⚠️ Possível travamento detectado");

            log("🔄 Reiniciando robô automaticamente");

            stopRobot("Watchdog parado", "watchdog");

            // setTimeout(() => {
            //     restartRobot();

            // }, 4000);

            // setTimeout(() => {
            //     stopRobot("Watchdog parado", "watchdog");

            // }, 9000);
        }

    }, 10000);

}