import { test, expect, type Page } from '@playwright/test';

async function placeFromPalette(page: Page, tab: string, label: string, x: number, y: number) {
  await page.locator('.palette-tab', { hasText: tab }).first().click({ force: true, timeout: 5000 });
  await page.locator('.palette-item-btn', { hasText: new RegExp(`^\\s*${label}\\s*$`) }).first().click({ force: true, timeout: 5000 });
  const canvas = page.locator('.form-client-area');
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + x, box.y + y);
}

test.beforeEach(async ({ page }) => {
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message, err.stack));
  await page.goto('/');
  await expect(page.locator('.form-client-area')).toBeVisible();
});

test('PageControl: abas não ficam aninhadas e é possível criar páginas pelo inspetor', async ({ page }) => {
  await placeFromPalette(page, 'Containers', 'PageControl', 200, 160);
  const tabs = page.locator('.page-tab');
  await expect(tabs).toHaveCount(2);

  // clicar em Página 2 e voltar para Página 1 não pode fazer a aba sumir
  await tabs.nth(1).click({ force: true, timeout: 5000 });
  await tabs.nth(0).click({ force: true, timeout: 5000 });
  await expect(tabs).toHaveCount(2);

  // propriedade Pages no Inspetor de Objetos
  await expect(page.locator('.pages-manager')).toBeVisible();
  await page.locator('.pages-actions button', { hasText: 'Nova Página' }).click({ force: true, timeout: 5000 });
  await expect(tabs).toHaveCount(3);

  // botão "+" do cabeçalho
  await page.locator('.add-tab-btn').dispatchEvent('click');
  await expect(tabs).toHaveCount(4);
});

test('Inspetor: propriedades em ordem alfabética', async ({ page }) => {
  await placeFromPalette(page, 'Standard', 'Button', 80, 80);
  const labels = await page.locator('.property-grid .prop-label-col span').allTextContents();
  expect(labels.length).toBeGreaterThan(3);
  const sorted = [...labels].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase(), 'pt-BR'));
  expect(labels).toEqual(sorted);
});

test('ZMemTable existe na aba Zeos / Firebird e expõe FieldDefs', async ({ page }) => {
  await placeFromPalette(page, 'Zeos', 'ZMemTable', 120, 120);
  await expect(page.locator('.property-grid .prop-label-col span', { hasText: 'FieldDefs' })).toBeVisible();
  await expect(page.locator('.property-grid textarea').first()).toBeVisible();
});

test('TScrollBox está na aba Containers', async ({ page }) => {
  await page.locator('.palette-tab', { hasText: 'Containers' }).first().click({ force: true, timeout: 5000 });
  await expect(page.locator('.palette-item-btn', { hasText: 'ScrollBox' })).toBeVisible();
});


test('Containers: componente solto no Panel vira filho, acompanha o pai e é excluído em cascata', async ({ page }) => {
  await placeFromPalette(page, 'Standard', 'Panel', 60, 60);
  const panel = page.locator('[data-comp-name="Panel1"]');
  await expect(panel).toHaveAttribute('data-is-container', 'true');
  const pBox = (await panel.boundingBox())!;

  // solta um Button dentro do Panel (clique na paleta + clique dentro do panel)
  await placeFromPalette(page, 'Standard', 'Button', 60 + 40, 60 + 40);
  const btn = page.locator('[data-comp-name="Button2"]');
  await expect(btn).toHaveAttribute('data-parent-id', /.+/);
  await expect(panel).toHaveAttribute('data-children', /.+/);

  // o botão fica visualmente dentro do panel
  const bBox = (await btn.boundingBox())!;
  expect(bBox.x).toBeGreaterThanOrEqual(pBox.x);
  expect(bBox.y).toBeGreaterThanOrEqual(pBox.y);
  expect(bBox.x + bBox.width).toBeLessThanOrEqual(pBox.x + pBox.width + 1);

  // arrastar o Panel move o botão junto (mesma distância)
  await panel.hover({ position: { x: 5, y: 5 } });
  await page.mouse.down();
  await page.mouse.move(pBox.x + 5 + 80, pBox.y + 5 + 50, { steps: 8 });
  await page.mouse.up();
  const bBox2 = (await btn.boundingBox())!;
  expect(Math.round(bBox2.x - bBox.x)).toBeGreaterThan(40);
  expect(Math.round(bBox2.y - bBox.y)).toBeGreaterThan(20);
  await expect(btn).toHaveAttribute('data-parent-id', /.+/);

  // com o Panel selecionado, o filho continua visivel (acima do pai)
  const cx = bBox2.x + bBox2.width / 2, cy = bBox2.y + bBox2.height / 2;
  const top = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('[data-comp-name]')?.getAttribute('data-comp-name'), [cx, cy]);
  expect(top).toBe('Button2');

  // excluir o Panel remove o botão (cascata)
  await panel.click({ position: { x: 5, y: 5 }, force: true });
  await page.keyboard.press('Delete');
  await expect(page.locator('[data-comp-name="Panel1"]')).toHaveCount(0);
  await expect(page.locator('[data-comp-name="Button2"]')).toHaveCount(0);
});

