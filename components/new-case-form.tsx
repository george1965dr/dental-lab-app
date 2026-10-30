"use client"

import type React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import RemakeReasonPopup from "./remake-reason-popup"
import { useState, useEffect, useRef } from "react"
import { User, Bluetooth as Tooth, Calendar, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { isCaseCompleted } from "@/lib/case-utils"

interface NewCaseFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (caseData: any) => void | Promise<void>
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

const PROCEDURES_REQUIRING_TEETH = [
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

/** One procedure queued up for the same patient; each becomes its own case. */
interface QueuedLine {
  id: string
  procedure: string
  teeth: number[]
  shade: string
  implantType: string
  remakeReason: string
  remakeNotes: string
  markCompleted: boolean
}

function buildWorkflow(procedure: string): string[] {
  switch (procedure.toLowerCase()) {
    case "crown":
    case "bridge":
    case "inlay":
    case "onlay":
    case "implant crown":
    case "implant bridge":
    case "remake":
      // "new" is the staging step: nothing has been touched yet. A case only moves into
      // "designed" once a technician actually advances it — it should never land there
      // just from being created.
      return ["new", "designed", "milled", "sintered", "completed"]
    case "temp crown":
    case "temp bridge":
      // Temp restorations are milled or 3D-printed, never sintered (that's only for
      // permanent ceramic work that goes through a sintering furnace).
      return ["new", "designed", "milled", "completed"]
    case "surgical guide":
      // Same as temp restorations: milled or 3D-printed, never sintered.
      return ["new", "designed", "3d_printed", "completed"]
    case "dx workup":
      // Digital-only (photos/scans reviewed on screen) — no lab fabrication steps.
      return ["new", "designed", "completed"]
    default:
      return ["new", "designed", "completed"]
  }
}

const implantTypes = ["Neodent Helix", "Neodent Helix Narrow", "BSB NP", "BSB RP", "3i C4.1", "3i C5.0"]

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
  const [queued, setQueued] = useState<QueuedLine[]>([])
  const [lineError, setLineError] = useState("")
  const detailsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    setShowRemakePopup(false)
    setToothSelectionError("")
    setQueued([])
    setLineError("")

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
        markCompleted: isCaseCompleted(editingCase),
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
  }, [editingCase, isOpen])

  const handleRemakeReasonSubmit = (reason: string, notes: string) => {
    setFormData((prev) => ({
      ...prev,
      remakeReason: reason,
      remakeNotes: notes,
    }))
    setShowRemakePopup(false)
  }

  const handleProcedureChange = (value: string) => {
    setFormData((prev) => ({ ...prev, procedure: value, shade: value === "Surgical Guide" ? "" : prev.shade }))

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

  // Checks the procedure line currently in the form. Returns false (and tells the
  // user why) when it can't be added/submitted yet.
  const validateLine = (): boolean => {
    if (PROCEDURES_REQUIRING_TEETH.includes(formData.procedure) && formData.teeth.length === 0) {
      setToothSelectionError("Please select at least one tooth for this procedure.")
      return false
    }

    if (formData.procedure === "Remake" && !formData.remakeReason) {
      alert("Please specify the reason for the remake.")
      setShowRemakePopup(true)
      return false
    }

    setToothSelectionError("")
    return true
  }

  const lineFromForm = (): QueuedLine => ({
    id: crypto.randomUUID(),
    procedure: formData.procedure,
    teeth: formData.teeth,
    shade: formData.shade,
    implantType: formData.implantType,
    remakeReason: formData.remakeReason,
    remakeNotes: formData.remakeNotes,
    markCompleted: formData.markCompleted,
  })

  // Parks the current procedure in the list and clears the per-procedure fields.
  // Shade is deliberately kept: it is usually the same for the whole patient.
  const addAnotherProcedure = () => {
    if (!formData.procedure) {
      setLineError("Choose a procedure first.")
      return
    }
    setLineError("")
    if (!validateLine()) return

    setQueued((prev) => [...prev, lineFromForm()])
    setFormData((prev) => ({
      ...prev,
      procedure: "",
      teeth: [],
      implantType: "",
      remakeReason: "",
      remakeNotes: "",
      markCompleted: false,
    }))
    detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const removeQueued = (id: string) => setQueued((prev) => prev.filter((line) => line.id !== id))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingCase) {
      if (!validateLine()) return

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
      onClose()
      return
    }

    // New case(s): everything already queued, plus the procedure still in the form
    // (if one is filled in, or if nothing has been queued at all).
    const lines = [...queued]
    if (formData.procedure || lines.length === 0) {
      if (!validateLine()) return
      lines.push(lineFromForm())
    }

    const newCases = lines.map((line) => {
      const workflow = buildWorkflow(line.procedure)
      return {
        // crypto.randomUUID() gives ~4 billion possible values in 8 hex chars —
        // collisions are effectively impossible, unlike the previous scheme which
        // only used the last 3 digits of the timestamp (1000 values, repeating
        // every second) and collided with real, pre-existing case IDs.
        id: `C${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`,
        patientName: formData.patientName,
        procedure: line.procedure,
        teeth: line.teeth.map(String),
        shade: line.shade,
        priority: formData.priority,
        startDate: formData.startDate,
        dueDate: formData.dueDate,
        currentStep: line.markCompleted ? "completed" : workflow[0],
        workflow,
        completedSteps: line.markCompleted ? workflow : [],
        notes: formData.notes,
        implantType: line.implantType,
        scanner: formData.scanner,
        remakeReason: line.remakeReason,
        remakeNotes: line.remakeNotes,
      }
    })

    // One at a time so the cards arrive in the order they were entered.
    void (async () => {
      for (const newCase of newCases) await onSubmit(newCase)
    })()
    onClose()
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
    const usedBy = queued.filter((line) => line.teeth.includes(toothNumber)).map((line) => line.procedure)
    return (
      <button
        key={toothNumber}
        type="button"
        onClick={() => handleTeethSelection(toothNumber)}
        title={usedBy.length > 0 ? `Already on: ${usedBy.join(", ")}` : undefined}
        className={`w-10 h-10 text-sm font-semibold rounded-xl border-2 transition-all duration-200 transform hover:scale-105 ${
          usedBy.length > 0 ? "ring-2 ring-primary/60 ring-offset-2 ring-offset-background " : ""
        }${
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
        <DialogContent className="max-w-5xl sm:max-w-5xl max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden rounded-2xl border-border bg-card">
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

                {!editingCase && queued.length > 0 && (
                  <Card className="border-0 shadow-sm bg-card rounded-xl">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                        Procedures for this patient ({queued.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {queued.map((line) => (
                          <li
                            key={line.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-2.5"
                          >
                            <p className="min-w-0 text-sm">
                              <span className="font-semibold text-foreground">{line.procedure}</span>
                              <span className="text-muted-foreground">
                                {line.teeth.length > 0 ? ` · Teeth ${[...line.teeth].sort((a, b) => a - b).join(", ")}` : ""}
                                {line.shade && line.shade !== "N/A" ? ` · Shade ${line.shade}` : ""}
                                {line.implantType ? ` · ${line.implantType}` : ""}
                              </span>
                            </p>
                            <button
                              type="button"
                              onClick={() => removeQueued(line.id)}
                              aria-label={`Remove ${line.procedure}`}
                              className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <div ref={detailsRef} className="scroll-mt-4">
                <Card className="border-0 shadow-sm bg-card rounded-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      {!editingCase && queued.length > 0 ? "Next procedure" : "Case Details"}
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
                          disabled={formData.procedure === "Surgical Guide"}
                        >
                          <SelectTrigger className="mt-2 h-10 rounded-xl border-border focus:border-primary text-base">
                            <SelectValue
                              placeholder={formData.procedure === "Surgical Guide" ? "Not applicable" : "Select shade"}
                            />
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
                </div>

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
                    {!editingCase && queued.length > 0 && (
                      <p className="mb-4 text-sm text-muted-foreground">
                        Outlined teeth are already part of another procedure for this patient.
                      </p>
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

                {!editingCase && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Same patient, another procedure?</p>
                      <p className="text-sm text-muted-foreground">
                        Add this one and keep going. Patient, dates, priority, scanner and notes are shared; each procedure
                        becomes its own case.
                      </p>
                      {lineError && <p className="mt-1 text-sm font-medium text-destructive">{lineError}</p>}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addAnotherProcedure}
                      className="shrink-0 rounded-xl bg-transparent"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add procedure
                    </Button>
                  </div>
                )}

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
                {editingCase
                  ? "Update Case"
                  : (() => {
                      const total = queued.length + (formData.procedure || queued.length === 0 ? 1 : 0)
                      return total > 1 ? `Create ${total} Cases` : "Create Case"
                    })()}
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
