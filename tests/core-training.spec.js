const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.describe('核心训练模块', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await h.clearLocalStorage(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test.describe('开始界面', () => {
    test('显示标题和开始按钮', async ({ page }) => {
      await expect(page.locator('#screen-start')).toBeVisible();
      await expect(page.locator('#screen-start h1')).toHaveText('翻转拍训练');
      await expect(page.locator('#btn-start')).toBeVisible();
    });

    test('点击开始按钮进入训练界面', async ({ page }) => {
      await h.startTraining(page);
      await expect(page.locator('#screen-training')).toBeVisible();
    });
  });

  test.describe('5×5 网格渲染', () => {
    test('生成 25 个格子', async ({ page }) => {
      await h.startTraining(page);
      const cells = h.getGridCells(page);
      await expect(cells).toHaveCount(25);
    });

    test('每个格子包含 SVG 视标', async ({ page }) => {
      await h.startTraining(page);
      const cells = h.getGridCells(page);
      for (let i = 0; i < 25; i++) {
        await expect(cells.nth(i).locator('svg')).toBeVisible();
      }
    });

    test('所有视标方向在上下左右中', async ({ page }) => {
      await h.startTraining(page);
      const directions = new Set();
      for (let i = 0; i < 25; i++) {
        const dir = await h.getStimulusDirectionFromSVG(page, i);
        directions.add(dir);
      }
      expect(['up', 'down', 'left', 'right']).toContain(...directions);
    });

    test('有且仅有一个红色方框目标格子', async ({ page }) => {
      await h.startTraining(page);
      const targets = page.locator('.grid-cell.is-target');
      await expect(targets).toHaveCount(1);
    });
  });

  test.describe('E 字视标', () => {
    test('默认视标类型为 E 字', async ({ page }) => {
      await h.startTraining(page);
      const pathData = await h.getSVGPathData(page, 0);
      expect(pathData).toContain('M 0 0 H 5 V 1 H 1 V 2 H 4 V 3 H 1 V 4 H 5 V 5 H 0 Z');
    });

    test('E 字 SVG viewBox 为 0 0 5 5', async ({ page }) => {
      await h.startTraining(page);
      const viewBox = await page.evaluate(() => {
        const svg = document.querySelector('.grid-cell svg');
        return svg ? svg.getAttribute('viewBox') : null;
      });
      expect(viewBox).toBe('0 0 5 5');
    });
  });

  test.describe('C 字视标', () => {
    test('切换到 C 字后网格渲染 C 字视标', async ({ page }) => {
      await h.setConfigSelect(page, 'stimulusType', 'C');
      await h.startTraining(page);
      const pathData = await h.getSVGPathData(page, 0);
      expect(pathData).toContain('A 2.3');
    });

    test('C 字 SVG 具有 aria-label 标识', async ({ page }) => {
      await h.setConfigSelect(page, 'stimulusType', 'C');
      await h.startTraining(page);
      const aria = await page.evaluate(() => {
        const svg = document.querySelector('.grid-cell svg');
        return svg ? svg.getAttribute('aria-label') : null;
      });
      expect(aria).toContain('C stimulus');
    });
  });

  test.describe('飞机视标', () => {
    test('切换到飞机后网格渲染飞机视标', async ({ page }) => {
      await h.setConfigSelect(page, 'stimulusType', 'plane');
      await h.startTraining(page);
      const textContent = await page.evaluate(() => {
        const text = document.querySelector('.grid-cell svg text');
        return text ? text.textContent : null;
      });
      expect(textContent).toBe('✈');
    });
  });

  test.describe('方向回答与计分', () => {
    test('回答正确后翻转时 +5 分', async ({ page }) => {
      await h.setConfigSelect(page, 'flipInterval', '5');
      await h.startTraining(page);
      const targetDir = await page.evaluate(() => {
        const targetCell = document.querySelector('.grid-cell.is-target');
        const g = targetCell.querySelector('svg > g');
        const transform = g.getAttribute('transform') || '';
        const match = transform.match(/rotate\((\d+(?:\.\d+)?)\)/);
        const rotation = match ? parseFloat(match[1]) : 0;
        return { 0: 'right', 90: 'down', 180: 'left', 270: 'up' }[rotation];
      });
      await h.answerDirection(page, targetDir);
      await h.waitForFlipperToggle(page, 'positive', 10000);
      const correct = await h.getCorrectCount(page);
      expect(correct).toBeGreaterThanOrEqual(1);
      const score = await h.getScore(page);
      expect(score).toBeGreaterThanOrEqual(5);
    });

    test('回答错误后翻转时不计分', async ({ page }) => {
      await h.setConfigSelect(page, 'flipInterval', '5');
      await h.startTraining(page);
      const wrongDir = await page.evaluate(() => {
        const targetCell = document.querySelector('.grid-cell.is-target');
        const g = targetCell.querySelector('svg > g');
        const transform = g.getAttribute('transform') || '';
        const match = transform.match(/rotate\((\d+(?:\.\d+)?)\)/);
        const rotation = match ? parseFloat(match[1]) : 0;
        return { 0: 'down', 90: 'up', 180: 'right', 270: 'left' }[rotation];
      });
      await h.answerDirection(page, wrongDir);
      await h.waitForFlipperToggle(page, 'positive', 10000);
      const wrong = await h.getWrongCount(page);
      expect(wrong).toBeGreaterThanOrEqual(1);
    });

    test('翻转后网格和目标自动刷新', async ({ page }) => {
      await h.setConfigSelect(page, 'flipInterval', '5');
      await h.startTraining(page);
      await h.waitForFlipperToggle(page, 'positive', 10000);
      const cells = h.getGridCells(page);
      await expect(cells).toHaveCount(25);
      const targets = page.locator('.grid-cell.is-target');
      await expect(targets).toHaveCount(1);
    });
  });

  test.describe('翻转拍交替逻辑', () => {
    test('训练初始为正镜模式', async ({ page }) => {
      await h.startTraining(page);
      const mode = await h.getFlipperMode(page);
      expect(mode).toBe('positive');
    });

    test('翻转间隔到达后切换为负镜', async ({ page }) => {
      await h.setConfigSelect(page, 'flipInterval', '5');
      await h.startTraining(page);
      await h.waitForFlipperToggle(page, 'positive', 10000);
      const mode = await h.getFlipperMode(page);
      expect(mode).toBe('negative');
    });

    test('负镜后再次翻转为正镜', async ({ page }) => {
      await h.setConfigSelect(page, 'flipInterval', '5');
      await h.startTraining(page);
      await h.waitForFlipperToggle(page, 'positive', 10000);
      await h.waitForFlipperToggle(page, 'negative', 10000);
      const mode = await h.getFlipperMode(page);
      expect(mode).toBe('positive');
    });
  });

  test.describe('计时器', () => {
    test('计时器倒计时正常', async ({ page }) => {
      await h.startTraining(page);
      const time1 = await h.getRemainingSeconds(page);
      await page.waitForTimeout(2000);
      const time2 = await h.getRemainingSeconds(page);
      expect(time2).toBeLessThanOrEqual(time1);
      expect(time2).toBeGreaterThanOrEqual(time1 - 3);
    });

    test('训练时间结束自动停止', async ({ page }) => {
      test.setTimeout(90000);
      await h.setConfigSelect(page, 'trainingDuration', '1');
      await h.startTraining(page);
      await page.waitForSelector('#report-overlay:not(.hidden)', { timeout: 80000 });
      await expect(page.locator('#report-overlay')).toBeVisible();
    });
  });
});
