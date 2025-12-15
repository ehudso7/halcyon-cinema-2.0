import Link from 'next/link';
import { BookOpen, Film, Sparkles, Shield, Download, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <header className="border-b">
        <nav className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Film className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Halcyon Cinema</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="/demo" className="text-sm text-muted-foreground hover:text-foreground">
              Demo
            </Link>
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">Start Writing Free</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-6xl">
          Write Your Story.
          <br />
          <span className="text-primary">Visualize Your Vision.</span>
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
          The AI-powered platform for writers who dream in scenes. Write novels, screenplays,
          and series with perfect canon continuity. Optionally escalate to cinematic visualization.
        </p>
        <div className="flex justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/auth/signup">Start Writing Free</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/demo">Try the Demo</Link>
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          No credit card required. Write forever on our free tier.
        </p>
      </section>

      {/* Two Modes */}
      <section className="bg-muted/50 py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">Two Modes. One Platform.</h2>
          <div className="grid gap-8 md:grid-cols-2">
            {/* StoryForge */}
            <div className="rounded-xl border bg-card p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-storyforge-100">
                <BookOpen className="h-6 w-6 text-storyforge-600" />
              </div>
              <h3 className="mb-2 text-2xl font-bold">StoryForge Mode</h3>
              <p className="mb-4 text-muted-foreground">
                Your complete writing environment. Write novels, manuscripts, screenplays,
                and series with AI assistance that respects your vision.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-storyforge-500" />
                  AI-powered writing assistance
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-storyforge-500" />
                  Canon Vault for perfect continuity
                </li>
                <li className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-storyforge-500" />
                  Publishing-ready exports
                </li>
              </ul>
              <p className="mt-4 text-sm font-medium text-storyforge-600">
                Available on all plans, including Free
              </p>
            </div>

            {/* Cinema */}
            <div className="rounded-xl border bg-card p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-cinema-100">
                <Film className="h-6 w-6 text-cinema-600" />
              </div>
              <h3 className="mb-2 text-2xl font-bold">Cinema Mode</h3>
              <p className="mb-4 text-muted-foreground">
                Transform your scenes into visual storyboards. Generate shot lists,
                mood boards, and pitch decks for production.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cinema-500" />
                  Scene-to-shot translation
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cinema-500" />
                  Visual prompt generation
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-cinema-500" />
                  Pitch deck creation
                </li>
              </ul>
              <p className="mt-4 text-sm font-medium text-cinema-600">
                Available on Studio and Enterprise plans
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Message */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h2 className="mb-6 text-3xl font-bold">Writing First. Cinema Optional.</h2>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Unlike other platforms, Halcyon Cinema respects your creative journey. Write for
          months without ever touching Cinema mode. Your stories are complete as written.
          Visualization is an option, never a requirement.
        </p>
      </section>

      {/* Features */}
      <section className="bg-muted/50 py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">Everything You Need to Write</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: 'Canon Vault',
                description: 'Never lose track of your characters, locations, rules, and events. The AI knows your world.',
                icon: Shield,
              },
              {
                title: 'AI That Listens',
                description: 'Expand, condense, rewrite, or continue. The AI respects your canon and asks before changing it.',
                icon: Sparkles,
              },
              {
                title: 'Export Anywhere',
                description: 'DOCX, PDF, EPUB, Fountain, Markdown. Your work, your format, your control.',
                icon: Download,
              },
            ].map((feature) => (
              <div key={feature.title} className="rounded-lg border bg-card p-6">
                <feature.icon className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h2 className="mb-6 text-3xl font-bold">Start Your Story Today</h2>
        <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
          Join thousands of writers who trust Halcyon Cinema for their creative work.
          Start free, upgrade when you're ready.
        </p>
        <Button size="lg" asChild>
          <Link href="/auth/signup">Create Free Account</Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <Link href="/" className="flex items-center gap-2">
                <Film className="h-5 w-5 text-primary" />
                <span className="font-bold">Halcyon Cinema</span>
              </Link>
              <p className="mt-2 text-sm text-muted-foreground">
                AI-powered storytelling for writers who dream in scenes.
              </p>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/pricing">Pricing</Link></li>
                <li><Link href="/demo">Demo</Link></li>
                <li><Link href="/docs">Documentation</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about">About</Link></li>
                <li><Link href="/blog">Blog</Link></li>
                <li><Link href="/contact">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy">Privacy</Link></li>
                <li><Link href="/terms">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Halcyon Cinema. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
