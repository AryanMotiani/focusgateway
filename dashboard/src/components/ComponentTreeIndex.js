'use strict';

/**
 * Component tree registry verifying all required UI components from Ticket 4 spec.
 */
const ComponentTree = {
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

module.exports = ComponentTree;
