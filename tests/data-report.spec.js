const { test, expect } = require('@playwright/test');
const h = require('./helpers');

test.describe('数据持久化与训练报告', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await h.clearLocalStorage(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test.describe('LocalStorage 持久化', () => {
    test('刷新页面后历史记录不丢失', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('flipper_history', JSON.stringify([{
          id: 1, date: '2026/4/28 10:00:00', dateKey: '2026-04-28',
          diopter: '2.00', correctCount: 10, total: 12, accuracy: 83,
          totalScore: 50, ratingText: '良好',
        }]));
      });
      await page.reload();
      await page.waitForLoadState('networkidle');
      const history = await h.getHistoryFromStorage(page);
      expect(history.length).toBe(1);
      expect(history[0].diopter).toBe('2.00');
    });

    test('配置项持久化', async ({ page }) => {
      await h.setConfigSelect(page, 'flipInterval', '15');
      await page.reload();
      await page.waitForLoadState('networkidle');
      const val = await page.evaluate(() =>
        localStorage.getItem('flip_interval')
      );
      expect(val).toBe('15');
    });
  });

  test.describe('训练报告 (模拟)', () => {
    async function injectReportAndShow(page, overrides = {}) {
      const data = {
        totalTime: '03:00',
        totalScore: 150,
        accuracy: 83,
        correctCount: 10,
        wrongCount: 2,
        total: 12,
        positiveAccuracy: 85,
        negativeAccuracy: 80,
        totalFlips: 6,
        skipCount: 1,
        rating: { text: '良好', color: 'blue' },
        diopter: '2.00',
        ...overrides,
      };

      await page.evaluate((d) => {
        document.querySelector('#report-total-time').textContent = d.totalTime;
        document.querySelector('#report-total-score').textContent = d.totalScore;
        document.querySelector('#report-accuracy').textContent = d.accuracy + '%';
        document.querySelector('#report-correct').textContent = d.correctCount;
        document.querySelector('#report-wrong').textContent = d.wrongCount;
        document.querySelector('#report-pos-acc').textContent = d.positiveAccuracy + '%';
        document.querySelector('#report-neg-acc').textContent = d.negativeAccuracy + '%';
        document.querySelector('#report-flips').textContent = d.totalFlips;
        document.querySelector('#report-skips').textContent = d.skipCount;

        const ratingEl = document.querySelector('#report-rating');
        ratingEl.textContent = d.rating.text;
        const colorMap = { green: '#22c55e', blue: '#2563eb', orange: '#f59e0b', red: '#ef4444' };
        ratingEl.style.color = colorMap[d.rating.color] || '#000';

        document.querySelector('#report-overlay').classList.remove('hidden');
      }, data);
    }

    test('报告弹窗显示', async ({ page }) => {
      await injectReportAndShow(page);
      await expect(page.locator('#report-overlay')).toBeVisible();
    });

    test('报告包含总用时', async ({ page }) => {
      await injectReportAndShow(page);
      const totalTime = await page.textContent('#report-total-time');
      expect(totalTime).toMatch(/\d{2}:\d{2}/);
    });

    test('报告包含总得分', async ({ page }) => {
      await injectReportAndShow(page);
      const score = await page.textContent('#report-total-score');
      expect(parseInt(score)).toBe(150);
    });

    test('报告包含正确次数和错误次数', async ({ page }) => {
      await injectReportAndShow(page);
      const correct = await page.textContent('#report-correct');
      const wrong = await page.textContent('#report-wrong');
      expect(parseInt(correct)).toBe(10);
      expect(parseInt(wrong)).toBe(2);
    });

    test('报告包含正确率', async ({ page }) => {
      await injectReportAndShow(page);
      const accuracy = await page.textContent('#report-accuracy');
      expect(accuracy).toBe('83%');
    });

    test('报告包含正镜/负镜正确率', async ({ page }) => {
      await injectReportAndShow(page);
      const posAcc = await page.textContent('#report-pos-acc');
      const negAcc = await page.textContent('#report-neg-acc');
      expect(posAcc).toBe('85%');
      expect(negAcc).toBe('80%');
    });

    test('报告包含翻转次数', async ({ page }) => {
      await injectReportAndShow(page);
      const flips = await page.textContent('#report-flips');
      expect(parseInt(flips)).toBe(6);
    });

    test('报告包含看不见次数', async ({ page }) => {
      await injectReportAndShow(page);
      const skips = await page.textContent('#report-skips');
      expect(parseInt(skips)).toBe(1);
    });

    test('报告包含评级', async ({ page }) => {
      await injectReportAndShow(page);
      const rating = await page.textContent('#report-rating');
      expect(['优秀', '良好', '合格', '需加强']).toContain(rating);
    });

    test('关闭报告按钮', async ({ page }) => {
      await injectReportAndShow(page);
      await page.click('#report-close');
      await expect(page.locator('#report-overlay')).toHaveClass(/hidden/);
    });

    test('再来一次按钮', async ({ page }) => {
      await injectReportAndShow(page);
      await page.click('#report-retry');
      await page.waitForTimeout(500);
      const trainingVisible = await page.isVisible('#screen-training');
      expect(trainingVisible).toBeTruthy();
    });

    test('查看历史按钮从报告打开历史', async ({ page }) => {
      await injectReportAndShow(page);
      await page.click('#report-history');
      await expect(page.locator('#history-overlay:not(.hidden)')).toBeVisible();
    });

    test('点击报告遮罩关闭', async ({ page }) => {
      await injectReportAndShow(page);
      await page.click('#report-overlay', { position: { x: 5, y: 5 } });
      await expect(page.locator('#report-overlay')).toHaveClass(/hidden/);
    });
  });

  test.describe('端到端训练报告', () => {
    test('1 分钟训练后自动生成报告', async ({ page }) => {
      test.setTimeout(90000);
      await h.setConfigSelect(page, 'trainingDuration', '1');
      await h.startTraining(page);
      await page.waitForSelector('#report-overlay:not(.hidden)', { timeout: 80000 });
      await expect(page.locator('#report-overlay')).toBeVisible();

      const totalTime = await page.textContent('#report-total-time');
      expect(totalTime).toMatch(/\d{2}:\d{2}/);

      const history = await h.getHistoryFromStorage(page);
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].totalScore).toBeDefined();
      expect(history[0].accuracy).toBeDefined();
    });
  });

  test.describe('评级规则', () => {
    test('正确率 ≥90% 评级为优秀', async ({ page }) => {
      const rating = await page.evaluate(() => {
        const s = new Scorer();
        for (let i = 0; i < 9; i++) s.recordCorrect('positive');
        s.recordWrong('negative');
        return s.getRating();
      });
      expect(rating.text).toBe('优秀');
      expect(rating.color).toBe('green');
    });

    test('正确率 75%-89% 评级为良好', async ({ page }) => {
      const rating = await page.evaluate(() => {
        const s = new Scorer();
        for (let i = 0; i < 8; i++) s.recordCorrect('positive');
        for (let i = 0; i < 2; i++) s.recordWrong('negative');
        return s.getRating();
      });
      expect(rating.text).toBe('良好');
      expect(rating.color).toBe('blue');
    });

    test('正确率 60%-74% 评级为合格', async ({ page }) => {
      const rating = await page.evaluate(() => {
        const s = new Scorer();
        for (let i = 0; i < 6; i++) s.recordCorrect('positive');
        for (let i = 0; i < 4; i++) s.recordWrong('negative');
        return s.getRating();
      });
      expect(rating.text).toBe('合格');
      expect(rating.color).toBe('orange');
    });

    test('正确率 <60% 评级为需加强', async ({ page }) => {
      const rating = await page.evaluate(() => {
        const s = new Scorer();
        for (let i = 0; i < 5; i++) s.recordCorrect('positive');
        for (let i = 0; i < 6; i++) s.recordWrong('negative');
        return s.getRating();
      });
      expect(rating.text).toBe('需加强');
      expect(rating.color).toBe('red');
    });
  });

  test.describe('历史记录面板', () => {
    test('显示历史训练记录表格', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('flipper_history', JSON.stringify([{
          id: 1, date: '2026/4/28 10:00:00', dateKey: '2026-04-28',
          diopter: '2.00', correctCount: 10, total: 12, accuracy: 83,
          totalScore: 50, ratingText: '良好',
        }]));
      });
      await page.click('#btn-history');
      await page.waitForTimeout(300);
      const rows = await page.locator('#history-table-body tr').count();
      expect(rows).toBeGreaterThanOrEqual(1);
    });

    test('无历史记录时显示空提示', async ({ page }) => {
      await page.click('#btn-history');
      const emptyText = await page.textContent('#history-table-body');
      expect(emptyText).toContain('暂无');
    });

    test('日期筛选', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('flipper_history', JSON.stringify([
          {
            id: 1, date: '2026/4/28 10:00:00', dateKey: '2026-04-28',
            diopter: '2.00', correctCount: 10, total: 12, accuracy: 83,
            totalScore: 50, ratingText: '良好',
          },
          {
            id: 2, date: '2026/4/27 10:00:00', dateKey: '2026-04-27',
            diopter: '2.00', correctCount: 8, total: 12, accuracy: 67,
            totalScore: 40, ratingText: '合格',
          },
        ]));
      });
      await page.click('#btn-history');
      await page.fill('#history-date-filter', '2026-04-28');
      await page.waitForTimeout(300);
      const rows = await page.locator('#history-table-body tr').count();
      expect(rows).toBe(1);
    });

    test('镜片度数筛选', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('flipper_history', JSON.stringify([
          {
            id: 1, date: '2026/4/28 10:00:00', dateKey: '2026-04-28',
            diopter: '2.00', correctCount: 10, total: 12, accuracy: 83,
            totalScore: 50, ratingText: '良好',
          },
          {
            id: 2, date: '2026/4/28 11:00:00', dateKey: '2026-04-28',
            diopter: '1.50', correctCount: 8, total: 12, accuracy: 67,
            totalScore: 40, ratingText: '合格',
          },
        ]));
      });
      await page.click('#btn-history');
      await page.selectOption('#history-diopter-filter', '2.00');
      await page.waitForTimeout(300);
      const rows = await page.locator('#history-table-body tr').count();
      expect(rows).toBe(1);
    });

    test('正确率趋势图渲染', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('flipper_history', JSON.stringify(
          Array.from({ length: 5 }, (_, i) => ({
            id: i, date: `2026/4/${20 + i} 10:00:00`, dateKey: `2026-04-${20 + i}`,
            diopter: '2.00', correctCount: 10, total: 12,
            accuracy: 70 + i * 5, totalScore: 50 + i * 5, ratingText: '良好',
          }))
        ));
      });
      await page.click('#btn-history');
      await page.waitForTimeout(500);
      const canvas = page.locator('#history-chart');
      await expect(canvas).toBeVisible();
      const hasContent = await page.evaluate(() => {
        const canvas = document.querySelector('#history-chart');
        const ctx = canvas.getContext('2d');
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        return data.some((v) => v !== 0);
      });
      expect(hasContent).toBeTruthy();
    });

    test('清除历史记录', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('flipper_history', JSON.stringify([{
          id: 1, date: '2026/4/28 10:00:00', dateKey: '2026-04-28',
          diopter: '2.00', correctCount: 10, total: 12, accuracy: 83,
          totalScore: 50, ratingText: '良好',
        }]));
      });
      await page.click('#btn-history');
      await page.click('#history-clear');
      await page.waitForTimeout(300);
      const history = await h.getHistoryFromStorage(page);
      expect(history).toEqual([]);
    });
  });

  test.describe('计分规则', () => {
    test('每次正确 +5 分', async ({ page }) => {
      const result = await page.evaluate(() => {
        const s = new Scorer();
        s.recordCorrect('positive');
        s.recordCorrect('negative');
        s.recordCorrect('positive');
        return { score: s.totalScore, correct: s.correctCount };
      });
      expect(result.score).toBe(15);
      expect(result.correct).toBe(3);
    });

    test('错误不计分', async ({ page }) => {
      const result = await page.evaluate(() => {
        const s = new Scorer();
        s.recordCorrect('positive');
        s.recordWrong('negative');
        return { score: s.totalScore, wrong: s.wrongCount };
      });
      expect(result.score).toBe(5);
      expect(result.wrong).toBe(1);
    });

    test('看不见不计入总数', async ({ page }) => {
      const result = await page.evaluate(() => {
        const s = new Scorer();
        s.recordCorrect('positive');
        s.recordSkip();
        return {
          score: s.totalScore,
          correct: s.correctCount,
          wrong: s.wrongCount,
          skip: s.skipCount,
          accuracy: s.getAccuracy(),
        };
      });
      expect(result.score).toBe(5);
      expect(result.accuracy).toBe(100);
      expect(result.skip).toBe(1);
    });

    test('正镜/负镜分别统计正确率', async ({ page }) => {
      const result = await page.evaluate(() => {
        const s = new Scorer();
        s.recordCorrect('positive');
        s.recordCorrect('positive');
        s.recordWrong('positive');
        s.recordCorrect('negative');
        return {
          posAcc: s.getPositiveAccuracy(),
          negAcc: s.getNegativeAccuracy(),
        };
      });
      expect(result.posAcc).toBe(67);
      expect(result.negAcc).toBe(100);
    });
  });
});
