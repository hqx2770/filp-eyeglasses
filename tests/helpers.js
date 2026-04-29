const helpers = {
  CALIBRATION_TARGET_MM: 10,

  STIMULUS_SIZE_MM: { small: 1.27, medium: 1.59, large: 2.06 },
  DEFAULT_PX_PER_MM: 96 / 25.4,

  async startTraining(page) {
    await page.click('#btn-start');
    await page.waitForSelector('#screen-training:not([style*="display:none"])', { timeout: 5000 });
  },

  async openConfig(page) {
    await page.click('#btn-config');
    await page.waitForSelector('#config-panel.open', { timeout: 3000 });
  },

  async closeConfig(page) {
    await page.click('#config-close');
    await page.waitForSelector('#config-panel:not(.open)', { timeout: 3000 });
  },

  async setConfigSelect(page, configKey, value) {
    await this.openConfig(page);
    await page.selectOption(`[data-config="${configKey}"]`, value);
    await this.closeConfig(page);
  },

  async setCalibration(page, pxWidth) {
    await this.openConfig(page);
    await page.fill('#calibration-slider', String(pxWidth));
    await page.click('#calibration-save');
    await page.waitForTimeout(200);
    await this.closeConfig(page);
  },

  async resetConfig(page) {
    await this.openConfig(page);
    await page.click('#config-reset');
    await page.waitForTimeout(200);
    await this.closeConfig(page);
  },

  getGridCells(page) {
    return page.locator('.grid-cell');
  },

  getTargetCell(page) {
    return page.locator('.grid-cell.is-target');
  },

  async getStimulusDirectionFromSVG(page, cellIndex) {
    const cells = page.locator('.grid-cell');
    const cell = cells.nth(cellIndex);
    const g = cell.locator('svg > g');
    const transform = await g.getAttribute('transform') || '';
    const match = transform.match(/rotate\((\d+(?:\.\d+)?)\)/);
    const rotation = match ? parseFloat(match[1]) : 0;
    const dirMap = { 0: 'right', 90: 'down', 180: 'left', 270: 'up' };
    return dirMap[rotation] || 'right';
  },

  async answerDirection(page, direction) {
    const keyMap = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
    await page.keyboard.press(keyMap[direction]);
  },

  async getScore(page) {
    const text = await page.textContent('#score-display');
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  },

  async getCorrectCount(page) {
    return parseInt(await page.textContent('#correct-count'), 10);
  },

  async getWrongCount(page) {
    return parseInt(await page.textContent('#wrong-count'), 10);
  },

  async getRemainingSeconds(page) {
    const text = await page.textContent('#timer-display');
    const match = text.match(/(\d+):(\d+)/);
    return match ? parseInt(match[1], 10) * 60 + parseInt(match[2], 10) : 0;
  },

  async getFlipperMode(page) {
    const text = await page.textContent('#flipper-mode');
    if (text.includes('正镜')) return 'positive';
    if (text.includes('负镜')) return 'negative';
    return 'unknown';
  },

  async waitForFlipperToggle(page, fromMode, timeout = 35000) {
    const targetText = fromMode === 'positive' ? '负镜' : '正镜';
    await page.waitForFunction(
      (t) => document.querySelector('#flipper-mode').textContent.includes(t),
      targetText,
      { timeout }
    );
  },

  calcExpectedStimulusPx(sizeKey, pxPerMm) {
    const mm = this.STIMULUS_SIZE_MM[sizeKey] || this.STIMULUS_SIZE_MM.medium;
    return mm * pxPerMm;
  },

  async measureStimulusPixelSize(page, cellIndex = 0) {
    return page.evaluate((idx) => {
      const cell = document.querySelectorAll('.grid-cell')[idx];
      if (!cell) return 0;
      const svg = cell.querySelector('svg');
      return svg ? parseFloat(svg.getAttribute('width')) || 0 : 0;
    }, cellIndex);
  },

  async measureGridContainerSize(page) {
    return page.evaluate(() => {
      const container = document.querySelector('#grid-container');
      return container ? container.getBoundingClientRect() : null;
    });
  },

  async getSVGPathData(page, cellIndex = 0) {
    return page.evaluate((idx) => {
      const cell = document.querySelectorAll('.grid-cell')[idx];
      if (!cell) return null;
      const path = cell.querySelector('svg path');
      return path ? path.getAttribute('d') : null;
    }, cellIndex);
  },

  async isSVGVisible(page, cellIndex = 0) {
    return page.evaluate((idx) => {
      const cell = document.querySelectorAll('.grid-cell')[idx];
      if (!cell) return false;
      const svg = cell.querySelector('svg');
      if (!svg) return false;
      const rect = svg.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }, cellIndex);
  },

  async countVisibleCells(page) {
    return page.evaluate(() => {
      const cells = document.querySelectorAll('.grid-cell');
      let count = 0;
      cells.forEach((cell) => {
        const svg = cell.querySelector('svg');
        if (svg) {
          const r = svg.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) count++;
        }
      });
      return count;
    });
  },

  async takeCellScreenshot(page, cellIndex, name) {
    const cell = page.locator('.grid-cell').nth(cellIndex);
    await cell.screenshot({ path: `tests/screenshots/${name}.png` });
  },

  async clearLocalStorage(page) {
    await page.evaluate(() => localStorage.clear());
  },

  async getHistoryFromStorage(page) {
    return page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem('flipper_history') || '[]');
      } catch { return []; }
    });
  },
};

module.exports = helpers;
