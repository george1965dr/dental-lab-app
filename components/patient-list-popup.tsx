"use client"

import type React from "react"

import { useState } from "react"
import { Users, Calendar, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface PatientListPopupProps {
  isOpen: boolean
  onClose: () => void
  cases: any[]
  onSelectPatient: (case_: any) => void
  onDeleteCase: (caseId: string) => void
}

export default function PatientListPopup({
  isOpen,
  onClose,
  cases,
  onSelectPatient,
  onDeleteCase,
}: PatientListPopupProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [caseToDelete, setCaseToDelete] = useState<any>(null)

  const patientCases = cases
    .map((case_) => ({
      ...case_,
      createdDate: case_.startDate, // Using startDate as creation date
    }))
    .filter((case_) => case_.patientName.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())

  const handlePatientSelect = (case_: any) => {
    onSelectPatient(case_)
    onClose()
  }

  const handleDeleteClick = (case_: any, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    setCaseToDelete(case_)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (caseToDelete) {
      console.log("[v0] Confirming delete for case:", caseToDelete.id)
      onDeleteCase(caseToDelete.id)
      setDeleteDialogOpen(false)
      setCaseToDelete(null)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border rounded-2xl">
          <DialogHeader className="sticky top-0 bg-card z-10 pb-4 border-b border-border">
            <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
              <div className="p-2 bg-primary rounded-xl">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
              Patient Database
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Search */}
            <div className="relative">
              <Input
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 rounded-xl border-border focus:border-ring focus:ring-ring/20 bg-input"
              />
            </div>

            {/* Patient List */}
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3">
                {patientCases.map((case_) => (
                  <Card
                    key={`${case_.id}-${case_.createdDate}`}
                    className="border-border bg-muted/50 hover:bg-muted transition-all duration-200 cursor-pointer rounded-xl"
                    onClick={() => handlePatientSelect(case_)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground text-lg">{case_.patientName}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Created: {new Date(case_.createdDate).toLocaleDateString()}</span>
                            </div>
                            <div className="px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium">
                              {case_.procedure}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary/80 hover:bg-primary/10 rounded-lg"
                          >
                            View Case
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDeleteClick(case_, e)}
                            className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {patientCases.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-lg">
                      {searchTerm ? "No patients found matching your search." : "No patients in database."}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Patient Record</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete the case for <strong>{caseToDelete?.patientName}</strong>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
