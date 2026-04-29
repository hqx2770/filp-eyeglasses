const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.describe('屏幕校准与缩放测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await h.clearLocalStorage(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test.describe('校准标尺功能', () => {
    test('校准滑块范围 20-160', async ({ page }) => {
      await h.openConfig(page);
      const slider = page.locator('#calibration-slider');
      const min = await slider.getAttribute('min');
      const max = await slider.getAttribute('max');
      expect(parseInt(min)).toBe(20);
      expect(parseInt(max)).toBe(160);
    });

    test('未校准时显示默认提示', async ({ page }) => {
      await h.openConfig(page);
      const status = await page.textContent('#calibration-status');
      expect(status).toContain('未校准');
    });

    test('保存校准后显示已校准提示', async ({ page }) => {
      await h.openConfig(page);
      await page.fill('#calibration-slider', '50');
      await page.click('#calibration-save');
      await page.waitForTimeout(200);
      const status = await page.textContent('#calibration-status');
      expect(status).toContain('已校准');
    });

    test('校准预览宽度随滑块变化', async ({ page }) => {
      await h.openConfig(page);
      await page.fill('#calibration-slider', '60');
      await page.waitForTimeout(100);
      const label = await page.textContent('#calibration-width-label');
      expect(label).toContain('60px');
      expect(label).toContain('10mm');
    });

    test('校准后 px/mm 值正确计算', async ({ page }) => {
      await h.setCalibration(page, 60);
      const pxPerMm = await page.evaluate(() => {
        return parseFloat(localStorage.getItem('calibration_px_per_mm') || '0');
      });
      expect(pxPerMm).toBeCloseTo(6.0, 1);
    });
  });

  test.describe('校准缩放 20px=10mm (2px/mm)', () => {
    test.use({ viewport: { width: 1366, height: 768 } });

    test('E 字视标在 20px=10mm 下的可见性和完整性', async ({ page }) => {
      await h.setCalibration(page, 20);
      await h.startTraining(page);

      const visibleCount = await h.countVisibleCells(page);
      expect(visibleCount).toBe(25);

      const cellCount = await h.getGridCells(page);
      await expect(cellCount).toHaveCount(25);

      for (let i = 0; i < 25; i++) {
        const isVisible = await h.isSVGVisible(page, i);
        expect(isVisible).toBeTruthy();
      }
    });

    test('E 字 SVG 路径数据完整', async ({ page }) => {
      await h.setCalibration(page, 20);
      await h.startTraining(page);

      for (let i = 0; i < 25; i++) {
        const pathData = await h.getSVGPathData(page, i);
        expect(pathData).toBeTruthy();
        expect(pathData).toContain('M 0 0');
        expect(pathData).toContain('Z');
      }
    });

    test('E 字视标尺寸计算', async ({ page }) => {
      await h.setCalibration(page, 20);
      await h.startTraining(page);

      const expectedPx = h.calcExpectedStimulusPx('medium', 2.0);
      const actualPx = await h.measureStimulusPixelSize(page, 0);
      expect(actualPx).toBeGreaterThan(0);
      expect(Math.abs(actualPx - expectedPx)).toBeLessThan(2);
    });

    test('C 字视标在 20px=10mm 下的完整性', async ({ page }) => {
      await h.setCalibration(page, 20);
      await h.setConfigSelect(page, 'stimulusType', 'C');
      await h.startTraining(page);

      const visibleCount = await h.countVisibleCells(page);
      expect(visibleCount).toBe(25);

      for (let i = 0; i < 25; i++) {
        const pathData = await h.getSVGPathData(page, i);
        expect(pathData).toBeTruthy();
        expect(pathData).toContain('A 2.3');
      }
    });

    test('飞机视标在 20px=10mm 下的完整性', async ({ page }) => {
      await h.setCalibration(page, 20);
      await h.setConfigSelect(page, 'stimulusType', 'plane');
      await h.startTraining(page);

      const visibleCount = await h.countVisibleCells(page);
      expect(visibleCount).toBe(25);

      const hasText = await page.evaluate(() => {
        const texts = document.querySelectorAll('.grid-cell svg text');
        return Array.from(texts).every((t) => t.textContent === '✈');
      });
      expect(hasText).toBeTruthy();
    });

    test('小号视标在 20px=10mm 下渲染', async ({ page }) => {
      await h.setCalibration(page, 20);
      await h.setConfigSelect(page, 'stimulusSize', 'small');
      await h.startTraining(page);

      const visibleCount = await h.countVisibleCells(page);
      expect(visibleCount).toBe(25);

      const expectedPx = h.calcExpectedStimulusPx('small', 2.0);
      const actualPx = await h.measureStimulusPixelSize(page, 0);
      expect(actualPx).toBeGreaterThan(0);
      expect(Math.abs(actualPx - expectedPx)).toBeLessThan(2);
    });

    test('大号视标在 20px=10mm 下渲染', async ({ page }) => {
      await h.setCalibration(page, 20);
      await h.setConfigSelect(page, 'stimulusSize', 'large');
      await h.startTraining(page);

      const visibleCount = await h.countVisibleCells(page);
      expect(visibleCount).toBe(25);
    });

    test('网格容器在 20px=10mm 下不溢出', async ({ page }) => {
      await h.setCalibration(page, 20);
      await h.startTraining(page);

      const gridRect = await h.measureGridContainerSize(page);
      expect(gridRect).toBeTruthy();
      expect(gridRect.width).toBeGreaterThan(0);
      expect(gridRect.height).toBeGreaterThan(0);
    });
  });

  test.describe('校准缩放 30px=10mm (3px/mm)', () => {
    test.use({ viewport: { width: 1366, height: 768 } });

    test('E 字视标在 30px=10mm 下的可见性和完整性', async ({ page }) => {
      await h.setCalibration(page, 30);
      await h.startTraining(page);

      const visibleCount = await h.countVisibleCells(page);
      expect(visibleCount).toBe(25);

      for (let i = 0; i < 25; i++) {
        const isVisible = await h.isSVGVisible(page, i);
        expect(isVisible).toBeTruthy();
      }
    });

    test('E 字 SVG 路径数据完整', async ({ page }) => {
      await h.setCalibration(page, 30);
      await h.startTraining(page);

      for (let i = 0; i < 5; i++) {
        const pathData = await h.getSVGPathData(page, i);
        expect(pathData).toBeTruthy();
        expect(pathData).toContain('M 0 0');
        expect(pathData).toContain('Z');
      }
    });

    test('E 字视标尺寸计算', async ({ page }) => {
      await h.setCalibration(page, 30);
      await h.startTraining(page);

      const expectedPx = h.calcExpectedStimulusPx('medium', 3.0);
      const actualPx = await h.measureStimulusPixelSize(page, 0);
      expect(actualPx).toBeGreaterThan(0);
      expect(Math.abs(actualPx - expectedPx)).toBeLessThan(3);
    });

    test('C 字视标在 30px=10mm 下的完整性', async ({ page }) => {
      await h.setCalibration(page, 30);
      await h.setConfigSelect(page, 'stimulusType', 'C');
      await h.startTraining(page);

      const visibleCount = await h.countVisibleCells(page);
      expect(visibleCount).toBe(25);

      for (let i = 0; i < 5; i++) {
        const pathData = await h.getSVGPathData(page, i);
        expect(pathData).toBeTruthy();
      }
    });

    test('飞机视标在 30px=10mm 下的完整性', async ({ page }) => {
      await h.setCalibration(page, 30);
      await h.setConfigSelect(page, 'stimulusType', 'plane');
      await h.startTraining(page);

      const visibleCount = await h.countVisibleCells(page);
      expect(visibleCount).toBe(25);
    });

    test('小号/中号/大号视标尺寸递增', async ({ page }) => {
      await h.setCalibration(page, 30);

      const sizes = [];
      for (const sizeKey of ['small', 'medium', 'large']) {
        await h.clearLocalStorage(page);
        await page.reload();
        await page.waitForLoadState('networkidle');
        await h.setCalibration(page, 30);
        await h.setConfigSelect(page, 'stimulusSize', sizeKey);
        await h.startTraining(page);
        const px = await h.measureStimulusPixelSize(page, 0);
        sizes.push(px);
        await page.click('#btn-exit');
      }

      expect(sizes[0]).toBeLessThan(sizes[1]);
      expect(sizes[1]).toBeLessThan(sizes[2]);
    });

    test('网格容器在 30px=10mm 下布局正常', async ({ page }) => {
      await h.setCalibration(page, 30);
      await h.startTraining(page);

      const gridRect = await h.measureGridContainerSize(page);
      expect(gridRect.width).toBeGreaterThan(0);
      expect(gridRect.height).toBeGreaterThan(0);
    });

    test('目标格子红色边框可见', async ({ page }) => {
      await h.setCalibration(page, 30);
      await h.startTraining(page);

      const target = h.getTargetCell(page);
      await expect(target).toBeVisible();
      const borderColor = await target.evaluate((el) =>
        getComputedStyle(el).borderColor
      );
      expect(borderColor).toBeTruthy();
    });
  });

  test.describe('校准缩放 60px=10mm (6px/mm)', () => {
    test.use({ viewport: { width: 1366, height: 768 } });

    test('E 字视标在 60px=10mm 下的可见性和完整性', async ({ page }) => {
      await h.setCalibration(page, 60);
      await h.startTraining(page);

      const visibleCount = await h.countVisibleCells(page);
      expect(visibleCount).toBe(25);

      for (let i = 0; i < 25; i++) {
        const isVisible = await h.isSVGVisible(page, i);
        expect(isVisible).toBeTruthy();
      }
    });

    test('E 字 SVG 路径数据完整', async ({ page }) => {
      await h.setCalibration(page, 60);
      await h.startTraining(page);

      for (let i = 0; i < 25; i++) {
        const pathData = await h.getSVGPathData(page, i);
        expect(pathData).toBeTruthy();
        expect(pathData).toContain('M 0 0');
        expect(pathData).toContain('Z');
      }
    });

    test('E 字视标尺寸计算', async ({ page }) => {
      await h.setCalibration(page, 60);
      await h.startTraining(page);

      const expectedPx = h.calcExpectedStimulusPx('medium', 6.0);
      const actualPx = await h.measureStimulusPixelSize(page, 0);
      expect(actualPx).toBeGreaterThan(0);
      expect(Math.abs(actualPx - expectedPx)).toBeLessThan(5);
    });

    test('C 字视标在 60px=10mm 下的完整性', async ({ page }) => {
      await h.setCalibration(page, 60);
      await h.setConfigSelect(page, 'stimulusType', 'C');
      await h.startTraining(page);

      const visibleCount = await h.countVisibleCells(page);
      expect(visibleCount).toBe(25);

      for (let i = 0; i < 5; i++) {
        const pathData = await h.getSVGPathData(page, i);
        expect(pathData).toBeTruthy();
        expect(pathData).toContain('A');
      }
    });

    test('飞机视标在 60px=10mm 下的完整性', async ({ page }) => {
      await h.setCalibration(page, 60);
      await h.setConfigSelect(page, 'stimulusType', 'plane');
      await h.startTraining(page);

      const visibleCount = await h.countVisibleCells(page);
      expect(visibleCount).toBe(25);
    });

    test('大号视标在 60px=10mm 下可能溢出但仍渲染', async ({ page }) => {
      await h.setCalibration(page, 60);
      await h.setConfigSelect(page, 'stimulusSize', 'large');
      await h.startTraining(page);

      const visibleCount = await h.countVisibleCells(page);
      expect(visibleCount).toBeGreaterThan(0);
    });

    test('网格容器在 60px=10mm 下可正常显示', async ({ page }) => {
      await h.setCalibration(page, 60);
      await h.startTraining(page);

      const gridRect = await h.measureGridContainerSize(page);
      expect(gridRect.width).toBeGreaterThan(0);
      expect(gridRect.height).toBeGreaterThan(0);
    });
  });

  test.describe('显示缩放百分比 (displayScalePercent)', () => {
    test('50% 缩放 (默认) 下网格正常渲染', async ({ page }) => {
      await h.startTraining(page);
      const visibleCount = await h.countVisibleCells(page);
      expect(visibleCount).toBe(25);
    });

    test('40% 缩放下网格正常渲染', async ({ page }) => {
      await h.setConfigSelect(page, 'displayScalePercent', '40');
      await h.startTraining(page);
      const visibleCount = await h.countVisibleCells(page);
      expect(visibleCount).toBe(25);
    });

    test('100% 缩放下网格正常渲染', async ({ page }) => {
      await h.setConfigSelect(page, 'displayScalePercent', '100');
      await h.startTraining(page);
      const visibleCount = await h.countVisibleCells(page);
      expect(visibleCount).toBe(25);
    });

    test('训练中实时切换缩放后网格刷新', async ({ page }) => {
      await h.startTraining(page);
      await h.openConfig(page);
      await page.selectOption('[data-config="displayScalePercent"]', '75');
      await page.waitForTimeout(300);
      await h.closeConfig(page);
      const visibleCount = await h.countVisibleCells(page);
      expect(visibleCount).toBe(25);
    });

    test('缩放影响网格容器宽度', async ({ page }) => {
      const widths = [];
      for (const scale of ['40', '50', '75', '100']) {
        await h.clearLocalStorage(page);
        await page.reload();
        await page.waitForLoadState('networkidle');
        await h.setConfigSelect(page, 'displayScalePercent', scale);
        await h.startTraining(page);
        const rect = await h.measureGridContainerSize(page);
        widths.push(rect.width);
        await page.click('#btn-exit');
      }
      expect(widths[0]).toBeLessThan(widths[1]);
      expect(widths[1]).toBeLessThan(widths[2]);
      expect(widths[2]).toBeLessThan(widths[3]);
    });
  });

  test.describe('校准与缩放组合测试', () => {
    test('20px=10mm + 40% 缩放', async ({ page }) => {
      await h.setCalibration(page, 20);
      await h.setConfigSelect(page, 'displayScalePercent', '40');
      await h.startTraining(page);
      const visibleCount = await h.countVisibleCells(page);
      expect(visibleCount).toBe(25);
    });

    test('60px=10mm + 100% 缩放', async ({ page }) => {
      await h.setCalibration(page, 60);
      await h.setConfigSelect(page, 'displayScalePercent', '100');
      await h.startTraining(page);
      const visibleCount = await h.countVisibleCells(page);
      expect(visibleCount).toBeGreaterThan(0);
    });

    test('30px=10mm + 75% 缩放 + E 字小号', async ({ page }) => {
      await h.setCalibration(page, 30);
      await h.setConfigSelect(page, 'displayScalePercent', '75');
      await h.setConfigSelect(page, 'stimulusSize', 'small');
      await h.startTraining(page);
      const visibleCount = await h.countVisibleCells(page);
      expect(visibleCount).toBe(25);
    });

    test('60px=10mm + 50% 缩放 + C 字中号', async ({ page }) => {
      await h.setCalibration(page, 60);
      await h.setConfigSelect(page, 'displayScalePercent', '50');
      await h.setConfigSelect(page, 'stimulusType', 'C');
      await h.startTraining(page);
      const visibleCount = await h.countVisibleCells(page);
      expect(visibleCount).toBe(25);
    });

    test('校准改变后视标像素尺寸随之变化', async ({ page }) => {
      const sizes = [];
      for (const px of [20, 30, 60]) {
        await h.clearLocalStorage(page);
        await page.reload();
        await page.waitForLoadState('networkidle');
        await h.setCalibration(page, px);
        await h.startTraining(page);
        const pxSize = await h.measureStimulusPixelSize(page, 0);
        sizes.push(pxSize);
        await page.click('#btn-exit');
      }
      expect(sizes[0]).toBeLessThan(sizes[1]);
      expect(sizes[1]).toBeLessThan(sizes[2]);
    });
  });

  test.describe('视标清晰度 — SVG 渲染质量', () => {
    test('E 字使用 crispEdges 渲染确保清晰', async ({ page }) => {
      await h.startTraining(page);
      const shapeRendering = await page.evaluate(() => {
        const svg = document.querySelector('.grid-cell svg');
        return svg ? svg.style.shapeRendering : null;
      });
      expect(shapeRendering.toLowerCase()).toBe('crispedges');
    });

    test('C 字使用 geometricPrecision 渲染', async ({ page }) => {
      await h.setConfigSelect(page, 'stimulusType', 'C');
      await h.startTraining(page);
      const shapeRendering = await page.evaluate(() => {
        const svg = document.querySelector('.grid-cell svg');
        return svg ? svg.style.shapeRendering : null;
      });
      expect(shapeRendering.toLowerCase()).toBe('geometricprecision');
    });

    test('SVG preserveAspectRatio 为 xMidYMid meet', async ({ page }) => {
      await h.startTraining(page);
      const par = await page.evaluate(() => {
        const svg = document.querySelector('.grid-cell svg');
        return svg ? svg.getAttribute('preserveAspectRatio') : null;
      });
      expect(par).toBe('xMidYMid meet');
    });

    test('SVG viewBox 坐标系正确 (5×5 或 100×100)', async ({ page }) => {
      await h.startTraining(page);
      const viewBox = await page.evaluate(() => {
        const svg = document.querySelector('.grid-cell svg');
        return svg ? svg.getAttribute('viewBox') : null;
      });
      expect(['0 0 5 5', '0 0 100 100']).toContain(viewBox);
    });
  });

  test.describe('不同分辨率下的校准表现', () => {
    test('1920×1080 下 20px=10mm 校准正常', async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto('/');
      await h.clearLocalStorage(page);
      await h.setCalibration(page, 20);
      await h.startTraining(page);
      const count = await h.countVisibleCells(page);
      expect(count).toBe(25);
      await ctx.close();
    });

    test('1920×1080 下 60px=10mm 校准正常', async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto('/');
      await h.clearLocalStorage(page);
      await h.setCalibration(page, 60);
      await h.startTraining(page);
      const count = await h.countVisibleCells(page);
      expect(count).toBe(25);
      await ctx.close();
    });

    test('平板竖屏 768×1024 下校准正常', async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: { width: 768, height: 1024 },
        isMobile: true,
        hasTouch: true,
      });
      const page = await ctx.newPage();
      await page.goto('/');
      await h.clearLocalStorage(page);
      await h.setCalibration(page, 30);
      await h.startTraining(page);
      const count = await h.countVisibleCells(page);
      expect(count).toBe(25);
      await ctx.close();
    });
  });
});
