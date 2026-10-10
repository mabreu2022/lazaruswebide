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
