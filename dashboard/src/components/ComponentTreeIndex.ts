export interface ComponentTreeRegistry {
  layout: string[];
  views: string[];
  tasks: string[];
  modals: string[];
}

export const ComponentTree: ComponentTreeRegistry = {
  layout: ['App', 'OnboardingFlow', 'AppLayout', 'Sidebar', 'TopBar'],
  views: [
    'DashboardHome',
    'SBWView',
    'HardBlockView',
    'TasksView',
    'FocusModeView',
    'AccountabilityHistoryView',
    'SettingsView',
  ],
  tasks: [
    'KanbanBoard',
    'KanbanColumn',
    'TaskCard',
    'TaskListView',
    'CalendarView',
    'CreateTaskModal',
    'TaskDetailDrawer',
    'ProcrastinationDots',
  ],
  modals: [
    'FailsafeModal',
    'EmergencyHelpModal',
    'TypeToConfirmModal',
    'PinEntryModal',
    'ConflictExplainerModal',
  ],
};
