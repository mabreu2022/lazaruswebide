# Lazarus Web IDE - RAD Object Pascal Designer

Ambiente de Desenvolvimento Rápido de Aplicações (RAD) no navegador, inspirado no **Lazarus IDE** e **Delphi**, com suporte a **arrastar e soltar componentes**, **Object Inspector**, **geração de código Object Pascal** e **simulação interativa (F9)**.

---

## 🚀 Como Executar

O servidor de desenvolvimento já está pronto e em execução:

```bash
npm run dev
```

Acesse no seu navegador: **[http://localhost:5173/](http://localhost:5173/)**

---

## 🛠️ Principais Recursos Implementados

1. **Paleta de Componentes (Arrastar e Soltar):**
   * **Categorias:** Standard, Additional, Common Controls, Dialogs, Data Controls.
   * **21 Componentes VCL/LCL nativos:** `TButton`, `TLabel`, `TEdit`, `TMemo`, `TCheckBox`, `TRadioButton`, `TListBox`, `TComboBox`, `TScrollBar`, `TGroupBox`, `TRadioGroup`, `TPanel`, `TBitBtn`, `TSpeedButton`, `TImage`, `TShape`, `TBevel`, `TProgressBar`, `TTrackBar`, `TStatusBar`, `TPageControl`, `TOpenDialog`, `TSaveDialog`, `TDBGrid`.
   * **Arrastar e soltar direto:** Arraste o ícone da paleta para o formulário ou clique no componente para posicioná-lo.

2. **Form Designer Visual:**
   * Janela MDI estilizada com barra de título e controles de janela.
   * Grade de pontos pontilhada clássica com **Encaixe na Grade (Snap to Grid)** de 4px, 8px, 12px ou 16px.
   * **8 Handles de Redimensionamento** em torno do componente selecionado.
   * Tag de coordenadas e dimensões em tempo real (`X, Y, W, H`).
   * Menu de contexto com botão direito (Trazer para frente, Enviar para trás, Duplicar, Excluir, Ver Código).

3. **Object Inspector (Inspetor de Objetos):**
   * Seletor de componentes em cascata + Árvore hierárquica de componentes.
   * Aba de **Propriedades**: Name, Caption, Left, Top, Width, Height, Enabled, Visible, Color, Font, Align, Checked, etc., com sincronização bidirecional instantânea.
   * Aba de **Eventos**: `OnClick`, `OnDblClick`, `OnChange`, `OnCreate`, etc. Duplo clique cria a `procedure` e abre o editor de código.

4. **Editor de Código Pascal (Alternância com F12):**
   * Alternância imediata entre Formulário Visual e Código Pascal pressionando **F12**.
   * Realce de sintaxe Object Pascal autêntico (`unit`, `interface`, `implementation`, `uses`, `type`, `class`, `var`, `begin`, `end`).
   * Abas para visualizar `Unit1.pas`, `Unit1.lfm` (definição de formulário Lazarus) e `Project1.lpr`.
   * Inserção rápida de comandos como `ShowMessage(...)`.

5. **Simulador de Execução ao Vivo (F9):**
   * Pressione **F9** ou clique no botão verde para rodar o formulário!
   * Todos os controles tornam-se interativos (cliques, digitação, marcação de opções, seleções).
   * Executa scripts Pascal reais com dialog modal `ShowMessage('...')` e modificação dinâmica de propriedades.

6. **Modelos de Exemplo Rápidos:**
   * **Calculadora Visual:** Interface completa de calculadora com visor e botões.
   * **Tela de Login:** Formulário de autenticação com validação.
   * **Cadastro DBGrid:** Grade de dados com filtros e botões de ação.

7. **Exportação do Projeto:**
   * Download instantâneo dos arquivos `.pas`, `.lfm` e `.lpr` para compilar diretamente no Lazarus Desktop ou Pas2JS.
