"use client"

import type React from "react"

import { useState } from "react"
import { X, Upload, Trash2, ZoomIn, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

interface Photo {
  id: string
  photo_url: string
  storage_path: string
  uploaded_at: string
  notes?: string
}

interface PhotoGalleryProps {
  caseId: string
  photos: Photo[]
  onPhotosChange: () => void
}

export default function PhotoGallery({ caseId, photos, onPhotosChange }: PhotoGalleryProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const supabase = createClient()

  const MAX_PHOTOS = 10

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    // Check if adding these files would exceed the limit
    if (photos.length + files.length > MAX_PHOTOS) {
      setUploadError(`Cannot upload more than ${MAX_PHOTOS} photos per case`)
      setTimeout(() => setUploadError(null), 3000)
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith("image/")) {
          setUploadError("Only image files are allowed")
          continue
        }

        // Validate file size (max 7MB)
        if (file.size > 7 * 1024 * 1024) {
          setUploadError("File size must be less than 7MB")
          continue
        }

        // Create unique file path
        const fileExt = file.name.split(".").pop()
        const fileName = `${caseId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        console.log("[v0] Uploading file:", fileName)

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("case-photos")
          .upload(fileName, file)

        if (uploadError) {
          console.error("[v0] Upload error:", uploadError)
          throw uploadError
        }

        console.log("[v0] File uploaded successfully:", uploadData)

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("case-photos").getPublicUrl(fileName)

        console.log("[v0] Public URL:", publicUrl)

        // Save metadata to database
        const { error: dbError } = await supabase.from("case_photos").insert({
          case_id: caseId,
          photo_url: publicUrl,
          storage_path: fileName,
          uploaded_by: user.id,
          photo_order: photos.length,
        })

        if (dbError) {
          console.error("[v0] Database error:", dbError)
          // Clean up uploaded file if database insert fails
          await supabase.storage.from("case-photos").remove([fileName])
          throw dbError
        }

        console.log("[v0] Photo metadata saved to database")
      }

      // Refresh photos list
      onPhotosChange()
    } catch (error) {
      console.error("[v0] Error uploading photos:", error)
      setUploadError(error instanceof Error ? error.message : "Failed to upload photos")
    } finally {
      setIsUploading(false)
      // Reset file input
      event.target.value = ""
    }
  }

  const handleDeletePhoto = async (photo: Photo) => {
    if (!confirm("Are you sure you want to delete this photo?")) return

    try {
      console.log("[v0] Deleting photo:", photo.id)

      // Delete from storage
      const { error: storageError } = await supabase.storage.from("case-photos").remove([photo.storage_path])

      if (storageError) {
        console.error("[v0] Storage deletion error:", storageError)
        throw storageError
      }

      // Delete from database
      const { error: dbError } = await supabase.from("case_photos").delete().eq("id", photo.id)

      if (dbError) {
        console.error("[v0] Database deletion error:", dbError)
        throw dbError
      }

      console.log("[v0] Photo deleted successfully")

      // Refresh photos list
      onPhotosChange()
    } catch (error) {
      console.error("[v0] Error deleting photo:", error)
      alert("Failed to delete photo. Please try again.")
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-foreground">Patient Photos</h4>
          <p className="text-sm text-muted-foreground">
            {photos.length} of {MAX_PHOTOS} photos
          </p>
        </div>
        <div>
          <input
            type="file"
            id="photo-upload"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            disabled={isUploading || photos.length >= MAX_PHOTOS}
            className="hidden"
          />
          <label htmlFor="photo-upload">
            <Button
              variant="outline"
              size="sm"
              disabled={isUploading || photos.length >= MAX_PHOTOS}
              className="cursor-pointer"
              asChild
            >
              <span>
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photos
                  </>
                )}
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {uploadError}
        </div>
      )}

      {/* Photos Grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden group relative">
              <CardContent className="p-0">
                <div className="relative aspect-square">
                  <img
                    src={photo.photo_url || "/placeholder.svg"}
                    alt="Case photo"
                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setSelectedPhoto(photo.photo_url)}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/photo-failed-to-load.png"
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPhoto(photo.photo_url)}
                      className="text-white hover:bg-white/20"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeletePhoto(photo)}
                    className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-2">No photos uploaded yet</p>
            <p className="text-xs text-muted-foreground">Click "Upload Photos" to add patient photos</p>
          </CardContent>
        </Card>
      )}

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </Button>
          <img
            src={selectedPhoto || "/placeholder.svg"}
            alt="Full size photo"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
