"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Mail } from "lucide-react"
import Link from "next/link"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-accent mb-2">Dr G's Lab</h1>
        </div>

        <Card className="border-border shadow-sm bg-card rounded-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-success/10 rounded-full w-fit">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">Check Your Email</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="space-y-2">
              <div className="mx-auto p-3 bg-muted rounded-full w-fit">
                <Mail className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                We've sent you a confirmation email. Please click the link in the email to verify your account and
                complete the registration process.
              </p>
            </div>

            <div className="p-4 bg-muted rounded-xl">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Didn't receive the email?</strong>
                <br />
                Check your spam folder or contact your administrator for assistance.
              </p>
            </div>

            <Button asChild className="w-full h-10 rounded-xl">
              <Link href="/auth/login">Return to Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
