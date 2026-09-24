import { OverviewComponent } from './overview.component';

describe('OverviewComponent', () => {
  let component: OverviewComponent;

  beforeEach(() => {
    component = new OverviewComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('round', () => {
    it('rounds 4.5 up to 5 stars instead of truncating to 4', () => {
      expect(component.round(4.5)).toBe(5);
    });

    it('rounds 4.4 down to 4 stars', () => {
      expect(component.round(4.4)).toBe(4);
    });
  });

  describe('maskAccountNumber', () => {
    it('shows only the last 4 digits of a full account number', () => {
      expect(component.maskAccountNumber('1234567890')).toBe('••••••7890');
    });

    it('returns a placeholder when there is no account number', () => {
      expect(component.maskAccountNumber(null)).toBe('—');
      expect(component.maskAccountNumber(undefined)).toBe('—');
      expect(component.maskAccountNumber('')).toBe('—');
    });

    it('does not mask a number that is already 4 digits or shorter', () => {
      expect(component.maskAccountNumber('123')).toBe('123');
    });
  });
});