test('TImageList: existe em Common Controls, pode ser adicionado e inspecionado', async ({ page }) => {
  await placeFromPalette(page, 'Common Controls', 'ImageList', 120, 120);
  const imgList = page.locator('[data-comp-name="ImageList1"]');
  await expect(imgList).toBeVisible();
  await expect(imgList.locator('.imagelist-badge')).toHaveText('0 img');

  // Seleciona o ImageList e verifica propriedades no Inspetor
  await imgList.click();
  await expect(page.locator('.prop-label-col', { hasText: 'ImageWidth' })).toBeVisible();
  await expect(page.locator('.prop-label-col', { hasText: 'ImageHeight' })).toBeVisible();
  await expect(page.locator('.prop-label-col', { hasText: 'Images' })).toBeVisible();
});

test('Horse REST API: cria projeto Horse, visualiza código Pascal, executa servidor e testa requisição', async ({ page }) => {
  // 1. Abre menu Arquivo e clica em Servidor REST Horse
  await page.locator('.menu-btn', { hasText: 'Arquivo' }).click();
  await page.locator('.dropdown-action', { hasText: 'Servidor REST Horse' }).click();

  // 2. Editor de código deve estar aberto no .lpr
  await expect(page.locator('.lazarus-code-editor-view')).toBeVisible();
  const codeContent = await page.locator('.code-textarea').inputValue();
  expect(codeContent).toContain('Horse');
  expect(codeContent).toContain('THorse.Listen');

  // 3. Inspetor de Projetos deve exibir pacotes Horse
  await expect(page.locator('.leaf-name', { hasText: /^Horse$/ })).toBeVisible();
  await expect(page.locator('.leaf-name', { hasText: /^Horse-Jhonson$/ })).toBeVisible();

  // 4. Se alternar para aba Form (F12), deve mostrar o banner explicativo de aplicação backend/console
  await page.locator('.return-form-btn').click();
  await expect(page.locator('.console-project-empty-designer')).toBeVisible();
  await expect(page.locator('.console-designer-card h3')).toContainText('Servidor REST Horse');

  // 5. Clica no botão de executar servidor REST
  await page.locator('.console-designer-actions button', { hasText: 'Executar Servidor REST' }).click();

  // 6. Modal do Runner Interativo e Testador REST deve abrir
  await expect(page.locator('.horse-runner-window')).toBeVisible();
  await expect(page.locator('.horse-status-badge')).toHaveText('ONLINE');

  // Alterna para aba Console para checar logs do servidor FPC/Horse
  await page.locator('.horse-tab-btn', { hasText: 'Console' }).click();
  await expect(page.locator('.horse-terminal-screen')).toContainText('[Horse] Servidor HTTP escutando na porta 9000');
  await page.locator('.horse-tab-btn', { hasText: 'Testador' }).click();

  // 7. Testa envio de requisição GET /ping
  await page.locator('.send-request-btn').click();
  await expect(page.locator('.status-pill')).toHaveText(/200 OK/);
  await expect(page.locator('.response-body-pre')).toContainText('"pong"');

  // 8. Testa preset GET /clientes
  await page.locator('.preset-chip', { hasText: 'GET /clientes' }).click();
  await page.locator('.send-request-btn').click();
  await expect(page.locator('.status-pill')).toHaveText(/200 OK/);
  await expect(page.locator('.response-body-pre')).toContainText('Auto Peças Central');

  // 9. Fecha modal do servidor
  await page.locator('.horse-header-btn.close').click();
  await expect(page.locator('.horse-runner-window')).toHaveCount(0);
});

