"use client"

import { useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { getProcedureColors } from "@/lib/procedure-colors"

interface KanbanBoardProps {
  cases: any[]
  onViewDetails: (case_: any) => void
  onUpdateWorkflow: (caseId: string, updates: any) => void
}

// Fixed set of columns the board always shows, in this order, regardless of
// what's actually present in the data. This is deliberately a curated list
// (not derived from every step name that happens to exist across historical
// cases) — legacy/removed-procedure data (old Aligners, Sent to Lab, etc.)
// would otherwise each spawn their own one-off column and clutter the board.
const CANONICAL_STEPS = ["new", "designed", "milled", "sintered", "3d_printed", "completed"]

// Catch-all bucket for any case whose current step isn't one of the above —
// keeps it visible on the board instead of silently disappearing.
const OTHER_STEP = "__other__"

const formatStepLabel = (step: string) =>
  step
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")

const DRAG_THRESHOLD = 5 // px of movement before a mousedown counts as a drag rather than a click

export default function KanbanBoard({ cases, onViewDetails, onUpdateWorkflow }: KanbanBoardProps) {
  const [dragCase, setDragCase] = useState<any>(null)
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 })
  const [dragOverStep, setDragOverStep] = useState<string | null>(null)
  const [hasMoved, setHasMoved] = useState(false)

  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const columns = useMemo(() => {
    const canonical = CANONICAL_STEPS.map((step) => ({
      step,
      label: formatStepLabel(step),
      cases: cases.filter((c) => c.currentStep === step),
    }))

    const otherCases = cases.filter((c) => !CANONICAL_STEPS.includes(c.currentStep))
    if (otherCases.length > 0) {
      canonical.push({ step: OTHER_STEP, label: "Other", cases: otherCases })
    }

    return canonical
  }, [cases])

  const findColumnAt = (x: number, y: number) => {
    for (const [step, el] of Object.entries(columnRefs.current)) {
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return step
    }
    return null
  }

  const applyMove = (targetStep: string, case_: any) => {
    if (case_.currentStep === targetStep) return

    const workflow: string[] = case_.workflow
    const fromIndex = workflow.indexOf(case_.currentStep)
    const toIndexRaw = workflow.indexOf(targetStep)
    const toIndex = toIndexRaw === -1 && targetStep === "completed" ? workflow.length : toIndexRaw
    const effectiveFromIndex = fromIndex === -1 && case_.currentStep === "completed" ? workflow.length : fromIndex

    if (toIndex === -1 || Math.abs(toIndex - effectiveFromIndex) !== 1) return // only one step forward/back at a time

    if (toIndex > effectiveFromIndex) {
      // Advance: complete the step we're leaving
      const newCompletedSteps = [...case_.completedSteps, case_.currentStep]
      const newCurrentStepIndex = newCompletedSteps.length
      const newCurrentStep = newCurrentStepIndex < workflow.length ? workflow[newCurrentStepIndex] : "completed"
      onUpdateWorkflow(case_.id, { currentStep: newCurrentStep, completedSteps: newCompletedSteps })
    } else {
      // Revert: uncomplete the last step
      const newCompletedSteps = case_.completedSteps.slice(0, -1)
      const newCurrentStepIndex = newCompletedSteps.length
      const newCurrentStep = newCurrentStepIndex < workflow.length ? workflow[newCurrentStepIndex] : workflow[0]
      onUpdateWorkflow(case_.id, { currentStep: newCurrentStep, completedSteps: newCompletedSteps })
    }
  }

  // Attached imperatively inside onMouseDown (not via useEffect) so a click
  // that completes within a single JS tick — as fast programmatic clicks do —
  // can't outrun a render cycle and leave the drag state stuck.
  const startDrag = (startEvent: React.MouseEvent, case_: any) => {
    const startX = startEvent.clientX
    const startY = startEvent.clientY
    let moved = false

    setDragCase(case_)
    setDragPos({ x: startX, y: startY })
    setHasMoved(false)

    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      if (!moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        moved = true
        setHasMoved(true)
      }
      setDragPos({ x: e.clientX, y: e.clientY })
      setDragOverStep(findColumnAt(e.clientX, e.clientY))
    }

    const handleUp = (e: MouseEvent) => {
      document.removeEventListener("mousemove", handleMove)
      document.removeEventListener("mouseup", handleUp)

      const step = findColumnAt(e.clientX, e.clientY)
      if (moved && step) {
        applyMove(step, case_)
      } else if (!moved) {
        onViewDetails(case_)
      }

      setDragCase(null)
      setDragOverStep(null)
      setHasMoved(false)
    }

    document.addEventListener("mousemove", handleMove)
    document.addEventListener("mouseup", handleUp)
  }

  const getDaysRemaining = (dueDate: string) => {
    const diffDays = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const renderCardContents = (case_: any, column: { step: string }) => {
    const daysRemaining = getDaysRemaining(case_.dueDate)
    const isOverdue = daysRemaining < 0 && column.step !== "completed"

    return (
      <>
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="font-semibold text-sm text-foreground leading-tight">{case_.patientName}</span>
          {case_.priority === "rush" && (
            <Badge className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0 shrink-0">
              RUSH
            </Badge>
          )}
        </div>

        <Badge className={`text-[10px] px-1.5 py-0 font-medium mb-2 ${getProcedureColors(case_.procedure)}`}>
          {case_.procedure}
        </Badge>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {(() => {
              const [, month, day] = case_.dueDate.split("-")
              return `${month}/${day}`
            })()}
          </span>
          {column.step !== "completed" && (
            <span
              className={
                isOverdue
                  ? "text-destructive font-medium"
                  : daysRemaining <= 2
                    ? "text-warning font-medium"
                    : "text-muted-foreground"
              }
            >
              {isOverdue ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d left`}
            </span>
          )}
        </div>
      </>
    )
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 select-none">
      {columns.map((column) => (
        <div
          key={column.step}
          ref={(el) => {
            columnRefs.current[column.step] = el
          }}
          className={`flex-shrink-0 w-72 rounded-2xl border transition-colors ${
            dragOverStep === column.step ? "border-primary/50 bg-primary/5" : "border-border bg-muted/30"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">{column.label}</h3>
            <span className="text-xs font-medium text-muted-foreground bg-background rounded-full px-2 py-0.5 border border-border">
              {column.cases.length}
            </span>
          </div>

          <div className="p-3 space-y-3 min-h-[120px] max-h-[calc(100vh-360px)] overflow-y-auto">
            {column.cases.map((case_) => {
              const isBeingDragged = dragCase?.id === case_.id
              return (
                <div
                  key={case_.id}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    startDrag(e, case_)
                  }}
                  className={`bg-card border border-border rounded-xl p-3 shadow-sm hover:shadow-md hover:border-primary/30 transition-shadow cursor-grab active:cursor-grabbing ${
                    isBeingDragged && hasMoved ? "opacity-30" : "opacity-100"
                  }`}
                >
                  {renderCardContents(case_, column)}
                </div>
              )
            })}

            {column.cases.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-6">No cases</div>
            )}
          </div>
        </div>
      ))}

      {columns.length === 0 && (
        <div className="text-center py-12 text-muted-foreground w-full">No cases to display.</div>
      )}

      {dragCase && hasMoved && (
        <div
          className="fixed z-50 w-64 pointer-events-none bg-card border-2 border-primary rounded-xl p-3 shadow-xl opacity-90"
          style={{ left: dragPos.x + 12, top: dragPos.y + 12 }}
        >
          {renderCardContents(dragCase, { step: dragCase.currentStep })}
        </div>
      )}
    </div>
  )
}
