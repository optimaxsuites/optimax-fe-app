import { VendorPerformanceComponent } from './performance.component';

describe('VendorPerformanceComponent chart path generation', () => {
  let component: VendorPerformanceComponent;

  beforeEach(() => {
    component = new VendorPerformanceComponent();
  });

  it('produces SVG PATH syntax (M/L/Z commands) for the line, matching how the template binds it', () => {
    // The template binds these via [attr.d] on <path> elements — they must NOT look like the
    // "x,y x,y" list a <polygon>/<polyline> `points` attribute expects, or nothing renders.
    const line = component.getPerformanceChartPath([50, 80, 60], 100);
    expect(line.startsWith('M')).toBeTrue();
    expect(line).toContain('L');
    expect(line).not.toContain(',,');

    const area = component.getPerformanceChartAreaPath([50, 80, 60], 100);
    expect(area.startsWith('M')).toBeTrue();
    expect(area.endsWith('Z')).toBeTrue();
  });

  it('returns an empty path (not a broken one) with no data', () => {
    expect(component.getPerformanceChartPath([], 100)).toBe('');
    expect(component.getPerformanceChartAreaPath([], 100)).toBe('');
  });

  it('plots a single point without dividing by zero', () => {
    const line = component.getPerformanceChartPath([75], 100);
    expect(line).toMatch(/^M[\d.]+,[\d.]+$/);
  });
});

describe('VendorPerformanceComponent grid lines', () => {
  let component: VendorPerformanceComponent;

  beforeEach(() => {
    component = new VendorPerformanceComponent();
  });

  it('spans the same y-range that data points are plotted in (getPointY), not a fixed range that overshoots it', () => {
    const gridYs = component.getGridLineYs();
    const floor = component.getPointY(0, 100); // y for the lowest possible value
    const ceiling = component.getPointY(100, 100); // y for the highest possible value

    expect(Math.min(...gridYs)).toBeCloseTo(ceiling, 5);
    expect(Math.max(...gridYs)).toBeCloseTo(floor, 5);
  });

  it('produces evenly spaced lines', () => {
    const gridYs = component.getGridLineYs();
    const gaps = new Set(gridYs.slice(1).map((y, i) => Math.round((y - gridYs[i]) * 1000)));
    expect(gaps.size).toBe(1); // all gaps identical
  });
});

describe('VendorPerformanceComponent trend range label', () => {
  let component: VendorPerformanceComponent;

  beforeEach(() => {
    component = new VendorPerformanceComponent();
  });

  it('reflects the actual span of the trend data instead of a hardcoded "Last 6 months"', () => {
    component.performance = {
      trendData: [{ period: 'Jan 2026', score: 70 }, { period: 'Mar 2026', score: 80 }]
    } as any;
    expect(component.getTrendRangeLabel()).toBe('Jan 2026 – Mar 2026');
  });

  it('handles a single data point without a dangling dash', () => {
    component.performance = { trendData: [{ period: 'Jan 2026', score: 70 }] } as any;
    expect(component.getTrendRangeLabel()).toBe('Jan 2026');
  });

  it('returns empty when there is no trend data', () => {
    component.performance = { trendData: [] } as any;
    expect(component.getTrendRangeLabel()).toBe('');
  });
});
