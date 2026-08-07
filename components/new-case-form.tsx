"use client"

import type React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import RemakeReasonPopup from "./remake-reason-popup"
import { useState, useEffect } from "react"
import { User, Bluetooth as Tooth, Calendar } from "lucide-react" // Added Calendar icon import
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"

interface NewCaseFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (caseData: any) => void
  editingCase?: any
}

const dentalChart = {
  upperRight: [1, 2, 3, 4, 5, 6, 7, 8], // Upper right quadrant (patient's right)
  upperLeft: [9, 10, 11, 12, 13, 14, 15, 16], // Upper left quadrant (patient's left)
  lowerRight: [32, 31, 30, 29, 28, 27, 26, 25], // Lower right quadrant (patient's right)
  lowerLeft: [24, 23, 22, 21, 20, 19, 18, 17], // Lower left quadrant (patient's left)
}

const shadeOptions = [
  "A1",
  "A2",
  "A3",
  "A3.5",
  "A4",
  "B1",
  "B2",
  "B3",
  "B4",
  "BL1",
  "BL2",
  "BL3",
  "BL4",
  "C1",
  "C2",
  "C3",
  "C4",
  "D2",
  "D3",
  "D4",
  "Clear",
  "N/A",
]

const procedures = [
  "Crown",
  "Bridge",
  "Inlay",
  "Onlay",
  "Implant Crown",
  "Implant Bridge",
  "Surgical Guide",
  "Remake",
  "Temp Crown",
  "Temp Bridge",
  "Dx Workup",
]

const implantTypes = ["BSB NP", "BSB RP", "Forte", "Megagen"]

const scannerDevices = ["Primescan", "Aoralscan"]

