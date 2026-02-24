const URL_PLANILHA =
  'https://script.google.com/macros/s/AKfycbwAq305kfDaU80H9N44FZZGtij67aeAhYq5FWQBe4WkANGvC4cYWTh8acjCxKDXEPDI/exec';

// Objeto para impedir que o refresh automático sobrescreva o clique antes de salvar
let alteracoesTemporarias = {};

async function atualizarDashboard() {
  const container = document.querySelector('.leads-table');

  // 1. ESTADO DE CARREGAMENTO (LOADER)
  // Só mostra a animação se for a primeira vez carregando (tabela vazia)
  if (!document.querySelector('.lead-row')) {
    container.innerHTML = `
          <div class="loader-container">
              <div class="spinner"></div>
              <p>Sincronizando dados com o Google Sheets...</p>
          </div>
      `;

    // Coloca os cards em estado de "carregando"
    document.getElementById('total-leads').innerHTML =
      '<span class="loading-text">...</span>';
    document.getElementById('servico-principal').innerHTML =
      '<span class="loading-text">...</span>';
    document.getElementById('total-reunioes').innerHTML =
      '<span class="loading-text">...</span>';
  }

  try {
    const response = await fetch(URL_PLANILHA);
    const leads = await response.json();

    // 2. ATUALIZAR CARD: TOTAL DE LEADS
    document.getElementById('total-leads').innerText = leads.length;

    // 3. ATUALIZAR CARD: REUNIÕES FECHADAS
    const fechadosCount = leads.filter((l) => {
      const valorLocal = alteracoesTemporarias[l.Telefone];
      const valorFinal =
        valorLocal !== undefined ? valorLocal : l.ReuniaoFechada || '';
      const valor = String(valorFinal).toLowerCase();
      return valor === 'sim' || valor === 'true';
    }).length;
    document.getElementById('total-reunioes').innerText = fechadosCount;

    // 4. ATUALIZAR CARD: SERVIÇO PRINCIPAL (O MAIS FREQUENTE)
    // 4. ATUALIZAR CARD: SERVIÇO PRINCIPAL (O MAIS FREQUENTE)
    const contagemServicos = {};
    let servicoMaisFrequente = 'Nenhum';
    let maxContagem = 0;

    leads.forEach((lead) => {
      // Tenta pegar com 'ç' ou sem 'ç' (caso o Apps Script tenha removido o acento)
      const nomeOriginal = lead.Servico || lead.Servico;

      if (nomeOriginal && nomeOriginal.trim() !== '') {
        // Usa tudo em maiúsculo para a contagem não ser enganada por "Site" vs "site"
        let chaveContagem = nomeOriginal.trim().toUpperCase();

        contagemServicos[chaveContagem] =
          (contagemServicos[chaveContagem] || 0) + 1;

        if (contagemServicos[chaveContagem] > maxContagem) {
          maxContagem = contagemServicos[chaveContagem];
          // Guarda o nome original bonitinho (ex: "Landing Page") para mostrar na tela
          servicoMaisFrequente = nomeOriginal.trim();
        }
      }
    });

    document.getElementById('servico-principal').innerText =
      servicoMaisFrequente;

      // ... (depois do bloco do serviço principal) ...

    // 5. ATUALIZAR CARD: RECEITA TOTAL
    const receitaTotal = leads.reduce((acumulador, lead) => {
        // Converte o valor para número. Se estiver vazio ou inválido, soma 0.
        const valor = parseFloat(lead.Valor) || 0;
        return acumulador + valor;
    }, 0);

    // Formata lindamente para o padrão brasileiro (R$ 1.500,00)
    document.getElementById('receita-total').innerText = receitaTotal.toLocaleString('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
    });

    // 6. RENDERIZAR TABELA DE LEADS
    // container.innerHTML = ''; (aqui continua o seu código normal)

    // 5. RENDERIZAR TABELA DE LEADS
    container.innerHTML = ''; // Limpa o loader da tela

  leads.forEach((lead) => {
      // --- LÓGICA DO CHECKBOX (Memória Temporária) ---
      const valorLocal = alteracoesTemporarias[lead.Telefone];
      const estaFechado = valorLocal !== undefined 
        ? valorLocal === 'Sim' 
        : lead.ReuniaoFechada === 'Sim';

      // --- LÓGICA DO WHATSAPP (Tratamento do Número) ---
      let numeroLimpo = lead.Telefone ? String(lead.Telefone).replace(/\D/g, '') : '';
      if (numeroLimpo.length === 10 || numeroLimpo.length === 11) {
          numeroLimpo = '55' + numeroLimpo;
      }

      // --- MONTAGEM DO HTML ---
      const leadRow = `
        <div class="lead-row ${estaFechado ? 'row-closed' : ''}">
          
          <div class="lead-col name">
            <i class="icon-user">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </i> 
            <span style="flex-grow: 1;">${lead.Nome}</span>
            <button class="btn-nota-icon" title="Ver/Editar Notas" onclick="abrirModal('${lead.Telefone}', '${lead.Nome}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
          
          <div class="lead-col phone">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <a href="https://wa.me/${numeroLimpo}" target="_blank" class="whatsapp-link">
              ${lead.Telefone}
            </a>
          </div>

          <div class="lead-col service">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/>
            </svg>
            ${lead.Servico || lead.Serviço} 
            <span style="font-size: 0.7em; opacity: 0.5; margin-left: 8px;">[${lead.Nicho}]</span>
          </div>

          <div class="lead-col date">
            <i class="icon-calendar">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
            </i> 
            ${lead.DataHora}
          </div>

          <div class="lead-col">
            <div class="valor-container">
                <span style="font-size: 0.8rem; opacity: 0.6;">R$</span>
                <input type="number" 
                       class="input-valor" 
                       value="${lead.Valor || ''}" 
                       placeholder="0,00"
                       onchange="salvarValor('${lead.Telefone}', this.value, this)">
            </div>
          </div>

          <div class="lead-col check-col">
            <span style="font-size: 0.8rem; opacity: 0.6; margin-right: 10px;">Fechado</span>
            <label class="custom-checkbox">
                <input type="checkbox" ${estaFechado ? 'checked' : ''} 
                       onchange="toggleFechamento('${lead.Telefone}', this.checked, this)">
                <span class="checkmark" style="margin-right: 0;"></span>
            </label>
          </div>

        </div>
      `;
      container.insertAdjacentHTML('beforeend', leadRow);
    });
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    container.innerHTML = `<p style="text-align: center; color: #ff5555; padding: 40px;">Erro ao conectar com o banco de dados. Tente atualizar a página.</p>`;
  }
}

