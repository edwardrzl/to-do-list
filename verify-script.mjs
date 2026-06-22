const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  // 1. Load the app
  await page.goto("http://localhost:5173");
  await page.waitForLoadState("networkidle");
  const title = await page.title();
  console.log("TITLE:", title);

  // 2. Check empty state
  const emptyMsg = await page.locator("text=No hay tareas todavía").isVisible().catch(() => false);
  console.log("EMPTY STATE:", emptyMsg);

  // 3. Bottom nav
  const bandejaTab = await page.locator("text=Bandeja").isVisible().catch(() => false);
  const calTab = await page.locator("text=Calendario").isVisible().catch(() => false);
  console.log("BOTTOM NAV - Bandeja:", bandejaTab, "Calendario:", calTab);

  // 4. Screenshot initial state
  await page.screenshot({ path: "verify-1-initial.png" });

  // 5. Click FAB
  await page.locator('button[aria-label="Nueva tarea"]').click();
  await page.waitForTimeout(300);
  const modalVisible = await page.locator("text=Nueva tarea").isVisible().catch(() => false);
  console.log("MODAL OPEN:", modalVisible);
  await page.screenshot({ path: "verify-2-modal.png" });

  // 6. Create task via Enter key
  const nameInput = page.locator('input[placeholder="Nombre de la tarea"]');
  await nameInput.fill("Tarea de prueba rápida");
  await nameInput.press("Enter");
  await page.waitForTimeout(300);
  // Input should be cleared (quick save mode)
  const inputVal = await nameInput.inputValue();
  console.log("QUICK SAVE (input cleared):", inputVal === "");

  // 7. Create a second task with category and close
  await nameInput.fill("Reunión de trabajo");
  // Select category
  await page.locator("text=Trabajo").first().click();
  await page.locator("text=Guardar").click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "verify-3-tasks-created.png" });

  // 8. Tasks appear in list
  const task1 = await page.locator("text=Tarea de prueba rápida").isVisible().catch(() => false);
  const task2 = await page.locator("text=Reunión de trabajo").isVisible().catch(() => false);
  console.log("TASK 1 VISIBLE:", task1, "TASK 2 VISIBLE:", task2);

  // 9. Toggle complete
  const checkboxes = page.locator('button[aria-label="Marcar completa"]');
  await checkboxes.first().click();
  await page.waitForTimeout(300);
  const completadaSection = await page.locator("text=Completadas (1)").isVisible().catch(() => false);
  console.log("COMPLETED SECTION:", completadaSection);
  await page.screenshot({ path: "verify-4-completed.png" });

  // 10. Navigate to Calendario
  await page.locator("text=Calendario").click();
  await page.waitForTimeout(400);
  const calVisible = await page.locator("text=Lun").isVisible().catch(() => false);
  const calMonthVisible = (await page.locator("text=/enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre/i").first().isVisible().catch(() => false));
  console.log("CALENDARIO - Week visible:", calVisible, "Month visible:", calMonthVisible);
  await page.screenshot({ path: "verify-5-calendario.png" });

  await browser.close();
  console.log("DONE");
})();
