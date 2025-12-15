import Link from 'next/link';
import { Check, X, Film, BookOpen, Sparkles, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const tiers = [
  {
    name: 'Free',
    id: 'free',
    price: '$0',
    period: 'forever',
    description: 'For writers exploring their craft',
    icon: BookOpen,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    features: [
      { name: 'StoryForge writing mode', included: true },
      { name: 'Up to 3 projects', included: true },
      { name: 'Canon Vault (50 entries)', included: true },
      { name: 'AI assistance (50K tokens/mo)', included: true },
      { name: 'DOCX & PDF exports', included: true },
      { name: '20 chapters per project', included: true },
      { name: 'Unlimited projects', included: false },
      { name: 'EPUB & Fountain exports', included: false },
      { name: 'Cinema mode', included: false },
      { name: 'Priority support', included: false },
    ],
    cta: 'Start Free',
    href: '/auth/signup',
  },
  {
    name: 'Pro',
    id: 'pro',
    price: '$12',
    period: '/month',
    description: 'For serious writers and authors',
    icon: Sparkles,
    color: 'text-storyforge-600',
    bgColor: 'bg-storyforge-50',
    popular: true,
    features: [
      { name: 'Everything in Free', included: true },
      { name: 'Unlimited projects', included: true },
      { name: 'Unlimited Canon Vault', included: true },
      { name: 'Unlimited AI tokens', included: true },
      { name: 'EPUB & Fountain exports', included: true },
      { name: 'Canon locking', included: true },
      { name: 'Version history', included: true },
      { name: 'Priority email support', included: true },
      { name: 'Cinema mode', included: false },
      { name: 'API access', included: false },
    ],
    cta: 'Start Pro Trial',
    href: '/auth/signup?plan=pro',
  },
  {
    name: 'Studio',
    id: 'studio',
    price: '$29',
    period: '/month',
    description: 'For screenwriters and visual storytellers',
    icon: Film,
    color: 'text-cinema-600',
    bgColor: 'bg-cinema-50',
    features: [
      { name: 'Everything in Pro', included: true },
      { name: 'Cinema mode', included: true },
      { name: 'Scene-to-shot translation', included: true },
      { name: 'Visual prompt generation', included: true },
      { name: 'Mood boards', included: true },
      { name: 'Pitch deck creation', included: true },
      { name: 'Production bible export', included: true },
      { name: 'Priority support', included: true },
      { name: 'API access', included: false },
      { name: 'Team collaboration', included: false },
    ],
    cta: 'Start Studio Trial',
    href: '/auth/signup?plan=studio',
  },
  {
    name: 'Enterprise',
    id: 'enterprise',
    price: 'Custom',
    period: '',
    description: 'For studios and production companies',
    icon: Building,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    features: [
      { name: 'Everything in Studio', included: true },
      { name: 'Team collaboration', included: true },
      { name: 'API access', included: true },
      { name: 'Custom branding', included: true },
      { name: 'SSO authentication', included: true },
      { name: 'Dedicated support', included: true },
      { name: 'Custom integrations', included: true },
      { name: 'SLA guarantee', included: true },
      { name: 'On-premise option', included: true },
      { name: 'Training & onboarding', included: true },
    ],
    cta: 'Contact Sales',
    href: '/contact?type=enterprise',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <header className="border-b">
        <nav className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Film className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Halcyon Cinema</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">Start Writing Free</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Header */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h1 className="mb-4 text-4xl font-bold">Simple, Writer-First Pricing</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Write forever on our free tier. Upgrade when you need more power.
          Cinema is always optional, never required.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="container mx-auto px-4 pb-24">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            return (
              <Card
                key={tier.id}
                className={cn(
                  'relative flex flex-col',
                  tier.popular && 'border-primary shadow-lg'
                )}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <div className={cn('mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg', tier.bgColor)}>
                    <Icon className={cn('h-5 w-5', tier.color)} />
                  </div>
                  <CardTitle>{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground">{tier.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature.name} className="flex items-start gap-2">
                        {feature.included ? (
                          <Check className="h-5 w-5 shrink-0 text-green-500" />
                        ) : (
                          <X className="h-5 w-5 shrink-0 text-muted-foreground/50" />
                        )}
                        <span
                          className={cn(
                            'text-sm',
                            !feature.included && 'text-muted-foreground/50'
                          )}
                        >
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={tier.popular ? 'default' : 'outline'}
                    asChild
                  >
                    <Link href={tier.href}>{tier.cta}</Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted/50 py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">Frequently Asked Questions</h2>
          <div className="mx-auto max-w-3xl space-y-8">
            <div>
              <h3 className="mb-2 font-semibold">Can I write without Cinema mode?</h3>
              <p className="text-muted-foreground">
                Absolutely! StoryForge is a complete writing platform. You can write novels,
                manuscripts, and screenplays without ever using Cinema mode. Cinema is purely
                optional for those who want visual storytelling tools.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">What happens if I downgrade?</h3>
              <p className="text-muted-foreground">
                Your content is never deleted. If you downgrade, you'll retain read access to
                all projects. You just won't be able to create new projects beyond the tier limit
                or access premium features until you upgrade again.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Do you offer refunds?</h3>
              <p className="text-muted-foreground">
                Yes, we offer a 14-day money-back guarantee on all paid plans. If you're not
                satisfied, contact us for a full refund.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Can I switch between modes?</h3>
              <p className="text-muted-foreground">
                Yes! Projects can switch between StoryForge and Cinema modes at any time without
                losing content. Your writing and canon are preserved across mode switches.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h2 className="mb-4 text-3xl font-bold">Ready to Start Writing?</h2>
        <p className="mb-8 text-muted-foreground">
          Join thousands of writers on Halcyon Cinema.
        </p>
        <Button size="lg" asChild>
          <Link href="/auth/signup">Create Free Account</Link>
        </Button>
      </section>
    </div>
  );
}
