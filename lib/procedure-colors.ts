export const getProcedureColors = (procedure: string) => {
  switch (procedure.toLowerCase()) {
    case "crown":
    case "bridge":
      return "bg-red-600 text-white border-red-600"

    case "surgical guide":
      return "bg-yellow-400 text-black border-yellow-400"

    case "temp crown":
    case "temp bridge":
      return "bg-blue-600 text-white border-blue-600"

    case "implant crown":
    case "implant bridge":
      return "bg-black text-white border-black"

    case "remake":
      // Keep remakes with their current styling (outline variant)
      return "border-2 border-border text-foreground bg-muted"

    case "dx workup":
      return "bg-purple-600 text-white border-purple-600"

    default:
      // Default styling for other procedures (Inlay, Onlay, etc.)
      return "border-2 border-border text-foreground bg-muted"
  }
}
