// Referências aos elementos
const balanceInput = document.getElementById('balanceValue');
const lossInput = document.getElementById('lossValue');
const timeInput = document.getElementById('timeValue');
const saveButton = document.getElementById('btn-save');
const resetButton = document.getElementById('btn-reset');
const openButton = document.querySelector('.btn-open');
const timeLeftEl = document.getElementById('timeLeft');
const balanceEl = document.getElementById('balance');
const currentBalanceEl = document.getElementById('currentBalance');
const currentProfitEl = document.getElementById('currentProfit');
const logEl = document.getElementById('log');
const platformUrl = document.getElementById('platformUrl');
const startText = document.getElementById('startText');
const stopText = document.getElementById('stopText');
const restartSaldo = document.getElementById('restartSaldo');
const restartPerdas = document.getElementById('restartPerdas');
const restartTempo = document.getElementById('restartTempo');

// Função para abrir a plataforma
function abrirPlataforma() {

    const cfg = JSON.parse(localStorage.getItem("robotConfig") || "{}");

    if (!cfg.platformUrl) {
        alert("Configure a URL da plataforma");
        return;
    }

    robotWindow = window.open(cfg.platformUrl, "_blank");

    if (!robotWindow) {
        alert("Permita popups para usar o robô");
        return;
    }

}

document.addEventListener("DOMContentLoaded", () => {

    const balanceInput = document.getElementById("balanceValue");
    setupMoneyInput(balanceInput);

});

document.getElementById("clearLogBtn")?.addEventListener("click", () => {
    const log = document.getElementById("log");
    if (!log) return;

    log.innerHTML = "";
});


// Carrega as configurações ao iniciar
function carregarConfiguracoes() {
    const config = JSON.parse(localStorage.getItem('robotConfig'));
    if (config) {

        document.getElementById('balanceValue').value =
            config.valor != null
                ? config.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                : '';

        lossInput.value = config.perdas || '';
        timeInput.value = config.time || '';
        platformUrl.value = config.platformUrl || "";
        startText.value = config.startText || "Iniciar robô";
        stopText.value = config.stopText || "Parar robô";

        restartSaldo.checked = config.restart?.saldo ?? false;
        restartPerdas.checked = config.restart?.perdas ?? false;
        restartTempo.checked = config.restart?.tempo ?? false;


    }
}

// Salva as configurações no localStorage
function saveConfig() {
    const criteriosSelecionados = Array.from(document.querySelectorAll('input[name="criterio"]:checked'))
        .map(cb => cb.value);

    const config = {
        criterios: criteriosSelecionados,
        valor: parseCurrencyBR(balanceInput.value),
        perdas: parseInt(lossInput.value),
        time: timeInput.value,
        platformUrl: document.getElementById('platformUrl').value,
        startText: document.getElementById('startText').value,
        stopText: document.getElementById('stopText').value,

        restart: {
            saldo: restartSaldo.checked,
            perdas: restartPerdas.checked,
            tempo: restartTempo.checked
        }
    };

    localStorage.setItem('robotConfig', JSON.stringify(config));
}



// Função para resetar as configurações
function resetConfig() {
    localStorage.removeItem('robotConfig');
    document.querySelectorAll('input[name="criterio"]').forEach(cb => cb.checked = false);
    balanceInput.value = '';
    lossInput.value = '';
    timeInput.value = '';
    platformUrl.value = '';
    startText.value = 'Iniciar robô';
    stopText.value = 'Parar robô';
    restartSaldo.checked = false;
    restartPerdas.checked = false;
    restartTempo.checked = false;

    alert('Configurações resetadas!');
}

