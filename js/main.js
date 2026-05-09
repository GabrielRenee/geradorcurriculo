/**
 * Gerenciador do Gerador de Currículo PDF
 * Vanilla JS, ES6+
 */

// ==========================================
// ESTADO GLOBAL (Sincronizado com LocalStorage)
// ==========================================
const DEFAULT_STATE = {
    template: 'moderno',
    sidebarColor: '#2b3a4a',
    photo: null, // Base64
    personal: {
        name: '',
        email: '',
        phone: '',
        location: '',
        linkedin: ''
    },
    summary: '',
    education: [],
    experience: [],
    skills: []
};

let storedState;
try {
    storedState = JSON.parse(localStorage.getItem('resumeState'));
} catch(e) {
    storedState = null;
}

// Deep merge com DEFAULT_STATE para garantir que nenhuma propriedade fique faltando
let appState = storedState ? { 
    ...DEFAULT_STATE, 
    ...storedState, 
    personal: { ...DEFAULT_STATE.personal, ...(storedState.personal || {}) } 
} : JSON.parse(JSON.stringify(DEFAULT_STATE));

// Utilitário de segurança (XSS / Quebra de layout)
function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag]));
}

/**
 * Calcula a cor de contraste (preto ou branco) baseada na cor de fundo
 */
function getContrastColor(hexColor) {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#111827' : '#ffffff'; // Dark grey ou White
}

function saveState() {
    localStorage.setItem('resumeState', JSON.stringify(appState));
    renderPreview();
}

// ==========================================
// INICIALIZAÇÃO & EVENTOS DOM
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initForm();
    initZoomControls();
    initImageUpload();
    renderPreview();
    
    // Clear data
    document.getElementById('btn-clear-data').addEventListener('click', () => {
        if(confirm('Tem certeza que deseja limpar todos os dados?')) {
            localStorage.removeItem('resumeState');
            appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
            location.reload(); // Recarrega para limpar form facilmente
        }
    });

    // Generate PDF
    document.getElementById('btn-generate-pdf').addEventListener('click', generatePDF);
});

// ==========================================
// LÓGICA DO FORMULÁRIO
// ==========================================
function initForm() {
    const form = document.getElementById('resume-form');
    
    // Configura Template e Cor
    const templateSelect = document.getElementById('template-select');
    const colorGroup = document.getElementById('color-picker-group');
    const colorInput = document.getElementById('input-color');

    templateSelect.value = appState.template;
    colorInput.value = appState.sidebarColor || '#2b3a4a';
    colorGroup.style.display = appState.template === 'moderno' ? 'flex' : 'none';

    templateSelect.addEventListener('change', (e) => {
        appState.template = e.target.value;
        colorGroup.style.display = e.target.value === 'moderno' ? 'flex' : 'none';
        saveState();
    });

    colorInput.addEventListener('input', (e) => {
        appState.sidebarColor = e.target.value;
        saveState();
    });

    // Popula Dados Pessoais
    const personalInputs = ['name', 'email', 'phone', 'location', 'linkedin'];
    personalInputs.forEach(field => {
        const input = document.getElementById(`input-${field}`);
        input.value = appState.personal[field];
        input.addEventListener('input', (e) => {
            appState.personal[field] = e.target.value;
            validateField(input);
            saveState();
        });
    });

    // Resumo
    const summaryInput = document.getElementById('input-summary');
    summaryInput.value = appState.summary;
    summaryInput.addEventListener('input', (e) => {
        appState.summary = e.target.value;
        validateField(summaryInput);
        saveState();
    });

    // Skills
    const skillInput = document.getElementById('input-skill');
    const btnAddSkill = document.getElementById('btn-add-skill');
    
    const addSkill = () => {
        const val = skillInput.value.trim();
        if (val && !appState.skills.includes(val)) {
            appState.skills.push(val);
            skillInput.value = '';
            renderSkillsForm();
            saveState();
        }
    };
    btnAddSkill.addEventListener('click', addSkill);
    skillInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSkill();
        }
    });
    renderSkillsForm();

    // Dinâmicos (Edu / Exp)
    document.getElementById('btn-add-education').addEventListener('click', () => addDynamicItem('education'));
    document.getElementById('btn-add-experience').addEventListener('click', () => addDynamicItem('experience'));

    renderDynamicItems('education');
    renderDynamicItems('experience');
}

// Validação Inline
function validateField(input) {
    // Ignora elementos que não são de entrada (como botões)
    if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(input.tagName)) return true;

    const isValid = input.checkValidity();
    const group = input.closest('.input-group');
    
    if (group) {
        if (isValid) {
            group.classList.remove('invalid');
        } else {
            group.classList.add('invalid');
        }
    }
    return isValid;
}

