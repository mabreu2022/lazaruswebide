import { test, expect, type Page } from '@playwright/test';

async function placeFromPalette(page: Page, tab: string, label: string, x: number, y: number) {
  await page.locator('.palette-tab', { hasText: tab }).first().click({ force: true, timeout: 5000 });
  await page.locator('.palette-item-btn', { hasText: new RegExp(`^\\s*${label}\\s*$`) }).first().click({ force: true, timeout: 5000 });
  const canvas = page.locator('.form-client-area');
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + x, box.y + y);
}

test.beforeEach(async ({ page }) => {
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