function formatCurrencyBR(value) {

    value = value.replace(/\D/g, "");

    if (!value) return "";

    value = (parseInt(value) / 100).toFixed(2);

    return value
        .replace(".", ",")
        .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseCurrencyBR(value) {

    if (!value) return 0;

    return parseFloat(
        value.replace(/\./g, "").replace(",", ".")
    ) || 0;
}

function setupMoneyInput(input) {

    input.addEventListener("input", () => {
        const cursor = input.selectionStart;
        input.value = formatCurrencyBR(input.value);
        input.setSelectionRange(cursor, cursor);
    });

    input.addEventListener("blur", () => {
        if (input.value === "") input.value = "0,00";
    });
}

// Atualiza os dados da UI quando recebe saldo ou resultados
function atualizarUI() {

    if (currentBalance === null) return;
    currentBalanceEl.innerText = currentBalance.toFixed(2);
    if (initialBalance !== null) {

        balanceEl.innerText = initialBalance.toFixed(2);
        const lucro = currentBalance - initialBalance;
        currentProfitEl.innerText = lucro.toFixed(2);
        currentProfitEl.style.color = lucro >= 0 ? "limegreen" : "red";

        const config = JSON.parse(localStorage.getItem('robotConfig'));

        document.querySelector("#winStreak").innerText = winStreak + '/' + (config.vitorias || '-');
        document.querySelector("#lossStreak").innerText = lossStreak + '/' + (config.perdas || '-');
    }
}

function updateTimerUI() {

    if (!endTime) return;

    const diff = endTime - Date.now();

    if (diff <= 0) {
        document.getElementById("timeLeft").innerText = "00:00:00";
        stopRobot("Tempo limite atingido", "tempo");
        return;
    }

    const totalSec = Math.floor(diff / 1000);
    const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');

    document.getElementById("timeLeft").innerText = `${h}:${m}:${s}`;
}


function startRobotUi() {

    // Oculta as seções de configuração e logs
    document.querySelector('.init-section').classList.add('hidden');

    // Exibe a seção de status e logs
    document.querySelector('.status-section').classList.remove('hidden');
    document.querySelector('.log-section').classList.remove('hidden');


    // Esconde botão de start e mostra o de stop
    document.getElementById('btn-stop').classList.remove('hidden');
    document.getElementById('btn-start').classList.add('hidden');

}

function stopRobotUi() {


    // Esconde botão de stop e mostra o de start
    document.getElementById('btn-start').classList.remove('hidden');
    document.getElementById('btn-stop').classList.add('hidden');
}


function startMonitoringUi() {

    // Esconde a tela de configuração e mostra o painel de monitoramento
    document.getElementById('configScreen').classList.add('hidden');
    document.getElementById('monitorScreen').classList.remove('hidden');

    // Adicione um fade-in ou outra animação (por exemplo, uma classe que aplica a transição)
    document.getElementById('monitorScreen').classList.add('fade-in');

    document.querySelector('.back-btn').classList.remove('hidden');
    document.querySelector('.app-header').classList.add('display-flex');
    document.querySelector('.app-title').textContent = "Monitoramento"; 

    document.getElementById('targetBalance').innerText = parseCurrencyBR(document.getElementById('balanceValue').value).toLocaleString('pt-BR', { minimumFractionDigits: 2 }); 

}

function stopMonitoringUi() {
    // Esconde a tela de configuração e mostra o painel de monitoramento
    document.getElementById('configScreen').classList.remove('hidden');
    document.getElementById('monitorScreen').classList.add('hidden');

    // Adicione um fade-in ou outra animação (por exemplo, uma classe que aplica a transição)
    document.getElementById('configScreen').classList.add('fade-in');

    document.getElementById('btn-stop').classList.add('hidden');
    document.getElementById('btn-start').classList.remove('hidden');

    //esconde botão voltar
    document.querySelector('.back-btn').classList.add('hidden');
    document.querySelector('.app-header').classList.remove('display-flex');
    document.querySelector('.app-title').textContent = "Configuração";
    
}

//Exibe logs

function log(msg) {

    const el = document.getElementById("log");
    if (!el) return;

    const line = document.createElement("div");
    line.textContent = msg;
    el.appendChild(line);

    // mantém no máximo 200 linhas
    while (el.children.length > 200) {
        el.removeChild(el.firstChild);
    }

    el.scrollTop = el.scrollHeight;
}

// Outros eventos
saveButton.addEventListener('click', saveConfig);
resetButton.addEventListener('click', resetConfig);
openButton.addEventListener('click', abrirPlataforma);
// Carrega configurações ao iniciar a página
document.addEventListener('DOMContentLoaded', carregarConfiguracoes);
