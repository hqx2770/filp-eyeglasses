const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  // ── helper: open page, clear storage, start training ──
  async function init() {
    await page.goto('http://localhost:8080/');
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
  }

  // ── helper: set calibration slider and save ──
  async function setCalibration(pxWidth) {
    await page.click('#btn-config');
    await page.waitForSelector('#config-panel.open');
    await page.fill('#calibration-slider', String(pxWidth));
    await page.click('#calibration-save');
    await page.waitForTimeout(200);
    await page.click('#config-close');
  }

  // ── helper: change config select value ──
  async function setConfig(selectName, value) {
    await page.click('#btn-config');
    await page.waitForSelector('#config-panel.open');
    await page.selectOption(`[data-config="${selectName}"]`, value);
    await page.waitForTimeout(200);
    await page.click('#config-close');
  }

  // ── helper: start training and wait for grid to render ──
  async function startTraining() {
    await page.click('#btn-start');
    await page.waitForSelector('#screen-training');
    await page.waitForTimeout(1000);
  }

  // ── helper: evaluate all 25 cells ──
  async function evaluateGrid(name) {
    const result = await page.evaluate(() => {
      const cells = document.querySelectorAll('.grid-cell');
      const data = [];
      cells.forEach((cell, idx) => {
        const svg = cell.querySelector('svg');
        if (!svg) {
          data.push({ idx, error: 'no svg' });
          return;
        }
        const rect = svg.getBoundingClientRect();
        const viewBox = svg.getAttribute('viewBox');
        const par = svg.getAttribute('preserveAspectRatio');
        const path = svg.querySelector('path');
        const text = svg.querySelector('text');
        const g = svg.querySelector('g');
        const transform = g ? g.getAttribute('transform') : null;
        data.push({
          idx,
          visible: rect.width > 0 && rect.height > 0,
          w: rect.width,
          h: rect.height,
          viewBox,
          preserveAspectRatio: par,
          hasPath: !!path,
          pathData: path ? path.getAttribute('d') : null,
          hasText: !!text,
          textContent: text ? text.textContent : null,
          transform,
          shapeRendering: svg.style.shapeRendering,
        });
      });
      return data;
    });

    console.log(`\n=== ${name} ===`);
    const allVisible = result.every((d) => d.visible);
    console.log(`  全部可见: ${allVisible ? 'YES' : 'NO'}`);
    const uniqueSizes = new Set(result.map((d) => `${d.w.toFixed(1)}x${d.h.toFixed(1)}`));
    console.log(`  实际渲染尺寸: ${[...uniqueSizes].join(', ')}`);
    const uniqueViewBoxes = [...new Set(result.map((d) => d.viewBox))];
    console.log(`  viewBox: ${uniqueViewBoxes.join(', ')}`);
    const uniquePar = [...new Set(result.map((d) => d.preserveAspectRatio))];
    console.log(`  preserveAspectRatio: ${uniquePar.join(', ')}`);
    const uniqueSR = [...new Set(result.map((d) => d.shapeRendering))];
    console.log(`  shapeRendering: ${uniqueSR.join(', ')}`);

    // check path completeness
    const brokenPaths = result.filter((d) => d.hasPath && (!d.pathData || d.pathData.length < 10));
    if (brokenPaths.length) console.log(`  ⚠ 不完整路径: ${brokenPaths.length} 个`);

    // check direction diversity
    if (result[0].transform) {
      const dirs = new Set(result.map((d) => {
        const m = d.transform.match(/rotate\((\d+)/);
        return m ? m[1] : 'unknown';
      }));
      console.log(`  方向数量: ${dirs.size} (期望 ≥2)`);
    }

    return result;
  }

  // ════════════════════════════════════════════════════
  // Test 1: 默认未校准 + E 字 + 50% 缩放
  // ════════════════════════════════════════════════════
  console.log('\n【测试 1】默认未校准 + E 字 + 50% 缩放');
  await init();
  await startTraining();
  await page.screenshot({ path: 'tests/screenshots/01-default-e.png', fullPage: false });
  await evaluateGrid('默认 E 字');

  // ════════════════════════════════════════════════════
  // Test 2: 20px=10mm 校准 + E/C/飞机
  // ════════════════════════════════════════════════════
  for (const type of ['E', 'C', 'plane']) {
    const label = `20px=10mm + ${type}字`;
    console.log(`\n【测试 2.${['E','C','plane'].indexOf(type)+1}】${label}`);
    await init();
    await setCalibration(20);
    if (type !== 'E') await setConfig('stimulusType', type);
    await startTraining();
    await page.screenshot({ path: `tests/screenshots/02-20px-${type}.png` });
    await evaluateGrid(label);
  }

  // ════════════════════════════════════════════════════
  // Test 3: 30px=10mm 校准 + E/C/飞机
  // ════════════════════════════════════════════════════
  for (const type of ['E', 'C', 'plane']) {
    const label = `30px=10mm + ${type}字`;
    console.log(`\n【测试 3.${['E','C','plane'].indexOf(type)+1}】${label}`);
    await init();
    await setCalibration(30);
    if (type !== 'E') await setConfig('stimulusType', type);
    await startTraining();
    await page.screenshot({ path: `tests/screenshots/03-30px-${type}.png` });
    await evaluateGrid(label);
  }

  // ════════════════════════════════════════════════════
  // Test 4: 60px=10mm 校准 + E/C/飞机
  // ════════════════════════════════════════════════════
  for (const type of ['E', 'C', 'plane']) {
    const label = `60px=10mm + ${type}字`;
    console.log(`\n【测试 4.${['E','C','plane'].indexOf(type)+1}】${label}`);
    await init();
    await setCalibration(60);
    if (type !== 'E') await setConfig('stimulusType', type);
    await startTraining();
    await page.screenshot({ path: `tests/screenshots/04-60px-${type}.png` });
    await evaluateGrid(label);
  }

  // ════════════════════════════════════════════════════
  // Test 5: 不同显示缩放百分比 (E 字, 未校准)
  // ════════════════════════════════════════════════════
  for (const scale of ['40', '50', '60', '75', '100']) {
    const label = `显示缩放 ${scale}%`;
    console.log(`\n【测试 5.${['40','50','60','75','100'].indexOf(scale)+1}】${label}`);
    await init();
    await setConfig('displayScalePercent', scale);
    await startTraining();
    await page.screenshot({ path: `tests/screenshots/05-scale-${scale}pct.png` });
    await evaluateGrid(label);
  }

  // ════════════════════════════════════════════════════
  // Test 6: 60px=10mm + 大号视标 (可能溢出测试)
  // ════════════════════════════════════════════════════
  for (const type of ['E', 'C', 'plane']) {
    const label = `60px=10mm + ${type} + 大号`;
    console.log(`\n【测试 6.${['E','C','plane'].indexOf(type)+1}】${label}`);
    await init();
    await setCalibration(60);
    await setConfig('stimulusSize', 'large');
    if (type !== 'E') await setConfig('stimulusType', type);
    await startTraining();
    await page.screenshot({ path: `tests/screenshots/06-60px-large-${type}.png` });
    await evaluateGrid(label);
  }

  // ════════════════════════════════════════════════════
  // Test 7: 组合 — 30px=10mm + 75% 缩放 + C 字
  // ════════════════════════════════════════════════════
  console.log('\n【测试 7】30px=10mm + 75% 缩放 + C 字');
  await init();
  await setCalibration(30);
  await setConfig('displayScalePercent', '75');
  await setConfig('stimulusType', 'C');
  await startTraining();
  await page.screenshot({ path: 'tests/screenshots/07-combo-30-75-c.png' });
  await evaluateGrid('组合测试 30px + 75% + C');

  // ════════════════════════════════════════════════════
  // Test 8: 黑底白字模式
  // ════════════════════════════════════════════════════
  console.log('\n【测试 8】30px=10mm + 黑底白字 + E 字');
  await init();
  await setCalibration(30);
  await setConfig('bgColor', 'black');
  await startTraining();
  await page.screenshot({ path: 'tests/screenshots/08-black-bg.png' });
  await evaluateGrid('黑底白字');

  // ════════════════════════════════════════════════════
  // Summary
  // ════════════════════════════════════════════════════
  console.log('\n\n═══════════ 测试完成 ═══════════');
  console.log('截图已保存至 tests/screenshots/ 目录');
  console.log('共截取 24 张截图');

  await browser.close();
  process.exit(0);
})();
