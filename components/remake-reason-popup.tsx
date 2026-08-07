"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { AlertTriangle } from "lucide-react"

interface RemakeReasonPopupProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (reason: string, notes: string) => void
}

export default function RemakeReasonPopup({ isOpen, onClose, onSubmit }: RemakeReasonPopupProps) {
  const [selectedReason, setSelectedReason] = useState("")
  const [additionalNotes, setAdditionalNotes] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedReason) return

    onSubmit(selectedReason, additionalNotes)

    // Reset form
    setSelectedReason("")
    setAdditionalNotes("")
    onClose()
  }

  const handleClose = () => {
    setSelectedReason("")
    setAdditionalNotes("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md rounded-2xl border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <div className="p-2 bg-gradient-to-br from-warning to-destructive rounded-xl text-white">
              <AlertTriangle className="h-4 w-4" />
            </div>
            Remake Reason
          </DialogTitle>
        </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label className="text-sm font-medium text-foreground mb-3 block">Reason for Remake *</Label>
              <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="space-y-3">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem
                    value="shade"
                    id="shade"
                    className="border-2 border-muted-foreground text-foreground data-[state=checked]:bg-muted-foreground data-[state=checked]:border-muted-foreground"
                  />
                  <Label htmlFor="shade" className="font-medium text-foreground">
                    Shade
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem
                    value="fit"
                    id="fit"
                    className="border-2 border-muted-foreground text-foreground data-[state=checked]:bg-muted-foreground data-[state=checked]:border-muted-foreground"
                  />
                  <Label htmlFor="fit" className="font-medium text-foreground">
                    Fit
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem
                    value="contour"
                    id="contour"
                    className="border-2 border-muted-foreground text-foreground data-[state=checked]:bg-muted-foreground data-[state=checked]:border-muted-foreground"
                  />
                  <Label htmlFor="contour" className="font-medium text-foreground">
                    Contour
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="additionalNotes" className="text-sm font-medium text-foreground mb-2 block">
                Additional Notes
              </Label>
              <textarea
                id="additionalNotes"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Enter any additional details about the remake..."
                className="w-full h-24 p-3 border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} className="px-4 rounded-xl bg-transparent">
                Cancel
              </Button>
              <Button type="submit" className="px-4 rounded-xl" disabled={!selectedReason}>
                Confirm Remake
              </Button>
            </div>
          </form>
      </DialogContent>
    </Dialog>
  )
}
