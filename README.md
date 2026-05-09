# 📄 Gerador de Currículo PDF Pro

Um gerador de currículos profissional, rápido e elegante, construído inteiramente com **HTML5, CSS3 e JavaScript puro (Vanilla JS)**. Ideal para quem busca uma ferramenta simples e poderosa para criar currículos em PDF sem a necessidade de frameworks pesados.

![Preview do Projeto](https://raw.githubusercontent.com/sua-conta/seu-repo/main/preview.png) *(Substitua por uma imagem do seu projeto)*

## 🚀 Funcionalidades

- **Live Preview (A4):** Visualize as alterações no seu currículo em tempo real enquanto preenche os dados.
- **Exportação para PDF:** Gere um arquivo PDF de alta qualidade pronto para impressão ou envio.
- **Múltiplos Templates:**
    - **Moderno:** Design elegante com barra lateral colorida e tipografia sans-serif.
    - **Clássico:** Layout tradicional, focado em legibilidade e sobriedade (Serifado).
- **Personalização de Cores:** No modo moderno, escolha a cor da barra lateral que melhor combina com seu perfil.
- **Upload de Foto:** Adicione sua foto com compressão automática para garantir um arquivo leve.
- **Seções Dinâmicas:** Adicione quantas experiências profissionais e formações acadêmicas desejar.
- **Persistência Local:** Seus dados são salvos automaticamente no navegador (`localStorage`), permitindo que você continue de onde parou.
- **Design Responsivo:** Painel de preenchimento otimizado para diferentes tamanhos de tela.

## 🛠️ Tecnologias Utilizadas

- **Estrutura:** HTML5 Semântico.
- **Estilização:** CSS3 (Variáveis, Flexbox, Grid).
- **Lógica:** JavaScript ES6+ (Manipulação de DOM, State Management).
- **Bibliotecas Externas:**
    - [html2canvas](https://html2canvas.hertzen.com/) - Para capturar o preview do currículo.
    - [jsPDF](https://rawgit.com/MrRio/jsPDF/master/docs/index.html) - Para geração do arquivo PDF final.

## 📋 Como usar

1.  Clone este repositório ou baixe os arquivos.
2.  Abra o arquivo `index.html` em qualquer navegador moderno.
3.  Preencha seus dados pessoais, resumo e experiências.
4.  Escolha seu template favorito e ajuste as cores (se aplicável).
5.  Clique em **"Gerar PDF"** para baixar seu currículo profissional.

## 🛡️ Destaques Técnicos

- **Segurança contra XSS:** Sanitização automática de entradas de texto.
- **Contraste Inteligente:** O sistema detecta a cor da barra lateral e ajusta automaticamente a cor da fonte (preto ou branco) para garantir 100% de legibilidade.
- **Validação Nativa:** Uso de HTML5 Validation API para garantir que campos obrigatórios e formatos (e-mail, links) estejam corretos.

---
Desenvolvido por [Seu Nome] - [Seu LinkedIn](https://linkedin.com/in/seulinkedin)
