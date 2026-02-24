const URL_PLANILHA = 'https://script.google.com/macros/s/AKfycbwAq305kfDaU80H9N44FZZGtij67aeAhYq5FWQBe4WkANGvC4cYWTh8acjCxKDXEPDI/exec';

// --- VARIÁVEIS GLOBAIS DO DRAG & DROP ---
let colunaDeOrigem = null; 
let leadPerdidoAtual = null;
let cardPendente = null;
let containerPendente = null;

// 1. Carrega os leads originais da planilha
async function carregarKanban() {
    const board = document.querySelector('.kanban-board');
    const colunas = document.querySelectorAll('.kanban-column');
    
    colunas.forEach(col => col.style.display = 'none');
    
    const loaderHTML = `
        <div class="loader-container" id="kanban-loader" style="width: 100%; text-align: center; margin-top: 50px;">
            <div class="spinner" style="margin: 0 auto 20px;"></div>
            <p>Sincronizando Leads e carregando Funil...</p>
        </div>
    `;
    board.insertAdjacentHTML('afterbegin', loaderHTML);

    try {
        const response = await fetch(URL_PLANILHA);
        const leads = await response.json();

        const loaderEl = document.getElementById('kanban-loader');
        if (loaderEl) loaderEl.remove();
        
        colunas.forEach(col => col.style.display = 'flex');

        renderizarKanban(leads);
    } catch (error) {
        console.error('Erro ao carregar o Kanban:', error);
        document.getElementById('kanban-loader').innerHTML = `
            <p style="color: #ff5555; font-weight: bold;">Erro ao conectar com o banco de dados.</p>
        `;
    }
}

// 2. Renderiza os cards cruzando dados da Planilha com o LocalStorage
function renderizarKanban(leads) {
    document.querySelectorAll('.kanban-cards-container').forEach(container => {
        container.innerHTML = '';
        container.parentElement.querySelector('.badge').innerText = '0';
    });

    leads.forEach(lead => {
        const valorFormatado = (parseFloat(lead.Valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        // VERIFICA O LOCALSTORAGE PRIMEIRO!
        // Lê os dados salvos no navegador para esse telefone específico
        const dadosLocais = JSON.parse(localStorage.getItem(`kanban_${lead.Telefone}`)) || {};
        
        const processo = dadosLocais.processo || 'Novo'; // Se não tiver nada salvo, é Novo
        const motivo = dadosLocais.motivo || '';

        // Monta a caixa do motivo (se for Perdido e tiver motivo salvo)
        let htmlMotivo = '';
        if (processo === 'Perdido' && motivo) {
            htmlMotivo = `<div class="k-card-motivo" style="margin-top: 10px; padding: 8px; background: rgba(255,85,85,0.1); border-left: 3px solid #ff5555; font-size: 0.8rem; color: #ff5555; border-radius: 4px; word-wrap: break-word;">Motivo: ${motivo}</div>`;
        }

        const cardHTML = `
            <div class="k-card" draggable="true" data-telefone="${lead.Telefone}">
                <div class="k-card-header">
                    <span class="k-card-name">${lead.Nome}</span>
                    <span class="k-card-service">${lead.Serviço || lead.Servico || 'Geral'}</span>
                </div>
                ${htmlMotivo}
                <div class="k-card-footer">
                    <span>${lead.Telefone}</span>
                    <span style="color: #25D366; font-weight: 500;">${valorFormatado}</span>
                </div>
            </div>
        `;

        const containerDestino = document.querySelector(`.kanban-cards-container[data-processo="${processo}"]`);
        
        if (containerDestino) {
            containerDestino.insertAdjacentHTML('beforeend', cardHTML);
            const badge = containerDestino.parentElement.querySelector('.badge');
            badge.innerText = parseInt(badge.innerText) + 1;
        }
    });

    iniciarDragAndDrop();
}

// 3. Motor de Física do Kanban
function iniciarDragAndDrop() {
    const cards = document.querySelectorAll('.k-card');
    const containers = document.querySelectorAll('.kanban-cards-container');

    cards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('telefone', card.getAttribute('data-telefone'));
            card.classList.add('dragging');
            colunaDeOrigem = card.parentElement;
            setTimeout(() => card.style.opacity = '0.5', 0);
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            card.style.opacity = '1';
        });
    });

    containers.forEach(container => {
        container.addEventListener('dragover', (e) => {
            e.preventDefault(); 
            container.classList.add('drag-over');
        });

        container.addEventListener('dragleave', () => {
            container.classList.remove('drag-over');
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.classList.remove('drag-over');

            const telefoneId = e.dataTransfer.getData('telefone');
            const cardArrastado = document.querySelector(`.k-card[data-telefone="${telefoneId}"]`);
            
            if (cardArrastado && cardArrastado.parentElement !== container) {
                const novoProcesso = container.getAttribute('data-processo');
                
                if (novoProcesso === 'Perdido') {
                    // Prepara e abre o modal
                    leadPerdidoAtual = telefoneId;
                    cardPendente = cardArrastado;
                    containerPendente = container;
                    
                    document.getElementById('motivo-textarea').value = ''; 
                    document.getElementById('motivo-modal').classList.add('active');
                } else {
                    // Se o card foi resgatado da coluna "Perdidos" para outra, limpa o aviso vermelho
                    const avisoMotivo = cardArrastado.querySelector('.k-card-motivo');
                    if (avisoMotivo) avisoMotivo.remove();

                    // Anexa na nova coluna e salva localmente
                    container.appendChild(cardArrastado);
                    atualizarBadges();
                    salvarNovoProcesso(telefoneId, novoProcesso);
                }
            }
        });
    });
}

