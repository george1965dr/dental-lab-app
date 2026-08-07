"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Search,
  Plus,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Users,
  LogOut,
  FileText,
  CheckCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import KanbanBoard from "@/components/kanban-board"
import NewCaseForm from "@/components/new-case-form"
import WorkflowManager from "@/components/workflow-manager"
import CaseDetailView from "@/components/case-detail-view"
import PatientListPopup from "@/components/patient-list-popup"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { jsPDF } from "jspdf"
import { getProcedureColors } from "@/lib/procedure-colors"

export default function DashboardPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [procedureFilter, setProcedureFilter] = useState("all")
  const [isNewCaseFormOpen, setIsNewCaseFormOpen] = useState(false)
  const [isWorkflowManagerOpen, setIsWorkflowManagerOpen] = useState(false)
  const [isCaseDetailOpen, setIsCaseDetailOpen] = useState(false)
  const [isPatientListOpen, setIsPatientListOpen] = useState(false)
  const [isFilteredListOpen, setIsFilteredListOpen] = useState(false)
  const [filteredListType, setFilteredListType] = useState<string>("")
  const [filteredListTitle, setFilteredListTitle] = useState<string>("")
  const [selectedCase, setSelectedCase] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [isDueDateReportOpen, setIsDueDateReportOpen] = useState(false)
  const [selectedReportDate, setSelectedReportDate] = useState("")

  const [cases, setCases] = useState<any[]>([])
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadCases()

      console.log("[v0] Setting up real-time subscription...")

      const channel = supabase
        .channel("cases-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "cases",
          },
          (payload) => {
            console.log("[v0] Real-time update received:", payload)
            console.log("[v0] Event type:", payload.eventType)
            console.log("[v0] New data:", payload.new)
            console.log("[v0] Old data:", payload.old)

            if (payload.eventType === "INSERT") {
              const newCase = transformDbCase(payload.new)
              setCases((prev) => [newCase, ...prev])
              console.log("[v0] Added new case via real-time:", newCase.id)
            } else if (payload.eventType === "UPDATE") {
              const updatedCase = transformDbCase(payload.new)
              console.log("[v0] Processing UPDATE event for case:", updatedCase.id)
              console.log("[v0] Updated case data:", updatedCase)

              setCases((prev) => {
                const updated = prev.map((case_) => (case_.id === updatedCase.id ? updatedCase : case_))
                console.log("[v0] Updated cases array")
                return updated
              })

              setSelectedCase((currentSelected) => {
                if (currentSelected && currentSelected.id === updatedCase.id) {
                  console.log("[v0] Updating selected case with new data:", updatedCase)
                  console.log("[v0] Previous selected case:", currentSelected)
                  return updatedCase
                }
                console.log("[v0] Selected case not updated (different ID or no selection)")
                return currentSelected
              })

              console.log("[v0] Updated case via real-time:", updatedCase.id)
            } else if (payload.eventType === "DELETE") {
              setCases((prev) => prev.filter((case_) => case_.id !== payload.old.id))

              setSelectedCase((currentSelected) => {
                if (currentSelected && currentSelected.id === payload.old.id) {
                  console.log("[v0] Clearing selected case as it was deleted")
                  setIsCaseDetailOpen(false)
                  setIsWorkflowManagerOpen(false)
                  return null
                }
                return currentSelected
              })

              console.log("[v0] Deleted case via real-time:", payload.old.id)
            }
          },
        )
        .subscribe((status) => {
          console.log("[v0] Real-time subscription status:", status)
        })

      console.log("[v0] Real-time channel created:", channel)

      // Cleanup subscription on unmount
      return () => {
        console.log("[v0] Cleaning up real-time subscription")
        supabase.removeChannel(channel)
      }
    }
  }, [user]) // Removed selectedCase from dependency array to prevent subscription recreation

  const checkUser = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        router.push("/auth/login")
        return
      }

      setUser(user)
      console.log("[v0] User authenticated:", user.email)
    } catch (err) {
      console.error("[v0] Error checking user:", err)
      router.push("/auth/login")
    }
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.push("/auth/login")
    } catch (err) {
      console.error("[v0] Error signing out:", err)
      setError("Failed to sign out")
    }
  }

  const transformDbCase = (dbCase: any) => ({
    id: dbCase.id,
    patientName: dbCase.patient_name,
    procedure: dbCase.procedure,
    priority: dbCase.priority,
    teeth: dbCase.teeth || [],
    shade: dbCase.shade,
    implantType: dbCase.implant_type,
    scanner: dbCase.scanner,
    startDate: dbCase.start_date,
    dueDate: dbCase.due_date,
    createdDate: dbCase.created_date,
    workflow: dbCase.workflow || [],
    completedSteps: dbCase.completed_steps || [],
    currentStep: dbCase.current_step,
    notes: dbCase.notes,
  })

  const loadCases = async () => {
    try {
      setIsLoading(true)
      setError(null)
      console.log("[v0] Starting to load cases...")

      const { data, error: fetchError } = await supabase
        .from("cases")
        .select("*")
        .order("created_at", { ascending: false })

      console.log("[v0] Raw data from Supabase:", data)
      console.log("[v0] Fetch error:", fetchError)

      if (fetchError) {
        console.error("[v0] Database fetch error:", fetchError)
        throw fetchError
      }

      const transformedCases = data?.map(transformDbCase) || []

      setCases(transformedCases)
      console.log("[v0] Loaded cases from Supabase:", transformedCases.length)
      console.log("[v0] Transformed cases:", transformedCases)
    } catch (err) {
      console.error("[v0] Error loading cases:", err)
      setError(err instanceof Error ? err.message : "Failed to load cases")
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewCase = async (newCase: any) => {
    try {
      setError(null)
      console.log("[v0] Starting handleNewCase with data:", newCase)
      console.log("[v0] Selected case for editing:", selectedCase)

      const isImplantProcedure = newCase.procedure === "Implant Crown" || newCase.procedure === "Implant Bridge"
      const validImplantTypes = ["BSB NP", "BSB RP", "Forte", "Megagen"]
      const implantType =
        isImplantProcedure && validImplantTypes.includes(newCase.implantType) ? newCase.implantType : null

      console.log("[v0] Processed implant type:", implantType, "for procedure:", newCase.procedure)

      if (selectedCase) {
        console.log("[v0] UPDATING EXISTING CASE")
        console.log("[v0] Case ID to update:", selectedCase.id)

        let notesWithRemake = newCase.notes || ""
        if (newCase.procedure === "Remake" && (newCase.remakeReason || newCase.remakeNotes)) {
          const remakeInfo = []
          if (newCase.remakeReason) remakeInfo.push(`Remake Reason: ${newCase.remakeReason}`)
          if (newCase.remakeNotes) remakeInfo.push(`Remake Notes: ${newCase.remakeNotes}`)
          notesWithRemake = remakeInfo.join("; ") + (notesWithRemake ? `; ${notesWithRemake}` : "")
        }

        const { data, error: updateError } = await supabase
          .from("cases")
          .update({
            patient_name: newCase.patientName,
            procedure: newCase.procedure,
            priority: newCase.priority,
            teeth: newCase.teeth,
            shade: newCase.shade,
            implant_type: implantType,
            scanner: newCase.scanner || null,
            start_date: newCase.startDate,
            due_date: newCase.dueDate,
            workflow: newCase.workflow,
            completed_steps: newCase.completedSteps,
            current_step: newCase.currentStep,
            notes: notesWithRemake,
          })
          .eq("id", selectedCase.id)
          .select()

        console.log("[v0] Update response data:", data)
        console.log("[v0] Update error:", updateError)

        if (updateError) {
          console.error("[v0] Update error details:", updateError)
          throw updateError
        }

        console.log("[v0] Case updated successfully")

        if (data && data[0]) {
          const updatedCase = transformDbCase(data[0])

          setSelectedCase(updatedCase)
          setCases((prev) => prev.map((case_) => (case_.id === updatedCase.id ? updatedCase : case_)))

          console.log("[v0] Updated selectedCase and cases array with fresh data:", updatedCase)
        }

        setIsNewCaseFormOpen(false)
      } else {
        // Create new case
        console.log("[v0] CREATING NEW CASE")
        console.log("[v0] Creating new case with ID:", newCase.id)
        console.log("[v0] User ID:", user?.id)

        let notesWithRemake = newCase.notes || ""
        if (newCase.procedure === "Remake" && (newCase.remakeReason || newCase.remakeNotes)) {
          const remakeInfo = []
          if (newCase.remakeReason) remakeInfo.push(`Remake Reason: ${newCase.remakeReason}`)
          if (newCase.remakeNotes) remakeInfo.push(`Remake Notes: ${newCase.remakeNotes}`)
          notesWithRemake = remakeInfo.join("; ") + (notesWithRemake ? `; ${notesWithRemake}` : "")
        }

        const caseData = {
          id: newCase.id,
          patient_name: newCase.patientName,
          procedure: newCase.procedure,
          priority: newCase.priority,
          teeth: newCase.teeth,
          shade: newCase.shade,
          implant_type: implantType,
          scanner: newCase.scanner || null,
          start_date: newCase.startDate,
          due_date: newCase.dueDate,
          created_date: newCase.createdDate,
          workflow: newCase.workflow,
          completed_steps: newCase.completedSteps,
          current_step: newCase.currentStep,
          notes: notesWithRemake,
          created_by: user?.id,
        }

        console.log("[v0] Case data to insert:", caseData)

        const { data, error: insertError } = await supabase.from("cases").insert(caseData).select()

        if (insertError) {
          console.error("[v0] Insert error:", insertError)
          throw insertError
        }

        console.log("[v0] Case created successfully:", data)

        if (data && data[0]) {
          const newCaseData = transformDbCase(data[0])
          setCases((prev) => [newCaseData, ...prev])
          console.log("[v0] Added new case to local state:", newCaseData)
        }

        setIsNewCaseFormOpen(false)
      }
    } catch (err) {
      console.error("[v0] Error saving case:", err)
      setError(err instanceof Error ? err.message : "Failed to save case")
    }
  }

  const handleUpdateWorkflow = async (caseId: string, updates: any) => {
    try {
      setError(null)

      const { data, error: updateError } = await supabase
        .from("cases")
        .update({
          completed_steps: updates.completedSteps,
          current_step: updates.currentStep,
          notes: updates.notes,
        })
        .eq("id", caseId)
        .select() // Added select to get updated data back

      if (updateError) throw updateError

      if (data && data[0]) {
        const updatedCase = transformDbCase(data[0])
        setCases((prev) => prev.map((case_) => (case_.id === updatedCase.id ? updatedCase : case_)))

        // Update selectedCase if it matches
        setSelectedCase((current) => {
          if (current && current.id === updatedCase.id) {
            return updatedCase
          }
          return current
        })

        console.log("[v0] Updated workflow and synced local state:", updatedCase)
      }
    } catch (err) {
      console.error("[v0] Error updating workflow:", err)
      setError(err instanceof Error ? err.message : "Failed to update workflow")
    }
  }

  const handleDeleteCase = async (caseId: string) => {
    try {
      setError(null)

      const { error: deleteError } = await supabase.from("cases").delete().eq("id", caseId)

      if (deleteError) throw deleteError

      setCases((prev) => prev.filter((case_) => case_.id !== caseId))

      // Clear selectedCase if it was the deleted case
      setSelectedCase((current) => {
        if (current && current.id === caseId) {
          setIsCaseDetailOpen(false)
          setIsWorkflowManagerOpen(false)
          return null
        }
        return current
      })

      console.log("[v0] Deleted case and updated local state:", caseId)
    } catch (err) {
      console.error("[v0] Error deleting case:", err)
      setError(err instanceof Error ? err.message : "Failed to delete case")
    }
  }

  const filteredCases = useMemo(() => {
    return cases
      .filter((case_) => {
        const isCompleted = case_.completedSteps.length === case_.workflow.length
        const matchesSearch = case_.patientName.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesPriority = priorityFilter === "all" || case_.priority === priorityFilter
        const matchesProcedure =
          procedureFilter === "all" || case_.procedure.toLowerCase() === procedureFilter.toLowerCase()

        return !isCompleted && matchesSearch && matchesPriority && matchesProcedure
      })
      .sort((a, b) => {
        // Sort by closest due date to today (earliest due dates first)
        const dateA = new Date(a.dueDate)
        const dateB = new Date(b.dueDate)
        return dateA.getTime() - dateB.getTime()
      })
  }, [searchTerm, priorityFilter, procedureFilter, cases])

  const completedCases = useMemo(() => {
    return cases.filter((case_) => {
      const isCompleted = case_.completedSteps.length === case_.workflow.length
      const matchesSearch = case_.patientName.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesPriority = priorityFilter === "all" || case_.priority === priorityFilter
      const matchesProcedure =
        procedureFilter === "all" || case_.procedure.toLowerCase() === procedureFilter.toLowerCase()

      return isCompleted && matchesSearch && matchesPriority && matchesProcedure
    })
  }, [searchTerm, priorityFilter, procedureFilter, cases])

  const boardCases = useMemo(() => [...filteredCases, ...completedCases], [filteredCases, completedCases])

  const stats = useMemo(() => {
    const total = cases.length
    const completed = cases.filter((c) => c.completedSteps.length === c.workflow.length).length
    const inProgress = total - completed
    const rush = cases.filter((c) => c.priority === "rush").length
    const remakes = cases.filter((c) => c.procedure === "Remake").length

    return { total, completed, inProgress, rush, remakes }
  }, [cases])

  const getProgressPercentage = (completedSteps: string[], workflow: string[]) => {
    return (completedSteps.length / workflow.length) * 100
  }

  const getPriorityColor = (priority: string) => {
    return priority === "rush" ? "destructive" : "secondary"
  }

  const getStepIcon = (step: string, isCompleted: boolean, isCurrent: boolean) => {
    if (isCompleted) {
      return <CheckCircle2 className="h-4 w-4" />
    }
    if (isCurrent) return <Clock className="h-4 w-4" />
    return <div className="h-4 w-4 rounded-full border-2 border-border" />
  }

  const handleViewDetails = (case_: any) => {
    setSelectedCase(case_)
    setIsCaseDetailOpen(true)
  }

  const handlePatientSelect = (case_: any) => {
    setSelectedCase(case_)
    setIsCaseDetailOpen(true)
  }

  const handleEditCase = (case_: any) => {
    setSelectedCase(case_)
    setIsCaseDetailOpen(false)
    setIsNewCaseFormOpen(true)
  }

  const handleUpdateStatus = (case_: any) => {
    setSelectedCase(case_)
    setIsWorkflowManagerOpen(true)
  }

  const getFilteredCases = (filterType: string) => {
    switch (filterType) {
      case "total":
        return cases
      case "inProgress":
        return cases.filter((c) => c.completedSteps.length < c.workflow.length)
      case "completed":
        return cases.filter((c) => c.completedSteps.length === c.workflow.length)
      case "rush":
        return cases.filter((c) => c.priority === "rush")
      case "remakes":
        return cases.filter((c) => c.procedure === "Remake")
      default:
        return []
    }
  }

  const handleCounterClick = (filterType: string, title: string) => {
    console.log("[v0] Counter clicked:", filterType, title)
    console.log("[v0] Current cases count:", cases.length)

    const filteredCases = getFilteredCases(filterType)
    console.log("[v0] Filtered cases for", filterType, ":", filteredCases.length)
    console.log("[v0] Filtered cases data:", filteredCases)

    setFilteredListType(filterType)
    setFilteredListTitle(title)
    setIsFilteredListOpen(true)

    console.log("[v0] Set filtered list open to true")
  }

  const handleDueDateReport = () => {
    console.log("[v0] Opening due date report dialog")
    setIsDueDateReportOpen(true)
  }

  const generateDueDatePDF = async (selectedDate: string) => {
    try {
      console.log("[v0] Generating PDF report for date:", selectedDate)
      console.log("[v0] Selected date string:", selectedDate)

      console.log("[v0] All cases with their due dates:")
      cases.forEach((case_, index) => {
        console.log(`[v0] Case ${index + 1}: ${case_.patientName} - Due: ${case_.dueDate}`)
      })

      // Filter cases by selected due date using more reliable date comparison
      const casesForDate = cases.filter((case_) => {
        // Use YYYY-MM-DD format for both dates to avoid timezone issues
        const caseDueDate = case_.dueDate // Already in YYYY-MM-DD format from database
        console.log(
          "[v0] Comparing case due date:",
          caseDueDate,
          "with selected date:",
          selectedDate,
          "Match:",
          caseDueDate === selectedDate,
        )
        return caseDueDate === selectedDate
      })

      console.log("[v0] Filtered cases for selected date:", casesForDate.length)
      console.log(
        "[v0] Filtered cases details:",
        casesForDate.map((c) => ({ name: c.patientName, due: c.dueDate })),
      )

      if (casesForDate.length === 0) {
        alert("No cases found for the selected date.")
        return
      }

      const doc = new jsPDF()

      // Set up the PDF
      doc.setFontSize(20)
      doc.text("Dr G's Lab - Due Date Report", 20, 20)

      doc.setFontSize(14)
      const [year, month, day] = selectedDate.split("-")
      const displayDate = `${month}/${day}/${year}`
      doc.text(`Date: ${displayDate}`, 20, 35)
      doc.text(`Total Cases Due: ${casesForDate.length}`, 20, 45)

      // Add a line
      doc.line(20, 55, 190, 55)

      let yPosition = 70

      casesForDate.forEach((case_, index) => {
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage()
          yPosition = 20
        }

        doc.setFontSize(12)
        doc.setFont(undefined, "bold")
        doc.text(`${index + 1}. ${case_.patientName}`, 20, yPosition)

        doc.setFont(undefined, "normal")
        doc.text(`Procedure: ${case_.procedure}`, 30, yPosition + 10)
        doc.text(`Priority: ${case_.priority.toUpperCase()}`, 30, yPosition + 20)
        doc.text(`Teeth: ${case_.teeth.join(", ")}`, 30, yPosition + 30)

        // Progress information
        const progress = Math.round((case_.completedSteps.length / case_.workflow.length) * 100)
        doc.text(
          `Progress: ${progress}% (${case_.completedSteps.length}/${case_.workflow.length} steps)`,
          30,
          yPosition + 40,
        )
        doc.text(`Current Step: ${case_.currentStep || "Not started"}`, 30, yPosition + 50)

        if (case_.notes) {
          doc.text(`Notes: ${case_.notes.substring(0, 50)}${case_.notes.length > 50 ? "..." : ""}`, 30, yPosition + 60)
          yPosition += 70
        } else {
          yPosition += 60
        }

        // Add spacing between cases
        yPosition += 10
      })

      // Add footer
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(10)
        doc.text(`Generated on ${new Date().toLocaleString()}`, 20, 280)
        doc.text(`Page ${i} of ${pageCount}`, 170, 280)
      }

      // Save the PDF
      const fileName = `DrGs_Lab_Due_Date_Report_${new Date(selectedDate).toISOString().split("T")[0]}.pdf`
      doc.save(fileName)

      console.log("[v0] PDF generated successfully:", fileName)
      setIsDueDateReportOpen(false)
      setSelectedReportDate("")
    } catch (error) {
      console.error("[v0] Error generating PDF:", error)
      alert("Error generating PDF report. Please try again.")
    }
  }

  const previewCasesCount = useMemo(() => {
    if (!selectedReportDate) return 0

    const filteredCases = cases.filter((case_) => {
      console.log(
        "[v0] Preview - Case:",
        case_.patientName,
        "Due:",
        case_.dueDate,
        "Selected:",
        selectedReportDate,
        "Match:",
        case_.dueDate === selectedReportDate,
      )
      return case_.dueDate === selectedReportDate
    })

    console.log("[v0] Preview count calculated:", filteredCases.length, "for date:", selectedReportDate)
    return filteredCases.length
  }, [cases, selectedReportDate])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading cases...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-accent">Dr G's Lab</h1>
              <p className="text-muted-foreground text-base lg:text-lg mt-1">In-House Case Management</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:gap-3">
              <div className="hidden xl:block text-sm text-muted-foreground mr-1">
                Welcome, <span className="font-medium text-foreground">{user?.email}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                title="Sign Out"
                className="h-10 px-3 lg:px-4 rounded-xl border-2 border-border hover:bg-muted font-medium bg-transparent"
              >
                <LogOut className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Sign Out</span>
              </Button>
              <Button
                variant="outline"
                title="Due Date Report"
                className="h-10 px-3 lg:px-4 border-2 border-border text-primary hover:bg-primary/10 rounded-xl shadow-sm transition-all duration-200 bg-transparent"
                onClick={handleDueDateReport}
              >
                <FileText className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Due Date Report</span>
              </Button>
              <Button
                variant="outline"
                title="Patient Database"
                className="h-10 px-3 lg:px-4 border-2 border-border text-primary hover:bg-primary/10 rounded-xl shadow-sm transition-all duration-200 bg-transparent"
                onClick={() => setIsPatientListOpen(true)}
              >
                <Users className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Patient Database</span>
              </Button>
              <Button
                title="New Case"
                className="h-10 px-3 lg:px-4 bg-primary hover:bg-primary/90 rounded-xl shadow-sm transition-all duration-200"
                onClick={() => setIsNewCaseFormOpen(true)}
              >
                <Plus className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">New Case</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-10">
        {error && (
          <Card className="mb-6 border-destructive/30 bg-destructive/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <p className="font-medium">{error}</p>
                <Button variant="outline" size="sm" onClick={() => setError(null)} className="ml-auto">
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
          <Card
            className="border-border shadow-sm bg-card rounded-2xl hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer"
            onClick={() => handleCounterClick("total", "All Cases")}
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground truncate min-w-0">Total Cases</CardTitle>
              <div className="p-2 bg-primary rounded-xl shrink-0">
                <Calendar className="h-4 w-4 text-primary-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.total}</div>
            </CardContent>
          </Card>

          <Card
            className="border-border shadow-sm bg-card rounded-2xl hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer"
            onClick={() => handleCounterClick("inProgress", "In Progress Cases")}
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground truncate min-w-0">In Progress</CardTitle>
              <div className="p-2 bg-chart-4 rounded-xl shrink-0">
                <Clock className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.inProgress}</div>
            </CardContent>
          </Card>

          <Card
            className="border-border shadow-sm bg-card rounded-2xl hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer"
            onClick={() => handleCounterClick("completed", "Completed Cases")}
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground truncate min-w-0">Completed</CardTitle>
              <div className="p-2 bg-chart-3 rounded-xl shrink-0">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card
            className="border-border shadow-sm bg-card rounded-2xl hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer"
            onClick={() => handleCounterClick("rush", "Rush Order Cases")}
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground truncate min-w-0">Rush Orders</CardTitle>
              <div className="p-2 bg-destructive rounded-xl shrink-0">
                <AlertCircle className="h-4 w-4 text-destructive-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.rush}</div>
            </CardContent>
          </Card>

          <Card
            className="border-border shadow-sm bg-card rounded-2xl hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer"
            onClick={() => handleCounterClick("remakes", "Remake Cases")}
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground truncate min-w-0">Remakes</CardTitle>
              <div className="p-2 bg-warning rounded-xl shrink-0">
                <AlertCircle className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.remakes}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-10 border-border shadow-sm bg-card rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-foreground">Search Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by patient name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 rounded-xl border-border focus:border-ring focus:ring-ring/20 bg-input"
                />
              </div>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full md:w-[200px] h-10 rounded-xl border-border focus:border-ring bg-input">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-popover border-border">
                  <SelectItem value="all" className="rounded-lg">
                    All Priorities
                  </SelectItem>
                  <SelectItem value="normal" className="rounded-lg">
                    Normal
                  </SelectItem>
                  <SelectItem value="rush" className="rounded-lg">
                    Rush
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={procedureFilter} onValueChange={setProcedureFilter}>
                <SelectTrigger className="w-full md:w-[200px] h-10 rounded-xl border-border focus:border-ring bg-input">
                  <SelectValue placeholder="Procedure" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-popover border-border">
                  <SelectItem value="all" className="rounded-lg">
                    All Procedures
                  </SelectItem>
                  <SelectItem value="crown" className="rounded-lg">
                    Crown
                  </SelectItem>
                  <SelectItem value="bridge" className="rounded-lg">
                    Bridge
                  </SelectItem>
                  <SelectItem value="surgical guide" className="rounded-lg">
                    Surgical Guide
                  </SelectItem>
                  <SelectItem value="implant crown" className="rounded-lg">
                    Implant Crown
                  </SelectItem>
                  <SelectItem value="implant bridge" className="rounded-lg">
                    Implant Bridge
                  </SelectItem>
                  <SelectItem value="remake" className="rounded-lg">
                    Remake
                  </SelectItem>
                  <SelectItem value="temp crown" className="rounded-lg">
                    Temp Crown
                  </SelectItem>
                  <SelectItem value="temp bridge" className="rounded-lg">
                    Temp Bridge
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Cases List */}
        <Tabs defaultValue="list" className="gap-6">
          <TabsList>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="board">Board View</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Active Cases Section */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-foreground">Active Cases ({filteredCases.length})</h2>

              {filteredCases.map((case_) => (
                <Card
                  key={case_.id}
                  className="border-border shadow-sm bg-card rounded-2xl hover:shadow-md hover:border-primary/20 transition-all duration-200"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-bold text-foreground">{case_.patientName}</h3>
                          <Badge
                            variant={getPriorityColor(case_.priority)}
                            className={`px-2 py-1 rounded-full font-semibold text-xs ${
                              case_.priority === "rush"
                                ? "bg-destructive text-destructive-foreground"
                                : "bg-secondary text-secondary-foreground"
                            }`}
                          >
                            {case_.priority.toUpperCase()}
                          </Badge>
                          <Badge
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${getProcedureColors(case_.procedure)}`}
                          >
                            {case_.procedure}
                          </Badge>
                          {case_.scanner && (
                            <Badge
                              className="px-2 py-1 rounded-full text-xs font-semibold bg-accent text-accent-foreground border-accent"
                            >
                              {case_.scanner}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-muted-foreground mb-4">
                          <div className="bg-muted p-2 rounded-lg">
                            <span className="font-semibold text-foreground">Teeth:</span>
                            <br />
                            {case_.teeth.join(", ")}
                          </div>
                          <div className="bg-muted p-2 rounded-lg">
                            <span className="font-semibold text-foreground">Shade:</span>
                            <br />
                            {case_.shade}
                          </div>
                          <div className="bg-muted p-2 rounded-lg">
                            <span className="font-semibold text-foreground">Due:</span>
                            <br />
                            {(() => {
                              const [year, month, day] = case_.dueDate.split("-")
                              return `${month}/${day}/${year}`
                            })()}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-semibold text-foreground">Progress</span>
                            <span className="font-bold text-primary">
                              {Math.round(getProgressPercentage(case_.completedSteps, case_.workflow))}%
                            </span>
                          </div>
                          <Progress
                            value={getProgressPercentage(case_.completedSteps, case_.workflow)}
                            className="h-2 rounded-full bg-muted"
                          />
                        </div>

                        {/* Workflow Steps */}
                        <div className="flex flex-wrap gap-2">
                          {case_.workflow.map((step, index) => {
                            const isCompleted = case_.completedSteps.includes(step)
                            const isCurrent = step === case_.currentStep

                            return (
                              <div
                                key={step}
                                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                                  isCompleted
                                    ? "bg-chart-3 text-white shadow-lg"
                                    : isCurrent
                                      ? "bg-primary text-primary-foreground shadow-lg"
                                      : "bg-muted text-muted-foreground border border-border"
                                }`}
                              >
                                {getStepIcon(step, isCompleted, isCurrent)}
                                {step.charAt(0).toUpperCase() + step.slice(1)}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(case_)}
                          className="h-9 px-4 rounded-lg border-2 border-border hover:bg-muted font-medium text-xs"
                        >
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(case_)}
                          className="h-9 px-4 rounded-lg border-2 border-border text-primary hover:bg-primary/10 font-medium text-xs"
                        >
                          Update Status
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredCases.length === 0 && (
                <Card className="border-border shadow-sm bg-card rounded-2xl">
                  <CardContent className="p-8 text-center">
                    <div className="text-muted-foreground mb-4">
                      <Calendar className="h-12 w-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Active Cases</h3>
                    <p className="text-muted-foreground mb-4">All cases are completed or no cases match your filters.</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Completed Cases Section */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-foreground">Completed Cases ({completedCases.length})</h2>

              {completedCases.map((case_) => (
                <Card
                  key={case_.id}
                  className="border-border shadow-sm bg-card rounded-2xl hover:shadow-md transition-all duration-200 opacity-75"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-bold text-foreground">{case_.patientName}</h3>
                          <Badge
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${getProcedureColors(case_.procedure)}`}
                          >
                            {case_.procedure}
                          </Badge>
                          {case_.scanner && (
                            <Badge
                              className="px-2 py-1 rounded-full text-xs font-semibold bg-accent text-accent-foreground border-accent"
                            >
                              {case_.scanner}
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className="px-2 py-1 rounded-full border-2 border-success/40 text-success bg-success/10 text-xs font-semibold"
                          >
                            COMPLETED
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-muted-foreground mb-4">
                          <div className="bg-muted p-2 rounded-lg">
                            <span className="font-semibold text-foreground">Teeth:</span>
                            <br />
                            {case_.teeth.join(", ")}
                          </div>
                          <div className="bg-muted p-2 rounded-lg">
                            <span className="font-semibold text-foreground">Shade:</span>
                            <br />
                            {case_.shade}
                          </div>
                          <div className="bg-muted p-2 rounded-lg">
                            <span className="font-semibold text-foreground">Completed:</span>
                            <br />
                            {(() => {
                              const [year, month, day] = case_.dueDate.split("-")
                              return `${month}/${day}/${year}`
                            })()}
                          </div>
                        </div>

                        {/* Completed Progress Bar */}
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-semibold text-foreground">Progress</span>
                            <span className="font-bold text-success">100%</span>
                          </div>
                          <Progress value={100} className="h-2 rounded-full bg-muted" />
                        </div>

                        {/* Completed Workflow Steps */}
                        <div className="flex flex-wrap gap-2">
                          {case_.workflow.map((step, index) => (
                            <div
                              key={step}
                              className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-success/15 text-success border border-success/30"
                            >
                              <div className="h-3 w-3 bg-success rounded-full" />
                              {step.charAt(0).toUpperCase() + step.slice(1)}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(case_)}
                          className="h-9 px-4 rounded-lg border-2 border-border hover:bg-muted font-medium text-xs"
                        >
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(case_)}
                          className="h-9 px-4 rounded-lg border-2 border-border text-primary hover:bg-primary/10 font-medium text-xs"
                        >
                          Reopen Case
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {completedCases.length === 0 && (
                <Card className="border-border shadow-sm bg-card rounded-2xl">
                  <CardContent className="p-8 text-center">
                    <div className="text-muted-foreground mb-4">
                      <CheckCircle className="h-12 w-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Completed Cases</h3>
                    <p className="text-muted-foreground mb-4">
                      No cases have been completed yet or no completed cases match your filters.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          </TabsContent>

          <TabsContent value="board">
            <KanbanBoard cases={boardCases} onViewDetails={handleViewDetails} onUpdateWorkflow={handleUpdateWorkflow} />
          </TabsContent>
        </Tabs>

        {/* New Case Form */}
        <NewCaseForm
          isOpen={isNewCaseFormOpen}
          onClose={() => {
            setIsNewCaseFormOpen(false)
            setSelectedCase(null)
          }}
          onSubmit={handleNewCase}
          editingCase={selectedCase}
        />

        {/* Workflow Manager */}
        <WorkflowManager
          isOpen={isWorkflowManagerOpen}
          onClose={() => setIsWorkflowManagerOpen(false)}
          case_={selectedCase}
          onUpdateWorkflow={handleUpdateWorkflow}
        />

        <CaseDetailView
          isOpen={isCaseDetailOpen}
          onClose={() => setIsCaseDetailOpen(false)}
          case_={selectedCase}
          onEdit={handleEditCase}
        />

        {/* Patient List Popup */}
        <PatientListPopup
          isOpen={isPatientListOpen}
          onClose={() => setIsPatientListOpen(false)}
          cases={cases}
          onSelectPatient={handlePatientSelect}
          onDeleteCase={handleDeleteCase}
        />

        {/* Filtered Cases List Popup */}
        <PatientListPopup
          isOpen={isFilteredListOpen}
          onClose={() => setIsFilteredListOpen(false)}
          cases={getFilteredCases(filteredListType)}
          onSelectPatient={handlePatientSelect}
          onDeleteCase={handleDeleteCase}
          title={filteredListTitle}
        />

        {/* Due Date Report Dialog */}
        {isDueDateReportOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4 border-border bg-card">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Due Date Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Select Due Date</label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={selectedReportDate}
                      onChange={(e) => setSelectedReportDate(e.target.value)}
                      className="w-full h-10 rounded-xl border-border focus:border-ring bg-input pr-12"
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {selectedReportDate && (
                  <div className="p-3 bg-muted rounded-xl">
                    <p className="text-sm text-muted-foreground">
                      Cases due on {(() => {
                        const [year, month, day] = selectedReportDate.split("-")
                        return `${month}/${day}/${year}`
                      })()}:
                    </p>
                    <p className="text-lg font-semibold text-foreground">{previewCasesCount} cases</p>
                    {previewCasesCount > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-medium text-foreground">Patients:</p>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {cases
                            .filter((case_) => case_.dueDate === selectedReportDate)
                            .map((case_) => (
                              <div
                                key={case_.id}
                                className="flex items-center justify-between p-2 bg-background rounded-lg border border-border"
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-foreground">{case_.patientName}</p>
                                  <p className="text-xs text-muted-foreground">{case_.procedure}</p>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {case_.priority === "rush" && (
                                    <span className="px-2 py-1 bg-destructive/10 text-destructive rounded-full text-xs font-medium">
                                      Rush
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDueDateReportOpen(false)
                      setSelectedReportDate("")
                    }}
                    className="flex-1 h-10 rounded-xl border-border"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => generateDueDatePDF(selectedReportDate)}
                    disabled={!selectedReportDate}
                    className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary/90"
                  >
                    Generate PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