export default function NewCaseForm({ isOpen, onClose, onSubmit, editingCase }: NewCaseFormProps) {
  const [formData, setFormData] = useState({
    patientName: "",
    startDate: "",
    dueDate: "",
    priority: "normal",
    procedure: "",
    teeth: [] as number[],
    shade: "",
    notes: "",
    implantType: "",
    scanner: "",
    remakeReason: "",
    remakeNotes: "",
    markCompleted: false,
  })

  const [showRemakePopup, setShowRemakePopup] = useState(false)

  const [toothSelectionError, setToothSelectionError] = useState("")

  useEffect(() => {
    console.log("[v0] NewCaseForm useEffect triggered")
    console.log("[v0] editingCase:", editingCase)

    if (editingCase) {
      let remakeReason = ""
      let remakeNotes = ""
      let cleanNotes = editingCase.notes || ""

      console.log("[v0] Original notes:", editingCase.notes)
      console.log("[v0] Procedure:", editingCase.procedure)

      if (editingCase.procedure === "Remake" && editingCase.notes) {
        console.log("[v0] Parsing remake data from notes")
        // Parse remake reason from notes field format: "Remake Reason: fit\nRemake Notes: additional info"
        const remakeReasonMatch = editingCase.notes.match(/Remake Reason: ([^\n]+)/)
        const remakeNotesMatch = editingCase.notes.match(/Remake Notes: ([^\n]+)/)

        console.log("[v0] Remake reason match:", remakeReasonMatch)
        console.log("[v0] Remake notes match:", remakeNotesMatch)

        if (remakeReasonMatch) {
          remakeReason = remakeReasonMatch[1].trim()
          console.log("[v0] Extracted remake reason:", remakeReason)
        }
        if (remakeNotesMatch) {
          remakeNotes = remakeNotesMatch[1].trim()
          console.log("[v0] Extracted remake notes:", remakeNotes)
        }

        // Remove remake information from notes to get clean notes
        cleanNotes = editingCase.notes
          .replace(/Remake Reason: [^\n]+\n?/, "")
          .replace(/Remake Notes: [^\n]+\n?/, "")
          .trim()

        console.log("[v0] Clean notes after parsing:", cleanNotes)
      }

      const newFormData = {
        patientName: editingCase.patientName || "",
        startDate: editingCase.startDate || "",
        dueDate: editingCase.dueDate || "",
        priority: editingCase.priority || "normal",
        procedure: editingCase.procedure || "",
        teeth: editingCase.teeth ? editingCase.teeth.map(Number) : [],
        shade: editingCase.shade || "",
        notes: cleanNotes,
        implantType: editingCase.implantType || "",
        scanner: editingCase.scanner || "",
        remakeReason: remakeReason,
        remakeNotes: remakeNotes,
        markCompleted:
          editingCase.workflow?.length > 0 && editingCase.completedSteps?.length === editingCase.workflow?.length,
      }

      console.log("[v0] Setting form data:", newFormData)
      setFormData(newFormData)
    } else {
      setFormData({
        patientName: "",
        startDate: "",
        dueDate: "",
        priority: "normal",
        procedure: "",
        teeth: [],
        shade: "",
        notes: "",
        implantType: "",
        scanner: "",
        remakeReason: "",
        remakeNotes: "",
        markCompleted: false,
      })
    }
  }, [editingCase])

  const handleRemakeReasonSubmit = (reason: string, notes: string) => {
    setFormData((prev) => ({
      ...prev,
      remakeReason: reason,
      remakeNotes: notes,
    }))
    setShowRemakePopup(false)
  }

  const handleProcedureChange = (value: string) => {
    setFormData((prev) => ({ ...prev, procedure: value }))

    if (value === "Remake") {
      console.log("[v0] Remake procedure selected")
      console.log("[v0] editingCase:", editingCase)
      console.log("[v0] Current formData.remakeReason:", formData.remakeReason)

      if (editingCase && editingCase.procedure === "Remake" && formData.remakeReason) {
        console.log("[v0] Skipping remake popup - existing remake case with reason")
        return
      }
      // Show popup for new cases or when switching to Remake
      console.log("[v0] Showing remake popup")
      setShowRemakePopup(true)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const proceduresRequiringTeeth = [
      "Crown",
      "Implant Crown",
      "Bridge",
      "Implant Bridge",
      "Inlay",
      "Onlay",
      "Surgical Guide",
      "Remake",
      "Temp Crown",
      "Temp Bridge",
    ]

    if (proceduresRequiringTeeth.includes(formData.procedure) && formData.teeth.length === 0) {
      setToothSelectionError("Please select at least one tooth for this procedure.")
      return
    }

    if (formData.procedure === "Remake" && !formData.remakeReason) {
      alert("Please specify the reason for the remake.")
      setShowRemakePopup(true)
      return
    }

    setToothSelectionError("")

    const submitCase = () => {
      if (editingCase) {
        const workflow: string[] = editingCase.workflow || []
        const completedSteps = formData.markCompleted ? workflow : editingCase.completedSteps
        const currentStep = formData.markCompleted ? "completed" : editingCase.currentStep

        const updatedCase = {
          ...editingCase,
          patientName: formData.patientName,
          procedure: formData.procedure,
          teeth: formData.teeth.map(String),
          shade: formData.shade,
          priority: formData.priority,
          startDate: formData.startDate,
          dueDate: formData.dueDate,
          notes: formData.notes,
          implantType: formData.implantType,
          scanner: formData.scanner,
          remakeReason: formData.remakeReason,
          remakeNotes: formData.remakeNotes,
          completedSteps,
          currentStep,
        }
        onSubmit(updatedCase)
      } else {
        const caseId = `C${String(Date.now()).slice(-3).padStart(3, "0")}`

        let workflow: string[] = []
        switch (formData.procedure.toLowerCase()) {
          case "crown":
          case "bridge":
          case "inlay":
          case "onlay":
          case "implant crown":
          case "implant bridge":
          case "remake":
          case "temp crown":
          case "temp bridge":
            // "new" is the staging step: nothing has been touched yet. A case only moves into
            // "designed" once a technician actually advances it — it should never land there
            // just from being created.
            workflow = ["new", "designed", "milled", "sintered", "completed"]
            break
          case "surgical guide":
            workflow = ["new", "designed", "3d_printed", "completed"]
            break
          case "dx workup":
            // Digital-only (photos/scans reviewed on screen) — no lab fabrication steps, just done or not.
            // Named "reviewed" rather than "completed" so an untouched case (currentStep = workflow[0])
            // is never confused with the shared terminal "completed" marker other workflows advance into.
            workflow = ["reviewed"]
            break
          default:
            workflow = ["new", "designed", "completed"]
        }

        const newCase = {
          id: caseId,
          patientName: formData.patientName,
          procedure: formData.procedure,
          teeth: formData.teeth.map(String),
          shade: formData.shade,
          priority: formData.priority,
          startDate: formData.startDate,
          dueDate: formData.dueDate,
          currentStep: formData.markCompleted ? "completed" : workflow[0],
          workflow,
          completedSteps: formData.markCompleted ? workflow : [],
          notes: formData.notes,
          implantType: formData.implantType,
          scanner: formData.scanner,
          remakeReason: formData.remakeReason,
          remakeNotes: formData.remakeNotes,
        }
        onSubmit(newCase)
      }

      onClose()
    }

    submitCase()
  }

  const handleTeethSelection = (toothNumber: number) => {
    setToothSelectionError("")
    setFormData((prev) => ({
      ...prev,
      teeth: prev.teeth.includes(toothNumber)
        ? prev.teeth.filter((t) => t !== toothNumber)
        : [...prev.teeth, toothNumber],
    }))
  }

  const renderToothButton = (toothNumber: number) => {
    const isSelected = formData.teeth.includes(toothNumber)
    return (
      <button
        key={toothNumber}
        type="button"
        onClick={() => handleTeethSelection(toothNumber)}
        className={`w-10 h-10 text-sm font-semibold rounded-xl border-2 transition-all duration-200 transform hover:scale-105 ${
          isSelected
            ? "bg-accent text-accent-foreground border-accent shadow-lg shadow-accent/25"
            : "bg-background border-border hover:border-primary hover:shadow-md text-foreground"
        }`}
      >
        {toothNumber}
      </button>
    )
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl sm:max-w-3xl max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden rounded-2xl border-border bg-card">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle className="text-xl font-semibold text-foreground">
              {editingCase ? "Edit Case - Dr G's Lab" : "New Case - Dr G's Lab"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-6">
                <Card className="border-0 shadow-sm bg-card rounded-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <User className="h-5 w-5" />
                      Patient Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="patientName" className="text-sm font-medium text-foreground">
                        Patient Name *
                      </Label>
                      <Input
                        id="patientName"
                        value={formData.patientName}
                        onChange={(e) => setFormData((prev) => ({ ...prev, patientName: e.target.value }))}
                        placeholder="Enter patient full name"
                        className="mt-2 h-10 rounded-xl border-border focus:border-primary focus:ring-primary/20"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="startDate" className="text-sm font-medium text-foreground">
                          Start Date *
                        </Label>
                        <div className="relative mt-2">
                          <Input
                            id="startDate"
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                            className="h-10 rounded-xl border-border focus:border-ring bg-input pr-10"
                            required
                          />
                          <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="dueDate" className="text-sm font-medium text-foreground">
                          Due Date *
                        </Label>
                        <div className="relative mt-2">
                          <Input
                            id="dueDate"
                            type="date"
                            value={formData.dueDate}
                            onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                            className="h-10 rounded-xl border-border focus:border-ring bg-input pr-10"
                            required
                          />
                          <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-foreground">Priority *</Label>
                        <RadioGroup
                          value={formData.priority}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, priority: value }))}
                          className="flex gap-4 mt-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value="normal"
                              id="normal"
                              className="border-2 border-muted-foreground text-foreground data-[state=checked]:bg-muted-foreground data-[state=checked]:border-muted-foreground"
                            />
                            <Label htmlFor="normal" className="font-medium text-foreground">
                              Normal
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value="rush"
                              id="rush"
                              className="border-2 border-destructive text-destructive data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                            />
                            <Label htmlFor="rush" className="font-medium text-destructive">
                              Rush
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-card rounded-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      Case Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="procedure" className="text-sm font-medium text-foreground">
                          Procedure *
                        </Label>
                        <Select value={formData.procedure} onValueChange={handleProcedureChange}>
                          <SelectTrigger className="mt-2 h-10 rounded-xl border-border focus:border-primary text-base">
                            <SelectValue placeholder="Select procedure" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {procedures.map((procedure) => (
                              <SelectItem key={procedure} value={procedure} className="rounded-lg text-base">
                                {procedure}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="shade" className="text-sm font-medium text-foreground">
                          Shade
                        </Label>
                        <Select
                          value={formData.shade}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, shade: value }))}
                        >
                          <SelectTrigger className="mt-2 h-10 rounded-xl border-border focus:border-primary text-base">
                            <SelectValue placeholder="Select shade" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {shadeOptions.map((shade) => (
                              <SelectItem key={shade} value={shade} className="rounded-lg text-base">
                                {shade}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {(formData.procedure === "Implant Crown" || formData.procedure === "Implant Bridge") && (
                      <div>
                        <Label htmlFor="implantType" className="text-sm font-medium text-foreground">
                          Implant Type *
                        </Label>
                        <Select
                          value={formData.implantType}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, implantType: value }))}
                        >
                          <SelectTrigger className="mt-2 h-10 rounded-xl border-border focus:border-primary text-base">
                            <SelectValue placeholder="Select implant type" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {implantTypes.map((type) => (
                              <SelectItem key={type} value={type} className="rounded-lg text-base">
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Scanner Device Selection */}
                    <div>
                      <Label className="text-sm font-medium text-foreground">Scanner Device</Label>
                      <RadioGroup
                        value={formData.scanner}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, scanner: value }))}
                        className="flex gap-4 mt-2"
                      >
                        {scannerDevices.map((device) => (
                          <div key={device} className="flex items-center space-x-2">
                            <RadioGroupItem value={device} id={`scanner-${device}`} />
                            <Label htmlFor={`scanner-${device}`} className="text-sm font-normal cursor-pointer">
                              {device}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox
                        id="markCompleted"
                        checked={formData.markCompleted}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({ ...prev, markCompleted: checked === true }))
                        }
                      />
                      <Label htmlFor="markCompleted" className="text-sm font-medium text-foreground cursor-pointer">
                        Mark as Completed
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        (checks off every workflow step at once)
                      </span>
                    </div>

                    {formData.procedure === "Remake" && formData.remakeReason && (
                      <div className="col-span-2">
                        <Label className="text-sm font-medium text-foreground mb-2 block">Remake Reason</Label>
                        <div
                          onClick={() => {
                            console.log("[v0] Remake reason section clicked")
                            console.log("[v0] Current showRemakePopup state:", showRemakePopup)
                            console.log("[v0] Setting showRemakePopup to true")
                            setShowRemakePopup(true)
                          }}
                          className="p-4 bg-warning/10 border-2 border-warning/30 rounded-lg cursor-pointer hover:bg-warning/15 hover:border-warning/50 transition-all duration-200 group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-warning capitalize">{formData.remakeReason}</p>
                              {formData.remakeNotes && (
                                <p className="text-sm text-warning mt-1">{formData.remakeNotes}</p>
                              )}
                            </div>
                            <div className="ml-3 opacity-60 group-hover:opacity-100 transition-opacity">
                              <svg
                                className="w-4 h-4 text-warning"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </div>
                          </div>
                          <p className="text-xs text-warning mt-2 opacity-70 group-hover:opacity-100 transition-opacity">
                            Click to edit remake reason
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-card rounded-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
                      <div className="p-2 bg-success text-success-foreground rounded-xl">
                        <Tooth className="h-4 w-4" />
                      </div>
                      Tooth Selection
                      {[
                        "Crown",
                        "Implant Crown",
                        "Bridge",
                        "Implant Bridge",
                        "Inlay",
                        "Onlay",
                        "Surgical Guide",
                        "Remake",
                        "Temp Crown",
                        "Temp Bridge",
                      ].includes(formData.procedure) && <span className="text-destructive text-sm">*</span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {toothSelectionError && (
                      <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="text-destructive text-sm font-medium">{toothSelectionError}</p>
                      </div>
                    )}
                    <div className="space-y-8">
                      <div className="bg-muted/50 p-6 rounded-2xl">
                        <Label className="text-base font-semibold text-foreground mb-4 block">Upper Jaw</Label>
                        <div className="flex justify-center gap-3">
                          <div className="flex gap-2">{dentalChart.upperRight.map(renderToothButton)}</div>
                          <div className="w-8 flex items-center justify-center">
                            <div className="h-px w-6 bg-border"></div>
                          </div>
                          <div className="flex gap-2">{dentalChart.upperLeft.map(renderToothButton)}</div>
                        </div>
                      </div>

                      <div className="bg-muted/30 p-6 rounded-2xl">
                        <Label className="text-base font-semibold text-foreground mb-4 block">Lower Jaw</Label>
                        <div className="flex justify-center gap-3">
                          <div className="flex gap-2">{dentalChart.lowerRight.map(renderToothButton)}</div>
                          <div className="w-8 flex items-center justify-center">
                            <div className="h-px w-6 bg-border"></div>
                          </div>
                          <div className="flex gap-2">{dentalChart.lowerLeft.map(renderToothButton)}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-card rounded-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      Additional Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Enter any additional notes or special instructions..."
                      className="w-full h-32 p-4 border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background text-base text-foreground placeholder:text-muted-foreground"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex-shrink-0 flex justify-end gap-3 p-4 border-t border-border bg-muted/50">
              <Button type="button" variant="outline" onClick={onClose} className="px-6 rounded-xl bg-transparent">
                Cancel
              </Button>
              <Button type="submit" className="px-6 rounded-xl">
                {editingCase ? "Update Case" : "Create Case"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <RemakeReasonPopup
        isOpen={showRemakePopup}
        onClose={() => {
          console.log("[v0] Remake popup closing")
          setShowRemakePopup(false)
        }}
        onSubmit={handleRemakeReasonSubmit}
      />
    </>
  )
}