function checkFormValidity() {
    const form = document.getElementById('resume-form');
    // Valida todos os elementos de entrada do formulário
    const inputs = Array.from(form.querySelectorAll('input, textarea, select'));
    const allValid = inputs.every(el => validateField(el));

    if (!allValid) {
        alert('Alguns campos estão vazios ou com formato inválido (verifique os itens marcados em vermelho).');
        
        // Focar no primeiro campo inválido para melhorar a UX
        const firstInvalid = inputs.find(el => !el.checkValidity());
        if (firstInvalid) firstInvalid.focus();
    }
    return allValid;
}

// --- Listas Dinâmicas ---
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function addDynamicItem(type) {
    const item = type === 'education' ? 
        { id: generateId(), course: '', institution: '', start: '', end: '' } :
        { id: generateId(), role: '', company: '', period: '', description: '' };
    
    appState[type].push(item);
    renderDynamicItems(type);
    saveState();
}

function removeDynamicItem(type, id) {
    appState[type] = appState[type].filter(item => item.id !== id);
    renderDynamicItems(type);
    saveState();
}

function renderDynamicItems(type) {
    const container = document.getElementById(`${type}-container`);
    container.innerHTML = '';
    
    appState[type].forEach((item, index) => {
        const template = document.getElementById(`tpl-${type}-form`);
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.dynamic-card');
        card.dataset.id = item.id;
        
        // Remove button
        clone.querySelector('.btn-remove-card').addEventListener('click', () => removeDynamicItem(type, item.id));
        
        // Inputs Bind
        if (type === 'education') {
            bindDynamicInput(clone, '.edu-course', item, 'course', type, index);
            bindDynamicInput(clone, '.edu-institution', item, 'institution', type, index);
            bindDynamicInput(clone, '.edu-start', item, 'start', type, index);
            bindDynamicInput(clone, '.edu-end', item, 'end', type, index);
        } else {
            bindDynamicInput(clone, '.exp-role', item, 'role', type, index);
            bindDynamicInput(clone, '.exp-company', item, 'company', type, index);
            bindDynamicInput(clone, '.exp-period', item, 'period', type, index);
            bindDynamicInput(clone, '.exp-description', item, 'description', type, index);
        }
        
        container.appendChild(clone);
    });
}

function bindDynamicInput(clone, selector, item, field, type, index) {
    const input = clone.querySelector(selector);
    input.value = item[field];
    input.addEventListener('input', (e) => {
        appState[type][index][field] = e.target.value;
        validateField(input);
        saveState();
    });
}

function renderSkillsForm() {
    const container = document.getElementById('skills-container');
    container.innerHTML = '';
    appState.skills.forEach((skill, index) => {
        const span = document.createElement('span');
        span.className = 'skill-tag';
        span.textContent = skill;
        span.addEventListener('click', () => {
            appState.skills.splice(index, 1);
            renderSkillsForm();
            saveState();
        });
        container.appendChild(span);
    });
}