test('Console: cria projeto Console e valida código pascal padrão terminal', async ({ page }) => {
  // Abre menu Arquivo e clica em Aplicação Console
  await page.locator('.menu-btn', { hasText: 'Arquivo' }).click();
  await page.locator('.dropdown-action', { hasText: 'Aplicação Console' }).click();

  // Verifica código do .lpr
  await expect(page.locator('.lazarus-code-editor-view')).toBeVisible();
  const codeContent = await page.locator('.code-textarea').inputValue();
  expect(codeContent).toContain('program ConsoleApp;');
  expect(codeContent).toContain('Writeln');
  expect(codeContent).toContain('Readln');
});

test('Redimensionamento: splitter da área de mensagens estica painel com mouse e duplo clique redefine altura', async ({ page }) => {
  const dock = page.locator('.lazarus-bottom-dock');
  const splitter = page.locator('.bottom-dock-splitter');

  await expect(dock).toBeVisible();
  await expect(splitter).toBeVisible();

  // 1. Obtém altura inicial (padrão ~180px)
  const initialBox = await dock.boundingBox();
  expect(initialBox).not.toBeNull();
  expect(initialBox!.height).toBeGreaterThan(160);
  expect(initialBox!.height).toBeLessThan(210);

  // 2. Arrasta splitter para cima (esticar painel com o mouse)
  const splitterBox = await splitter.boundingBox();
  expect(splitterBox).not.toBeNull();

  await page.mouse.move(splitterBox!.x + splitterBox!.width / 2, splitterBox!.y + 2);
  await page.mouse.down();
  await page.mouse.move(splitterBox!.x + splitterBox!.width / 2, splitterBox!.y - 120);
  await page.mouse.up();

  // Verifica que a altura esticou com o mouse
  const expandedBox = await dock.boundingBox();
  expect(expandedBox).not.toBeNull();
  expect(expandedBox!.height).toBeGreaterThan(260);

  // 3. Duplo clique no splitter restaura para altura padrão (180px)
  await splitter.dblclick();
  await expect(dock).toHaveCSS('height', '180px');
});

test('Delphi Dock Pinning: desafixar e fixar janelas laterais com auto-hide e flyout', async ({ page }) => {
  // Limpa localStorage para garantir estado padrão pinned
  await page.evaluate(() => {
    localStorage.removeItem('lazarus_left_dock_pinned');
    localStorage.removeItem('lazarus_right_dock_pinned');
  });
  await page.reload();

  // 1. Inspetor de Objetos (Esquerda) inicia fixado
  const leftInspector = page.locator('.lazarus-object-inspector');
  await expect(leftInspector).toBeVisible();
  const leftPinBtn = leftInspector.locator('.pin-toggle-btn');
  await expect(leftPinBtn.locator('.pin-icon.pinned')).toBeVisible();

  // 2. Clica no botão de alfinete para desafixar (Auto-Hide)
  await leftPinBtn.click();

  // Barra vertical retrátil esquerda deve aparecer
  const leftTabStrip = page.locator('.delphi-side-tab-strip.left-tab-strip');
  await expect(leftTabStrip).toBeVisible();
  await expect(leftTabStrip).toContainText('Inspetor de Objetos');

  // 3. Clica na aba vertical retrátil para abrir Flyout flutuante
  await leftTabStrip.locator('.delphi-tab-strip-btn').click();
  const leftFlyout = page.locator('.delphi-dock-flyout.left-flyout');
  await expect(leftFlyout).toBeVisible();
  await expect(leftFlyout.locator('.lazarus-object-inspector')).toBeVisible();

  // 4. Clica no pin dentro do Flyout para refixar na grade principal
  await leftFlyout.locator('.pin-toggle-btn').click();
  await expect(page.locator('.delphi-dock-flyout.left-flyout')).toHaveCount(0);
  await expect(page.locator('.lazarus-object-inspector')).toBeVisible();

  // 5. Inspetor de Projetos (Direita) inicia fixado
  const rightDock = page.locator('.lazarus-right-dock-panel');
  await expect(rightDock).toBeVisible();
  const rightPinBtn = rightDock.locator('.pin-toggle-btn');
  await expect(rightPinBtn.locator('.pin-icon.pinned')).toBeVisible();

  // 6. Clica no pin do Inspetor de Projetos para desafixar
  await rightPinBtn.click();
  const rightTabStrip = page.locator('.delphi-side-tab-strip.right-tab-strip');
  await expect(rightTabStrip).toBeVisible();
  await expect(rightTabStrip).toContainText('Inspetor de Projetos');

  // 7. Clica na aba vertical para abrir o Flyout direito
  await rightTabStrip.locator('.delphi-tab-strip-btn').click();
  const rightFlyout = page.locator('.delphi-dock-flyout.right-flyout');
  await expect(rightFlyout).toBeVisible();

  // 8. Clica no pin dentro do Flyout direito para refixar
  await rightFlyout.locator('.pin-toggle-btn').click();
  await expect(page.locator('.delphi-dock-flyout.right-flyout')).toHaveCount(0);
  await expect(page.locator('.lazarus-right-dock-panel')).toBeVisible();
});

