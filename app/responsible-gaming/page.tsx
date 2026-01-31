import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Shield, Heart, Clock, AlertTriangle } from "lucide-react";

export default function ResponsibleGamingPage() {
  return (
    <main className="min-h-screen pb-20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-12">
          <Shield className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gradient mb-4">Responsible Gaming</h1>
          <p className="text-xl text-muted-foreground">
            While this is a play-money simulation, we still care about healthy gaming habits.
          </p>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-lg font-semibold text-yellow-500 mb-2">Important Notice</h2>
              <p className="text-muted-foreground">
                This platform uses <strong>virtual play-money tokens only</strong>. No real money is involved.
                Tokens cannot be exchanged for real currency. This is purely for entertainment and educational purposes.
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="glass">
            <CardHeader>
              <Heart className="w-8 h-8 text-red-400 mb-2" />
              <CardTitle>Gaming Should Be Fun</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                Gaming is meant to be an enjoyable activity. If you ever feel that gaming is causing
                stress or negatively impacting your life, take a break.
              </p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <Clock className="w-8 h-8 text-blue-400 mb-2" />
              <CardTitle>Set Time Limits</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                We recommend setting personal time limits for your gaming sessions.
                Taking regular breaks helps maintain a healthy balance.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="glass mb-8">
          <CardHeader>
            <CardTitle>Understanding Play-Money Games</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              Our platform operates entirely with virtual tokens. Here&apos;s what this means:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>All tokens are free and have no monetary value</li>
              <li>You cannot deposit or withdraw real money</li>
              <li>Tokens cannot be converted to any currency</li>
              <li>This is a simulation for entertainment only</li>
              <li>Game outcomes use the same mathematics as real casinos</li>
            </ul>
            <p>
              While our games simulate real casino mechanics, the lack of real money means
              there is no financial risk involved.
            </p>
          </CardContent>
        </Card>

        <Card className="glass mb-8">
          <CardHeader>
            <CardTitle>Tips for Healthy Gaming</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <ul className="list-disc list-inside space-y-2">
              <li>Set time limits before you start playing</li>
              <li>Take regular breaks every 30-60 minutes</li>
              <li>Don&apos;t chase losses - even with play money</li>
              <li>Remember: the house always has an edge</li>
              <li>Keep gaming as just one of many hobbies</li>
              <li>Talk to someone if gaming stops being fun</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="glass mb-8">
          <CardHeader>
            <CardTitle>If You Need Help</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              If you or someone you know has concerns about gambling behavior,
              these resources can help:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>National Council on Problem Gambling: 1-800-522-4700</li>
              <li>Gamblers Anonymous: www.gamblersanonymous.org</li>
              <li>BeGambleAware: www.begambleaware.org</li>
            </ul>
            <p className="text-sm">
              While our platform is play-money only, these resources are valuable
              for anyone concerned about gambling habits.
            </p>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link href="/">
            <Button variant="casino" size="lg">
              Back to Games
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
