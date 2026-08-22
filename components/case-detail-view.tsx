"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import PhotoGallery from "./photo-gallery"
import { Edit, Calendar, Clock, Bluetooth as Tooth, FileText, History, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2 } from "lucide-react"
import { getProcedureColors } from "@/lib/procedure-colors"
import { createClient } from "@/lib/supabase/client"

interface CaseDetailViewProps {
  isOpen: boolean
  onClose: () => void
  case_: any
  onEdit?: (case_: any) => void
}

// Dental chart data - US Universal Numbering System
const dentalChart = {
  upperRight: [1, 2, 3, 4, 5, 6, 7, 8], // Upper right quadrant (patient's right)
  upperLeft: [9, 10, 11, 12, 13, 14, 15, 16], // Upper left quadrant (patient's left)
  lowerLeft: [24, 23, 22, 21, 20, 19, 18, 17], // Lower left quadrant (patient's left)
  lowerRight: [32, 31, 30, 29, 28, 27, 26, 25], // Lower right quadrant (patient's right)
}

export default function CaseDetailView({ isOpen, onClose, case_, onEdit }: CaseDetailViewProps) {
  const [photos, setPhotos] = useState<any[]>([])
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (case_ && isOpen) {
      loadPhotos()
    }
  }, [case_, isOpen])

  const loadPhotos = async () => {
    if (!case_) return

    try {
      setIsLoadingPhotos(true)
      console.log("[v0] Loading photos for case:", case_.id)

      const { data, error } = await supabase
        .from("case_photos")
        .select("*")
        .eq("case_id", case_.id)
        .order("photo_order", { ascending: true })

      if (error) {
        console.error("[v0] Error loading photos:", error)
        throw error
      }

      console.log("[v0] Loaded photos:", data?.length || 0)
      setPhotos(data || [])
    } catch (error) {
      console.error("[v0] Failed to load photos:", error)
    } finally {
      setIsLoadingPhotos(false)
    }
  }

  if (!case_) return null

  const isCompleted = case_.completedSteps.length === case_.workflow.length
  const progressPercentage = (case_.completedSteps.length / case_.workflow.length) * 100

  const renderToothButton = (toothNumber: number) => {
    const isSelected = case_.teeth.includes(String(toothNumber)) || case_.teeth.includes(toothNumber)
    return (
      <div
        key={toothNumber}
        className={`w-8 h-8 text-xs font-medium rounded border-2 flex items-center justify-center ${
          isSelected
            ? "bg-accent text-accent-foreground border-accent shadow-lg shadow-accent/25"
            : "bg-background border-border"
        }`}
      >
        {toothNumber}
      </div>
    )
  }

  const getStepIcon = (step: string, isCompleted: boolean, isCurrent: boolean) => {
    if (isCompleted) return <CheckCircle2 className="h-4 w-4 text-success" />
    if (isCurrent) return <Clock className="h-4 w-4 text-accent" />
    return <div className="h-4 w-4 rounded-full border-2 border-border" />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getDaysRemaining = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysRemaining = getDaysRemaining(case_.dueDate)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border-border bg-card">
        <DialogHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <DialogTitle className="text-xl font-semibold text-foreground">
            Case Details - {case_.patientName}
          </DialogTitle>
          <Button variant="outline" size="sm" onClick={() => onEdit?.(case_)} className="mr-6">
            <Edit className="h-4 w-4 mr-2" />
            Edit Case
          </Button>
        </DialogHeader>

        {/* Case Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Case Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Case ID</label>
                  <p className="text-lg font-semibold">{case_.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Patient Name</label>
                  <p className="text-lg font-semibold">{case_.patientName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Procedure</label>
                  <div className="mt-1">
                    <Badge className={`${getProcedureColors(case_.procedure)} font-semibold`}>{case_.procedure}</Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Priority</label>
                  <Badge variant={case_.priority === "rush" ? "destructive" : "secondary"} className="mt-1">
                    {case_.priority.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Shade</label>
                  <p className="text-lg font-semibold">{case_.shade}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Selected Teeth</label>
                  <p className="text-lg font-semibold">{case_.teeth.join(", ")}</p>
                </div>
                {case_.implantType && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Implant Type</label>
                    <p className="text-lg font-semibold">{case_.implantType}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                <p className="font-semibold">{formatDate(case_.startDate)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Due Date</label>
                <p className="font-semibold">{formatDate(case_.dueDate)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Days Remaining</label>
                <p
                  className={`font-semibold ${daysRemaining < 0 ? "text-destructive" : daysRemaining <= 2 ? "text-warning" : "text-success"}`}
                >
                  {daysRemaining < 0
                    ? `${Math.abs(daysRemaining)} days overdue`
                    : daysRemaining === 0
                      ? "Due today"
                      : `${daysRemaining} days remaining`}
                </p>
              </div>
              {isCompleted && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Completed</label>
                  <p className="font-semibold text-success">✓ Case completed</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Patient Photos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPhotos ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Loading photos...</p>
              </div>
            ) : (
              <PhotoGallery caseId={case_.id} photos={photos} onPhotosChange={loadPhotos} />
            )}
          </CardContent>
        </Card>

        {/* Dental Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tooth className="h-5 w-5" />
              Dental Chart - Selected Teeth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Upper Jaw */}
              <div>
                <label className="text-sm font-medium mb-2 block">Upper Jaw</label>
                <div className="flex justify-center gap-1">
                  <span className="text-xs text-muted-foreground w-16 flex items-center">Patient's Right</span>
                  {dentalChart.upperRight.map(renderToothButton)}
                  <span className="w-4"></span>
                  {dentalChart.upperLeft.map(renderToothButton)}
                  <span className="text-xs text-muted-foreground w-16 flex items-center">Patient's Left</span>
                </div>
              </div>

              {/* Lower Jaw */}
              <div>
                <label className="text-sm font-medium mb-2 block">Lower Jaw</label>
                <div className="flex justify-center gap-1">
                  <span className="text-xs text-muted-foreground w-16 flex items-center">Patient's Right</span>
                  {dentalChart.lowerRight.map(renderToothButton)}
                  <span className="w-4"></span>
                  {dentalChart.lowerLeft.map(renderToothButton)}
                  <span className="text-xs text-muted-foreground w-16 flex items-center">Patient's Left</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Workflow Progress
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {isCompleted
                ? "Case completed successfully"
                : `Currently on step ${case_.completedSteps.length + 1} of ${case_.workflow.length}`}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Progress</span>
                <span>{Math.round(progressPercentage)}% Complete</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>

            {/* Workflow Timeline */}
            <div className="space-y-4">
              <h4 className="font-semibold">Workflow Timeline</h4>
              <div className="space-y-3">
                {case_.workflow.map((step, index) => {
                  const isCompleted = case_.completedSteps.includes(step)
                  const isCurrent = step === case_.currentStep
                  const isPending = !isCompleted && !isCurrent

                  return (
                    <div key={step} className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8">
                        {getStepIcon(step, isCompleted, isCurrent)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h5
                            className={`font-medium ${
                              isCompleted ? "text-success" : isCurrent ? "text-accent" : "text-muted-foreground"
                            }`}
                          >
                            {step.charAt(0).toUpperCase() + step.slice(1)}
                          </h5>
                          <Badge
                            variant={isCompleted ? "default" : isCurrent ? "secondary" : "outline"}
                            className={
                              isCompleted ? "bg-success/10 text-success" : isCurrent ? "bg-accent/10 text-accent" : ""
                            }
                          >
                            {isCompleted ? "Completed" : isCurrent ? "In Progress" : "Pending"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {isCompleted
                            ? "This step has been completed"
                            : isCurrent
                              ? "Currently working on this step"
                              : "Waiting to start this step"}
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground">Step {index + 1}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Case Notes</h4>
                <p className="text-sm text-muted-foreground">{case_.notes || "No additional notes for this case."}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Last Updated</h4>
                <p className="text-sm text-muted-foreground">
                  {case_.lastUpdated ? formatDate(case_.lastUpdated) : "No recent updates"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