async function toggleFechamento(telefone, isChecked, elemento) {
  // 1. Memória temporária para manter o estado
  alteracoesTemporarias[telefone] = isChecked ? 'Sim' : 'Não';

  // 2. Feedback visual IMEDIATO no Card
  let reunioesElement = document.getElementById('total-reunioes');
  let currentCount = parseInt(reunioesElement.innerText) || 0;
  reunioesElement.innerText = isChecked
    ? currentCount + 1
    : Math.max(0, currentCount - 1);

  // 3. Feedback visual IMEDIATO na Linha (Borda Verde)
  if (elemento) {
    const linhaDoLead = elemento.closest('.lead-row');
    if (linhaDoLead) {
      if (isChecked) {
        linhaDoLead.classList.add('row-closed');
      } else {
        linhaDoLead.classList.remove('row-closed');
      }
    }
  }

  try {
    // Envia os dados silenciosamente
    await fetch(URL_PLANILHA, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefone: telefone, fechado: isChecked }),
    });

    // Apaga a memória temporária após 3 segundos
    setTimeout(() => {
      delete alteracoesTemporarias[telefone];
    }, 3000);
  } catch (error) {
    delete alteracoesTemporarias[telefone];
    console.error('Erro ao atualizar fechamento:', error);

    // Se a rede falhar, reverte a ação no visual
    if (elemento) {
      elemento.checked = !isChecked;
      const linhaDoLead = elemento.closest('.lead-row');
      if (linhaDoLead) {
        if (!isChecked) {
          linhaDoLead.classList.add('row-closed');
        } else {
          linhaDoLead.classList.remove('row-closed');
        }
      }
    }
  }
}

// Inicializa o Dashboard
atualizarDashboard();

// Atualização em background a cada 1 minuto (60000ms)
setInterval(atualizarDashboard, 60000);


async function salvarValor(telefone, novoValor, elemento) {
    // Feedback visual de "salvando"
    elemento.style.opacity = '0.5';

    try {
        await fetch(URL_PLANILHA, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telefone: telefone, valor: novoValor }),
        });

        // Feedback visual de sucesso (Pisca verde e volta ao normal)
        elemento.style.opacity = '1';
        elemento.style.borderColor = '#25D366';
        setTimeout(() => {
            elemento.style.borderColor = 'transparent';
        }, 1500);

        // Feedback visual de sucesso (Pisca verde e volta ao normal)
        elemento.style.opacity = '1';
        elemento.style.borderColor = '#25D366';
        setTimeout(() => {
            elemento.style.borderColor = 'transparent';
            // ATUALIZA O DASHBOARD PARA RECALCULAR A SOMA TOTAL
            atualizarDashboard(); 
        }, 1500);

    } catch (error) {
        console.error('Erro ao salvar valor:', error);
        // Feedback visual de erro (Pisca vermelho)
        elemento.style.opacity = '1';
        elemento.style.borderColor = '#ff5555';
    }
}



// --- LÓGICA DO MODAL DE NOTAS (LOCALSTORAGE) ---
let telefoneAtualModal = '';

function abrirModal(telefone, nome) {
    telefoneAtualModal = telefone;
    document.getElementById('modal-nome-lead').innerText = `Notas: ${nome}`;
    
    // Busca no navegador se já existe alguma nota para este telefone específico
    const notasSalvas = localStorage.getItem(`notas_${telefone}`) || '';
    document.getElementById('modal-textarea').value = notasSalvas;
    
    document.getElementById('notas-modal').classList.add('active');
}

function fecharModal() {
    document.getElementById('notas-modal').classList.remove('active');
}

function guardarNotas() {
    const novasNotas = document.getElementById('modal-textarea').value;
    const btn = document.getElementById('btn-salvar-notas');
    const textoOriginal = btn.innerText;
    
    // Salva instantaneamente no navegador do usuário
    localStorage.setItem(`notas_${telefoneAtualModal}`, novasNotas);

    // Feedback visual premium
    btn.innerText = 'Salvo no navegador!';
    btn.style.background = '#1ebd5a';
    btn.style.color = '#fff';
    
    setTimeout(() => {
        fecharModal();
        // Restaura o botão para a próxima vez
        btn.innerText = textoOriginal;
        btn.style.background = '#25D366';
        btn.style.color = '#000';
    }, 1200);
}