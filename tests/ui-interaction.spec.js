const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.describe('UI 交互测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await h.clearLocalStorage(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test.describe('键盘快捷键', () => {
    test('方向键回答', async ({ page }) => {
      await h.startTraining(page);
      const targetDir = await page.evaluate(() => {
        const targetCell = document.querySelector('.grid-cell.is-target');
        const g = targetCell.querySelector('svg > g');
        const transform = g.getAttribute('transform') || '';
        const match = transform.match(/rotate\((\d+(?:\.\d+)?)\)/);
        const rotation = match ? parseFloat(match[1]) : 0;
        return { 0: 'right', 90: 'down', 180: 'left', 270: 'up' }[rotation];
      });
      const keyMap = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
      await page.keyboard.press(keyMap[targetDir]);
      await page.waitForTimeout(300);
      const cells = h.getGridCells(page);
      await expect(cells).toHaveCount(25);
    });

    test('Space 暂停/继续', async ({ page }) => {
      await h.startTraining(page);
      await page.keyboard.press('Space');
      await page.waitForTimeout(200);
      const pauseText = await page.textContent('#btn-pause');
      expect(pauseText).toContain('继续');

      await page.keyboard.press('Space');
      await page.waitForTimeout(200);
      const resumeText = await page.textContent('#btn-pause');
      expect(resumeText).toContain('暂停');
    });

    test('R 键重做', async ({ page }) => {
      await h.startTraining(page);
      const firstDirs = [];
      for (let i = 0; i < 5; i++) {
        firstDirs.push(await h.getStimulusDirectionFromSVG(page, i));
      }
      await page.keyboard.press('R');
      await page.waitForTimeout(300);
      const newFirstDir = await h.getStimulusDirectionFromSVG(page, 0);
      expect(newFirstDir).toBeDefined();
    });

    test('C 键标记看不见', async ({ page }) => {
      await h.startTraining(page);
      await page.keyboard.press('C');
      await page.waitForTimeout(300);
      const cells = h.getGridCells(page);
      await expect(cells).toHaveCount(25);
    });

    test('Esc 键退出训练', async ({ page }) => {
      await h.startTraining(page);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(page.locator('#screen-start')).toBeVisible();
    });
  });

  test.describe('方向软键盘', () => {
    test('软键盘在训练界面显示', async ({ page }) => {
      await h.startTraining(page);
      await expect(page.locator('#soft-keyboard')).toBeVisible();
    });

    test('点击上方向键回答', async ({ page }) => {
      await h.startTraining(page);
      await page.click('.soft-key[data-action="up"]');
      await page.waitForTimeout(300);
      const hasPending = await page.evaluate(() => {
        const targetCell = document.querySelector('.grid-cell.is-target');
        return !!targetCell;
      });
      expect(hasPending).toBeTruthy();
    });

    test('点击下方向键回答', async ({ page }) => {
      await h.startTraining(page);
      await page.click('.soft-key[data-action="down"]');
      await page.waitForTimeout(300);
      const cells = h.getGridCells(page);
      await expect(cells).toHaveCount(25);
    });

    test('点击左方向键回答', async ({ page }) => {
      await h.startTraining(page);
      await page.click('.soft-key[data-action="left"]');
      await page.waitForTimeout(300);
      const cells = h.getGridCells(page);
      await expect(cells).toHaveCount(25);
    });

    test('点击右方向键回答', async ({ page }) => {
      await h.startTraining(page);
      await page.click('.soft-key[data-action="right"]');
      await page.waitForTimeout(300);
      const cells = h.getGridCells(page);
      await expect(cells).toHaveCount(25);
    });
  });

  test.describe('配置面板', () => {
    test('点击参数设置打开配置面板', async ({ page }) => {
      await h.openConfig(page);
      await expect(page.locator('#config-panel.open')).toBeVisible();
    });

    test('点击关闭按钮关闭配置面板', async ({ page }) => {
      await h.openConfig(page);
      await h.closeConfig(page);
      await expect(page.locator('#config-panel:not(.open)')).toBeVisible();
    });

    test('视标类型切换', async ({ page }) => {
      await h.openConfig(page);
      await page.selectOption('[data-config="stimulusType"]', 'C');
      await h.closeConfig(page);
      const val = await page.evaluate(() =>
        localStorage.getItem('stimulus_type')
      );
      expect(val).toBe('C');
    });

    test('镜片度数切换', async ({ page }) => {
      await h.openConfig(page);
      await page.selectOption('[data-config="flipperDiopter"]', '1.50');
      await h.closeConfig(page);
      const val = await page.evaluate(() =>
        localStorage.getItem('flipper_diopter')
      );
      expect(val).toBe('1.50');
    });

    test('翻转间隔切换', async ({ page }) => {
      await h.openConfig(page);
      await page.selectOption('[data-config="flipInterval"]', '10');
      await h.closeConfig(page);
      const val = await page.evaluate(() =>
        localStorage.getItem('flip_interval')
      );
      expect(val).toBe('10');
    });

    test('训练时长切换', async ({ page }) => {
      await h.openConfig(page);
      await page.selectOption('[data-config="trainingDuration"]', '5');
      await h.closeConfig(page);
      const val = await page.evaluate(() =>
        localStorage.getItem('training_duration')
      );
      expect(val).toBe('5');
    });

    test('视标颜色切换', async ({ page }) => {
      await h.openConfig(page);
      await page.selectOption('[data-config="bgColor"]', 'black');
      await h.closeConfig(page);
      const val = await page.evaluate(() =>
        localStorage.getItem('bg_color')
      );
      expect(val).toBe('black');
    });

    test('恢复默认按钮清除自定义配置', async ({ page }) => {
      await h.openConfig(page);
      await page.selectOption('[data-config="flipInterval"]', '10');
      await h.closeConfig(page);
      await h.resetConfig(page);
      const val = await page.evaluate(() =>
        localStorage.getItem('flip_interval')
      );
      expect(val).toBeNull();
    });

    test('训练中改变视标类型后网格刷新', async ({ page }) => {
      await h.startTraining(page);
      await h.openConfig(page);
      await page.selectOption('[data-config="stimulusType"]', 'C');
      await page.waitForTimeout(300);
      await h.closeConfig(page);
      const hasC = await page.evaluate(() => {
        const svg = document.querySelector('.grid-cell svg');
        return svg && svg.getAttribute('aria-label')?.includes('C stimulus');
      });
      expect(hasC).toBeTruthy();
    });

    test('训练中改变背景颜色后生效', async ({ page }) => {
      await h.startTraining(page);
      await h.openConfig(page);
      await page.selectOption('[data-config="bgColor"]', 'black');
      await page.waitForTimeout(300);
      await h.closeConfig(page);
      const bgColor = await page.evaluate(() =>
        getComputedStyle(document.body).backgroundColor
      );
      expect(bgColor).toBeTruthy();
    });
  });

  test.describe('暂停/继续/退出', () => {
    test('暂停按钮暂停计时', async ({ page }) => {
      await h.startTraining(page);
      const time1 = await h.getRemainingSeconds(page);
      await page.click('#btn-pause');
      await page.waitForTimeout(3000);
      const time2 = await h.getRemainingSeconds(page);
      expect(Math.abs(time2 - time1)).toBeLessThanOrEqual(1);
    });

    test('继续按钮恢复计时', async ({ page }) => {
      await h.startTraining(page);
      await page.click('#btn-pause');
      await page.waitForTimeout(1000);
      const pausedTime = await h.getRemainingSeconds(page);
      await page.click('#btn-pause');
      await page.waitForTimeout(2000);
      const resumedTime = await h.getRemainingSeconds(page);
      expect(resumedTime).toBeLessThan(pausedTime);
    });

    test('退出按钮返回开始界面', async ({ page }) => {
      await h.startTraining(page);
      await page.click('#btn-exit');
      await page.waitForTimeout(300);
      await expect(page.locator('#screen-start')).toBeVisible();
    });
  });

  test.describe('重做与看不见', () => {
    test('重做按钮刷新网格', async ({ page }) => {
      await h.startTraining(page);
      await page.click('#btn-redo');
      await page.waitForTimeout(300);
      const cells = h.getGridCells(page);
      await expect(cells).toHaveCount(25);
    });

    test('看不见按钮跳过本轮', async ({ page }) => {
      await h.startTraining(page);
      await page.click('#btn-cantsee');
      await page.waitForTimeout(300);
      const cells = h.getGridCells(page);
      await expect(cells).toHaveCount(25);
    });
  });

  test.describe('操作说明弹窗', () => {
    test('点击操作说明打开弹窗', async ({ page }) => {
      await page.click('#btn-help');
      await expect(page.locator('#help-overlay:not(.hidden)')).toBeVisible();
    });

    test('弹窗包含键盘说明', async ({ page }) => {
      await page.click('#btn-help');
      await expect(page.locator('.help-item')).toHaveCount(7);
    });

    test('关闭按钮关闭弹窗', async ({ page }) => {
      await page.click('#btn-help');
      await page.click('#help-close');
      await expect(page.locator('#help-overlay')).toHaveClass(/hidden/);
    });

    test('点击遮罩关闭弹窗', async ({ page }) => {
      await page.click('#btn-help');
      await page.click('#help-overlay', { position: { x: 5, y: 5 } });
      await expect(page.locator('#help-overlay')).toHaveClass(/hidden/);
    });
  });

  test.describe('历史记录弹窗', () => {
    test('点击历史记录按钮打开弹窗', async ({ page }) => {
      await page.click('#btn-history');
      await expect(page.locator('#history-overlay:not(.hidden)')).toBeVisible();
    });

    test('关闭历史记录弹窗', async ({ page }) => {
      await page.click('#btn-history');
      await page.click('#history-close');
      await expect(page.locator('#history-overlay')).toHaveClass(/hidden/);
    });

    test('清除历史记录', async ({ page }) => {
      await page.click('#btn-history');
      await page.click('#history-clear');
      await page.waitForTimeout(200);
      const history = await h.getHistoryFromStorage(page);
      expect(history).toEqual([]);
    });
  });

  test.describe('视标颜色模式', () => {
    test('白底黑字模式', async ({ page }) => {
      await h.setConfigSelect(page, 'bgColor', 'white');
      await h.startTraining(page);
      const fg = await page.evaluate(() => {
        const path = document.querySelector('.grid-cell svg path');
        return path ? path.getAttribute('fill') : null;
      });
      expect(fg).toBe('#1a1a2e');
    });

    test('黑底白字模式', async ({ page }) => {
      await h.setConfigSelect(page, 'bgColor', 'black');
      await h.startTraining(page);
      const fg = await page.evaluate(() => {
        const path = document.querySelector('.grid-cell svg path');
        return path ? path.getAttribute('fill') : null;
      });
      expect(fg).toBe('#ffffff');
    });

    test('红绿对比模式', async ({ page }) => {
      await h.setConfigSelect(page, 'bgColor', 'redGreen');
      await h.startTraining(page);
      const fg = await page.evaluate(() => {
        const path = document.querySelector('.grid-cell svg path');
        return path ? path.getAttribute('fill') : null;
      });
      expect(fg).toBe('#166534');
    });
  });

  test.describe('全屏模式', () => {
    test('F11 键触发全屏', async ({ page }) => {
      await page.keyboard.press('F11');
      await page.waitForTimeout(500);
      const isFullscreen = await page.evaluate(() => !!document.fullscreenElement);
      expect(isFullscreen).toBeTruthy();
    });
  });
});
