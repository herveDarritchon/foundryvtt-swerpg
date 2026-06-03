import { test, expect } from '@playwright/test';

test.use({
viewport: {
height: 900,
width: 1280
}
});

test('test', async ({ page }) => {
await page.goto('http://localhost:30000/join');
await page.getByRole('combobox').selectOption('6bx3NuItBTrFA3wo');
await page.getByRole('button', { name: 'Join Game Session' }).click();
await page.getByRole('tab', { name: 'Settings' }).click();
await page.getByRole('button', { name: 'Game Settings' }).click();
await page.getByRole('button', { name: 'Star Wars Edge RPG [5]' }).click();
await page.getByRole('button', { name: 'Import data from OggDude' }).click();
await page.getByRole('button', { name: 'OggDude Zip Data File' }).click();
await page.getByRole('button', { name: 'OggDude Zip Data File' }).setInputFiles('oggdude-data.zip');
await page.getByRole('checkbox', { name: 'Import to Compendium' }).check();
await page.getByRole('checkbox', { name: 'Select All' }).check();
await page.getByRole('button', { name: 'Load' }).click();
await page.getByRole('checkbox', { name: 'Import to Compendium' }).uncheck();
await page.getByRole('button', { name: 'Load' }).click();
await page.getByText('Import Statistics').click();
await page.locator('#swerpgSettings-form').getByRole('button', { name: 'Close Window' }).click();
await page.getByRole('button', { name: 'Close Window' }).click();
await page.getByRole('tab', { name: 'Compendium Packs' }).click();
await page.getByText('SWERPG OggDude Import').click();
await page.getByText('Equipments').click();
await page.locator('a').filter({ hasText: 'Armors' }).click();
await page.getByRole('button', { name: 'Close Window' }).click();
await page.getByRole('tab', { name: 'Actors' }).click();
await page.getByRole('tab', { name: 'Items' }).click();
await page.getByText('OggDude', { exact: true }).click();
await page.getByText('Gear', { exact: true }).click();
await page.getByText('"Breaker" Heavy Hydrospanner').click();
await page.getByRole('button', { name: 'Close Window' }).click();
});
