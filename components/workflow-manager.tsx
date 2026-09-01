"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowRight, CheckCircle2, Clock, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getProcedureColors } from "@/lib/procedure-colors"
import { isCaseCompleted } from "@/lib/case-utils"
import { formatLocalDate } from "@/lib/date-utils"

interface WorkflowManagerProps {
  isOpen: boolean
  onClose: () => void
  case_: any
  onUpdateWorkflow: (caseId: string, updates: any) => void
}

export default function WorkflowManager({ isOpen, onClose, case_, onUpdateWorkflow }: WorkflowManagerProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  if (!case_) return null

  const currentStepIndex = case_.completedSteps.length
  const nextStep = currentStepIndex < case_.workflow.length ? case_.workflow[currentStepIndex] : null
  const isCompleted = isCaseCompleted(case_)

  console.log("[v0] Current case:", case_)
  console.log("[v0] Current step index:", currentStepIndex)
  console.log("[v0] Next step:", nextStep)
  console.log("[v0] Is completed:", isCompleted)

  const handleAdvanceStep = async () => {
    if (!nextStep) return

    setIsUpdating(true)
    console.log("[v0] Advancing from step:", case_.currentStep, "to:", nextStep)

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    const updatedCompletedSteps = [...case_.completedSteps, nextStep]
    const newCurrentStepIndex = updatedCompletedSteps.length
    const newCurrentStep =
      newCurrentStepIndex < case_.workflow.length ? case_.workflow[newCurrentStepIndex] : "completed"

    const updates = {
      currentStep: newCurrentStep,
      completedSteps: updatedCompletedSteps,
      lastUpdated: new Date().toISOString(),
    }

    console.log("[v0] Workflow updates:", updates)
    onUpdateWorkflow(case_.id, updates)
    setIsUpdating(false)
    onClose()
  }

  const handleMarkComplete = async () => {
    setIsUpdating(true)
    console.log("[v0] Marking case complete")

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    const updates = {
      currentStep: "completed",
      completedSteps: case_.workflow,
      completedDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    }

    console.log("[v0] Complete updates:", updates)
    onUpdateWorkflow(case_.id, updates)
    setIsUpdating(false)
    onClose()
  }

  const handleRevertStep = async () => {
    if (case_.completedSteps.length === 0) return

    setIsUpdating(true)
    console.log("[v0] Reverting step")

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    const newCompletedSteps = case_.completedSteps.slice(0, -1)
    const newCurrentStepIndex = newCompletedSteps.length
    const newCurrentStep =
      newCurrentStepIndex < case_.workflow.length ? case_.workflow[newCurrentStepIndex] : case_.workflow[0]

    const updates = {
      currentStep: newCurrentStep,
      completedSteps: newCompletedSteps,
      lastUpdated: new Date().toISOString(),
    }

    console.log("[v0] Revert updates:", updates)
    onUpdateWorkflow(case_.id, updates)
    setIsUpdating(false)
    onClose()
  }

  const getStepStatus = (step: string) => {
    if (case_.completedSteps.includes(step)) return "completed"
    // The terminal "completed" step may not literally be in completedSteps yet
    // (see isCaseCompleted) even though the case as a whole now counts as done.
    if (step === "completed" && isCompleted) return "completed"
    if (step === nextStep && !isCompleted) return "current"
    return "pending"
  }

  const getStepIcon = (step: string) => {
    const status = getStepStatus(step)
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-success" />
      case "current":
        return <Clock className="h-5 w-5 text-accent" />
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-border" />
    }
  }

  const getStepColor = (step: string) => {
    const status = getStepStatus(step)
    switch (status) {
      case "completed":
        return "bg-success/10 text-success border-success/20"
      case "current":
        return "bg-accent/10 text-accent border-accent/20"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            Workflow Management - {case_?.patientName || "Case"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Case Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Case Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Case ID:</span> {case_.id}
                </div>
                <div>
                  <span className="font-medium">Procedure:</span>
                  <Badge className={`ml-2 ${getProcedureColors(case_.procedure)} font-semibold`}>{case_.procedure}</Badge>
                </div>
                <div>
                  <span className="font-medium">Priority:</span>
                  <Badge variant={case_.priority === "rush" ? "destructive" : "secondary"} className="ml-2">
                    {case_.priority.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Due Date:</span> {formatLocalDate(case_.dueDate)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workflow Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Workflow Progress</CardTitle>
              <p className="text-sm text-muted-foreground">
                Step {case_.completedSteps.length + 1} of {case_.workflow.length}
                {isCompleted && " - Completed"}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Visual Workflow */}
                <div className="flex flex-wrap gap-2">
                  {case_.workflow.map((step, index) => (
                    <div key={step} className="flex items-center">
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${getStepColor(step)}`}>
                        {getStepIcon(step)}
                        <span className="font-medium">{step.charAt(0).toUpperCase() + step.slice(1)}</span>
                      </div>
                      {index < case_.workflow.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground mx-2" />}
                    </div>
                  ))}
                </div>

                {/* Current Status */}
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-accent" />
                    <span className="font-medium">Current Status</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isCompleted
                      ? "This case has been completed successfully."
                      : case_.workflow.length === 1
                        ? "No lab steps required for this case — just confirm it's done."
                        : `Next step to complete: ${nextStep?.charAt(0).toUpperCase() + nextStep?.slice(1)}`}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Completed steps: {isCompleted ? case_.workflow.length : case_.completedSteps.length} of{" "}
                    {case_.workflow.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <div>
              {(case_.completedSteps.length > 0 || isCompleted) && (
                <Button
                  variant="outline"
                  onClick={handleRevertStep}
                  disabled={isUpdating}
                  className="text-warning border-warning/30 hover:bg-warning/10 bg-transparent"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {isCompleted ? "Reopen Case" : "Revert Step"}
                </Button>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} disabled={isUpdating}>
                Cancel
              </Button>

              {!isCompleted && nextStep && (
                <Button
                  onClick={handleAdvanceStep}
                  disabled={isUpdating}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {isUpdating ? (
                    "Updating..."
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      {case_.workflow.length === 1 ? "Mark Completed" : `Complete ${nextStep.charAt(0).toUpperCase() + nextStep.slice(1)}`}
                    </>
                  )}
                </Button>
              )}

              {isCompleted && (
                <Button disabled className="bg-success text-success-foreground">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Case Completed
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
