import { vUppercaseOnDrag, vFormatDate } from '../dashboard/src/directives/customDirectives';
import { ComponentTree } from '../dashboard/src/components/ComponentTreeIndex';

describe('Ticket 4 — Frontend Component Tree Unit Tests (TypeScript)', () => {
  test('Component Tree registry includes all required top-level views', () => {
    expect(ComponentTree.views).toContain('DashboardHome');
    expect(ComponentTree.views).toContain('SBWView');
    expect(ComponentTree.views).toContain('HardBlockView');
    expect(ComponentTree.views).toContain('TasksView');
    expect(ComponentTree.views).toContain('FocusModeView');
    expect(ComponentTree.views).toContain('AccountabilityHistoryView');
    expect(ComponentTree.views).toContain('SettingsView');
  });

  test('Component Tree includes friction and safety modals', () => {
    expect(ComponentTree.modals).toContain('FailsafeModal');
    expect(ComponentTree.modals).toContain('EmergencyHelpModal');
    expect(ComponentTree.modals).toContain('TypeToConfirmModal');
    expect(ComponentTree.modals).toContain('PinEntryModal');
  });

  test('vFormatDate formats ISO dates properly', () => {
    const el = {} as HTMLElement;
    const binding = { value: '2026-01-15T10:00:00.000Z' };

    vFormatDate.mounted(el, binding);

    expect(el.textContent).toBeDefined();
    expect(typeof el.textContent).toBe('string');
    expect(el.textContent?.length).toBeGreaterThan(0);
  });
});