function atualizarBadges() {
    document.querySelectorAll('.kanban-column').forEach(coluna => {
        const quantidade = coluna.querySelectorAll('.k-card').length;
        coluna.querySelector('.badge').innerText = quantidade;
    });
}

// 4. FUNÇÕES DO MODAL DE PERDA E LOCALSTORAGE
function cancelarPerda() {
    document.getElementById('motivo-modal').classList.remove('active');
    if (colunaDeOrigem && cardPendente) {
        colunaDeOrigem.appendChild(cardPendente); // Volta para a coluna original
    }
}

function confirmarPerda() {
    const motivoText = document.getElementById('motivo-textarea').value;
    const btn = document.querySelector('#motivo-modal .btn-salvar');
    const textoOriginal = btn.innerText;
    
    btn.innerText = 'Salvando localmente...';
    btn.style.opacity = '0.7';

    // Cria o aviso vermelho visual no card
    if (motivoText.trim() !== '') {
        let motivoEl = cardPendente.querySelector('.k-card-motivo');
        if (!motivoEl) {
            motivoEl = document.createElement('div');
            motivoEl.className = 'k-card-motivo';
            motivoEl.style.cssText = 'margin-top: 10px; padding: 8px; background: rgba(255,85,85,0.1); border-left: 3px solid #ff5555; font-size: 0.8rem; color: #ff5555; border-radius: 4px; word-wrap: break-word;';
            const footer = cardPendente.querySelector('.k-card-footer');
            cardPendente.insertBefore(motivoEl, footer);
        }
        motivoEl.innerText = `Motivo: ${motivoText}`;
    }

    containerPendente.appendChild(cardPendente);
    atualizarBadges();
    
    // Salva no navegador com o motivo
    salvarNovoProcesso(leadPerdidoAtual, 'Perdido', motivoText);

    setTimeout(() => {
        document.getElementById('motivo-modal').classList.remove('active');
        btn.innerText = textoOriginal;
        btn.style.opacity = '1';
    }, 500);
}

// --- O SEGREDO ESTÁ AQUI: SALVAR NO LOCALSTORAGE ---
function salvarNovoProcesso(telefone, novoProcesso, motivoText = '') {
    // Cria um objeto com as informações do Kanban
    const dadosKanban = {
        processo: novoProcesso,
        motivo: motivoText
    };
    
    // Transforma em texto e salva no navegador
    localStorage.setItem(`kanban_${telefone}`, JSON.stringify(dadosKanban));
}

// Inicializa a página
carregarKanban();