// Single source of truth for "is this case done" -- every view (List, Board,
// Workflow Manager, Case Detail, stats) must use this exact check. Previously
// each place computed it independently as `completedSteps.length ===
// workflow.length`, which only becomes true one extra confirmation step
// *after* currentStep already reads "completed" -- so a case dragged all the
// way to the Kanban board's "Completed" column looked done there while List
// view still showed it as active. currentStep is the one field every action
// (drag, Workflow Manager buttons, the New Case form's "Mark as Completed"
// checkbox) already keeps in sync, so it's the reliable check.
export function isCaseCompleted(case_: { currentStep?: string | null }): boolean {
  return case_?.currentStep === "completed"
}