test('Deploy & Publicação: abre modal, compila, publica na nuvem da IDE com link público e testa exportação ZIP', async ({ page }) => {
  // 1. Abre o modal via botão na barra de ferramentas
  const deployBtn = page.locator('.deploy-toolbar-btn');
  await expect(deployBtn).toBeVisible();
  await deployBtn.click();

  // 2. Modal deve abrir com título e abas
  const modal = page.locator('.deploy-modal-container');
  await expect(modal).toBeVisible();
  await expect(modal.locator('.deploy-modal-title')).toHaveText('Deploy & Publicação da Aplicação');

  // 3. Verifica as 3 abas
  await expect(page.locator('.deploy-tab-btn', { hasText: 'Nuvem da IDE' })).toBeVisible();
  await expect(page.locator('.deploy-tab-btn', { hasText: 'Exportar Pacote (.ZIP)' })).toBeVisible();
  await expect(page.locator('.deploy-tab-btn', { hasText: 'Deploy Externo' })).toBeVisible();

  // 4. Executa compilação e publicação na Nuvem da IDE
  const startBtn = page.locator('.start-deploy-btn');
  await expect(startBtn).toBeVisible();
  await startBtn.click();

  // 5. Stepper deve completar até o passo 4
  await expect(page.locator('.step-item').nth(3)).toHaveClass(/done/);

  // 6. Card de sucesso deve exibir status e URL pública
  await expect(page.locator('.deploy-success-card')).toBeVisible();
  await expect(page.locator('.status-indicator')).toContainText('APLICAÇÃO PUBLICADA COM SUCESSO');

  const urlInput = page.locator('.deploy-url-input');
  await expect(urlInput).toBeVisible();
  const publicUrl = await urlInput.inputValue();
  expect(publicUrl).toContain('/apps/');

  // 7. Botão Copiar Link
  const copyBtn = page.locator('.deploy-action-btn.copy-btn');
  await copyBtn.click();
  await expect(copyBtn).toContainText('Copiado!');

  // 8. Iframe de Preview ao vivo deve estar carregado
  const iframe = page.locator('.deploy-preview-iframe');
  await expect(iframe).toBeVisible();

  // 9. Alterna para aba Exportar Pacote (.ZIP)
  await page.locator('.deploy-tab-btn', { hasText: 'Exportar Pacote (.ZIP)' }).click();
  await expect(page.locator('.zip-description-card')).toBeVisible();
  await expect(page.locator('.file-check-item', { hasText: 'index.html' })).toBeVisible();
  await expect(page.locator('.file-check-item', { hasText: 'app.js' })).toBeVisible();
  await expect(page.locator('.file-check-item', { hasText: 'style.css' })).toBeVisible();

  // 10. Dispara download do ZIP
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('.download-zip-btn').click()
  ]);
  expect(download.suggestedFilename()).toContain('.zip');

  // 11. Fecha o modal
  await page.locator('.deploy-close-btn').click();
  await expect(modal).toHaveCount(0);
});