// ==========================================
// UPLOAD DE IMAGEM
// ==========================================
function initImageUpload() {
    const input = document.getElementById('photo-upload');
    const previewImg = document.getElementById('photo-preview-img');
    const previewText = document.getElementById('photo-preview-text');
    const btnRemove = document.getElementById('btn-remove-photo');

    const updateUI = () => {
        if (appState.photo) {
            previewImg.src = appState.photo;
            previewImg.style.display = 'block';
            previewText.style.display = 'none';
            btnRemove.style.display = 'block';
        } else {
            previewImg.src = '';
            previewImg.style.display = 'none';
            previewText.style.display = 'block';
            btnRemove.style.display = 'none';
            input.value = '';
        }
    };

    updateUI(); // load from state

    input.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validar tamanho (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 2MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            // Comprimir imagem para evitar LocalStorage overflow
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                // Redimensionar para max 300x300
                const MAX_SIZE = 300;
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                const base64 = canvas.toDataURL('image/jpeg', 0.8);
                appState.photo = base64;
                updateUI();
                saveState();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    btnRemove.addEventListener('click', () => {
        appState.photo = null;
        updateUI();
        saveState();
    });
}

// ==========================================
// PREVIEW ENGINE
// ==========================================
let currentZoom = 1;

function initZoomControls() {
    const previewPage = document.getElementById('resume-preview');
    const zoomText = document.getElementById('zoom-level');
    
    // Scale para caber na tela inicialmente (geralmente menor que A4 real no navegador)
    const wrapper = document.querySelector('.resume-wrapper');
    const a4HeightPx = 297 * 3.7795275591; // approx mm to px
    if (wrapper.clientHeight < a4HeightPx) {
        currentZoom = (wrapper.clientHeight - 80) / a4HeightPx;
        if(currentZoom < 0.3) currentZoom = 0.3;
    }

    const applyZoom = () => {
        previewPage.style.transform = `scale(${currentZoom})`;
        zoomText.textContent = `${Math.round(currentZoom * 100)}%`;
    };

    document.getElementById('btn-zoom-in').addEventListener('click', () => {
        if(currentZoom < 2) currentZoom += 0.1;
        applyZoom();
    });

    document.getElementById('btn-zoom-out').addEventListener('click', () => {
        if(currentZoom > 0.3) currentZoom -= 0.1;
        applyZoom();
    });

    applyZoom();
}

function renderPreview() {
    const preview = document.getElementById('resume-preview');
    
    // Trocar classe do template
    preview.className = `resume-page template-${appState.template}`;
    
    // Renderiza HTML dependendo do template
    if (appState.template === 'moderno') {
        preview.innerHTML = renderModernTemplate();
    } else {
        preview.innerHTML = renderClassicTemplate();
    }
}

function renderModernTemplate() {
    const p = appState.personal;
    const sidebarBg = appState.sidebarColor || '#2b3a4a';
    const sidebarText = getContrastColor(sidebarBg);
    const labelColor = sidebarText === '#ffffff' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
    const badgeBg = sidebarText === '#ffffff' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
    const badgeBorder = sidebarText === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';
    
    return `
        <aside class="resume-sidebar" style="background-color: ${escapeHTML(sidebarBg)}; color: ${sidebarText};">
            ${appState.photo ? `<img src="${appState.photo}" class="profile-pic" alt="Foto de Perfil" style="border-color: ${sidebarText}">` : ''}
            
            <div class="contact-info">
                <h3 class="contact-label-sidebar" style="color: ${labelColor}">Contato</h3>
                ${p.email ? `<div class="contact-item"><span class="contact-label" style="color: ${labelColor}">Email</span>${escapeHTML(p.email)}</div>` : ''}
                ${p.phone ? `<div class="contact-item"><span class="contact-label" style="color: ${labelColor}">Telefone</span>${escapeHTML(p.phone)}</div>` : ''}
                ${p.location ? `<div class="contact-item"><span class="contact-label" style="color: ${labelColor}">Localização</span>${escapeHTML(p.location)}</div>` : ''}
                ${p.linkedin ? `<div class="contact-item"><span class="contact-label" style="color: ${labelColor}">LinkedIn</span>${escapeHTML(p.linkedin).replace('https://', '')}</div>` : ''}
            </div>

            <div class="skills-section ${appState.skills.length === 0 ? 'empty-section' : ''}">
                <h3 class="contact-label-sidebar" style="color: ${labelColor}">Habilidades</h3>
                <div class="skills-list">
                    ${appState.skills.map(s => `<span class="skill-badge" style="background: ${badgeBg}; border: 1px solid ${badgeBorder}">${escapeHTML(s)}</span>`).join('')}
                </div>
            </div>
        </aside>

        <main class="resume-main">
            <header class="resume-header-main">
                <h1 class="resume-name">${escapeHTML(p.name) || 'Seu Nome'}</h1>
                ${appState.experience.length > 0 ? `<div class="resume-role">${escapeHTML(appState.experience[0].role)}</div>` : ''}
                <div class="resume-summary">${escapeHTML(appState.summary) || 'Resumo profissional aparecerá aqui...'}</div>
            </header>

            <section class="resume-section ${appState.experience.length === 0 ? 'empty-section' : ''}">
                <h2 class="section-title">Experiência Profissional</h2>
                ${appState.experience.map(exp => `
                    <div class="item-block">
                        <div class="item-header">
                            <span class="item-title">${escapeHTML(exp.role) || 'Cargo'}</span>
                            <span class="item-date">${escapeHTML(exp.period) || ''}</span>
                        </div>
                        <div class="item-subtitle">${escapeHTML(exp.company) || 'Empresa'}</div>
                        <div class="item-desc">${exp.description ? escapeHTML(exp.description).replace(/\n/g, '<br>') : ''}</div>
                    </div>
                `).join('')}
            </section>

            <section class="resume-section ${appState.education.length === 0 ? 'empty-section' : ''}">
                <h2 class="section-title">Formação Acadêmica</h2>
                ${appState.education.map(edu => `
                    <div class="item-block">
                        <div class="item-header">
                            <span class="item-title">${escapeHTML(edu.course) || 'Curso'}</span>
                            <span class="item-date">${escapeHTML([edu.start, edu.end].filter(Boolean).join(' - '))}</span>
                        </div>
                        <div class="item-subtitle">${escapeHTML(edu.institution) || 'Instituição'}</div>
                    </div>
                `).join('')}
            </section>
        </main>
    `;
}

function renderClassicTemplate() {
    const p = appState.personal;
    
    return `
        <header class="resume-header">
            ${appState.photo ? `<img src="${appState.photo}" class="profile-pic" alt="Foto de Perfil">` : ''}
            <h1 class="resume-name">${escapeHTML(p.name) || 'Seu Nome'}</h1>
            <div class="contact-info">
                ${p.email ? `<div class="contact-item">${escapeHTML(p.email)}</div>` : ''}
                ${p.phone ? `<div class="contact-item">${escapeHTML(p.phone)}</div>` : ''}
                ${p.location ? `<div class="contact-item">${escapeHTML(p.location)}</div>` : ''}
                ${p.linkedin ? `<div class="contact-item">${escapeHTML(p.linkedin).replace('https://', '')}</div>` : ''}
            </div>
        </header>

        ${appState.summary ? `
            <section class="resume-section">
                <div class="resume-summary">${escapeHTML(appState.summary)}</div>
            </section>
        ` : ''}

        <section class="resume-section ${appState.experience.length === 0 ? 'empty-section' : ''}">
            <h2 class="section-title">Experiência Profissional</h2>
            ${appState.experience.map(exp => `
                <div class="item-block">
                    <div class="item-header">
                        <span class="item-title">${escapeHTML(exp.role) || 'Cargo'}</span>
                        <span class="item-date">${escapeHTML(exp.period) || ''}</span>
                    </div>
                    <div class="item-subtitle">${escapeHTML(exp.company) || 'Empresa'}</div>
                    <div class="item-desc">${exp.description ? escapeHTML(exp.description).replace(/\n/g, '<br>') : ''}</div>
                </div>
            `).join('')}
        </section>

        <section class="resume-section ${appState.education.length === 0 ? 'empty-section' : ''}">
            <h2 class="section-title">Formação Acadêmica</h2>
            ${appState.education.map(edu => `
                <div class="item-block">
                    <div class="item-header">
                        <span class="item-title">${escapeHTML(edu.course) || 'Curso'}</span>
                        <span class="item-date">${escapeHTML([edu.start, edu.end].filter(Boolean).join(' - '))}</span>
                    </div>
                    <div class="item-subtitle">${escapeHTML(edu.institution) || 'Instituição'}</div>
                </div>
            `).join('')}
        </section>

        <section class="resume-section ${appState.skills.length === 0 ? 'empty-section' : ''}">
            <h2 class="section-title">Habilidades</h2>
            <div class="skills-list">
                ${appState.skills.map(s => `<span class="skill-badge">${escapeHTML(s)}</span>`).join('')}
            </div>
        </section>
    `;
}

// ==========================================
// EXPORTAÇÃO DE PDF
// ==========================================
async function generatePDF() {
    if (!checkFormValidity()) return;

    const btn = document.getElementById('btn-generate-pdf');
    const originalText = btn.textContent;
    btn.textContent = 'Gerando PDF...';
    btn.disabled = true;

    try {
        // Obter elemento a ser capturado
        const element = document.getElementById('resume-preview');
        
        // 1. Armazenar estados originais e fixar elemento para captura perfeita (sem scroll clipping)
        const oldTransform = element.style.transform;
        const oldPosition = element.style.position;
        const oldTop = element.style.top;
        const oldLeft = element.style.left;
        const oldZIndex = element.style.zIndex;

        element.style.transform = 'none';
        element.style.position = 'fixed';
        element.style.top = '0';
        element.style.left = '0';
        element.style.zIndex = '-9999';
        
        // Pequeno atraso para o navegador aplicar o reflow
        await new Promise(r => setTimeout(r, 100));

        // 2. Capturar canvas com html2canvas
        const canvas = await html2canvas(element, {
            scale: 2, // Retina
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        // 3. Restaurar DOM original
        element.style.transform = oldTransform;
        element.style.position = oldPosition;
        element.style.top = oldTop;
        element.style.left = oldLeft;
        element.style.zIndex = oldZIndex;

        // 4. Iniciar jsPDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        // 5. Adicionar imagem capturada ao PDF
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        
        const pdfWidth = pdf.internal.pageSize.getWidth(); // 210
        const pdfHeight = pdf.internal.pageSize.getHeight(); // 297
        
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

        // 6. Download
        const userName = appState.personal.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'curriculo';
        pdf.save(`Curriculo_${userName}.pdf`);

    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        alert('Ocorreu um erro ao gerar o PDF. Verifique o console.');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}
