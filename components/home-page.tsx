"use client"

import { useApp } from "@/lib/app-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Lightbulb,
  Shield,
  BarChart3,
  HandHeart,
  Eye,
  MessageSquare,
  Vote,
} from "lucide-react"

interface HomePageProps {
  onNavigate: (page: "explore" | "register" | "evaluation") => void
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { stats } = useApp()

  const features = [
    {
      icon: MapPin,
      title: "Registro Geolocalizado",
      description: "Registre ocorrências com localização precisa usando mapas interativos",
    },
    {
      icon: Users,
      title: "Validação Coletiva",
      description: "A comunidade valida e prioriza problemas de forma colaborativa",
    },
    {
      icon: Eye,
      title: "Transparência Total",
      description: "Acompanhe o status de todas as ocorrências em tempo real",
    },
    {
      icon: BarChart3,
      title: "Dados e Estatísticas",
      description: "Visualize métricas e análises da infraestrutura urbana",
    },
  ]

  const howItWorks = [
    {
      step: 1,
      icon: MapPin,
      title: "Registre",
      description: "Identifique um problema na infraestrutura urbana e registre com foto e localização",
    },
    {
      step: 2,
      icon: Vote,
      title: "Valide",
      description: "A comunidade vota na gravidade e confirma a existência do problema",
    },
    {
      step: 3,
      icon: MessageSquare,
      title: "Discuta",
      description: "Cidadãos comentam e compartilham informações sobre a ocorrência",
    },
    {
      step: 4,
      icon: CheckCircle2,
      title: "Resolva",
      description: "Acompanhe até a resolução e confirme se o problema foi realmente solucionado",
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container mx-auto px-4 py-8 sm:py-12 md:py-16 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-3 sm:mb-4">
              <Lightbulb className="h-3 w-3 mr-1" />
              MVP Academico - TGI 2026
            </Badge>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-balance mb-4 sm:mb-6 text-foreground">
              Plataforma Digital para Fiscalização Cidadã da Infraestrutura Urbana
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground text-pretty mb-6 sm:mb-8 leading-relaxed">
              Uma ferramenta colaborativa que permite aos cidadãos registrar, validar e 
              acompanhar ocorrências relacionadas a infraestrutura da cidade, promovendo 
              transparência e participação cidadã no conceito de Smart Cities.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button size="lg" onClick={() => onNavigate("register")} className="gap-2">
                <MapPin className="h-5 w-5" />
                Registrar Ocorrência
              </Button>
              <Button size="lg" variant="outline" onClick={() => onNavigate("explore")} className="gap-2">
                <Eye className="h-5 w-5" />
                Explorar Mapa
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8 sm:py-12 border-b border-border/50 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-8">
            <Card className="text-center border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center mb-2">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <p className="text-3xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total de Ocorrências</p>
              </CardContent>
            </Card>
            <Card className="text-center border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
                <p className="text-3xl font-bold text-foreground">{stats.pendentes}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </CardContent>
            </Card>
            <Card className="text-center border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center mb-2">
                  <AlertCircle className="h-8 w-8 text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-foreground">{stats.emAnalise}</p>
                <p className="text-sm text-muted-foreground">Em Análise</p>
              </CardContent>
            </Card>
            <Card className="text-center border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-foreground">{stats.resolvidas}</p>
                <p className="text-sm text-muted-foreground">Resolvidas</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
              Funcionalidades da Plataforma
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-pretty">
              Uma solução completa para monitoramento urbano inteligente, 
              conectando cidadãos e gestores públicos
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="group hover:shadow-lg transition-all duration-300 border-border/50">
                <CardHeader>
                  <div className="p-3 bg-primary/10 rounded-lg w-fit mb-3 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg text-foreground">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-muted/30 border-y border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
              Como Funciona
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-pretty">
              Um processo simples e colaborativo para melhorar a infraestrutura da sua cidade
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((step, index) => (
              <div key={step.step} className="relative">
                <Card className="h-full border-border/50">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground font-bold text-lg">
                        {step.step}
                      </div>
                      <step.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-lg text-foreground">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">
                      {step.description}
                    </CardDescription>
                  </CardContent>
                </Card>
                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                    <ArrowRight className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Smart City Section */}
      <section className="py-12 sm:py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-4">
                <Shield className="h-3 w-3 mr-1" />
                Conceito de Smart Cities
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold mb-6 text-foreground">
                Participação Cidadã e Transparência Pública
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed text-pretty">
                As cidades inteligentes utilizam tecnologia para melhorar a qualidade de vida 
                dos cidadãos. Nossa plataforma democratiza a fiscalização da infraestrutura 
                urbana, permitindo que qualquer pessoa contribua para uma cidade melhor.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-green-500/10 rounded-full mt-0.5">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Empoderamento Cidadão</p>
                    <p className="text-sm text-muted-foreground">
                      Cada cidadão pode ser um agente de mudança na sua comunidade
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-green-500/10 rounded-full mt-0.5">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Validação Coletiva</p>
                    <p className="text-sm text-muted-foreground">
                      A comunidade determina a prioridade real dos problemas
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-green-500/10 rounded-full mt-0.5">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Dados Abertos</p>
                    <p className="text-sm text-muted-foreground">
                      Informações transparentes para todos os cidadãos
                    </p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6 text-center border-border/50">
                <HandHeart className="h-10 w-10 text-primary mx-auto mb-3" />
                <p className="text-2xl font-bold text-foreground">387</p>
                <p className="text-sm text-muted-foreground">Apoios Registrados</p>
              </Card>
              <Card className="p-6 text-center border-border/50">
                <Users className="h-10 w-10 text-primary mx-auto mb-3" />
                <p className="text-2xl font-bold text-foreground">152</p>
                <p className="text-sm text-muted-foreground">Cidadãos Ativos</p>
              </Card>
              <Card className="p-6 text-center border-border/50">
                <MessageSquare className="h-10 w-10 text-primary mx-auto mb-3" />
                <p className="text-2xl font-bold text-foreground">89</p>
                <p className="text-sm text-muted-foreground">Comentários</p>
              </Card>
              <Card className="p-6 text-center border-border/50">
                <Vote className="h-10 w-10 text-primary mx-auto mb-3" />
                <p className="text-2xl font-bold text-foreground">214</p>
                <p className="text-sm text-muted-foreground">Votos de Prioridade</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-primary/5 border-t border-border/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
            Pronto para Participar?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8 text-pretty">
            Contribua para uma cidade melhor. Registre problemas na infraestrutura 
            urbana e ajude a comunidade a priorizar as demandas mais urgentes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => onNavigate("register")} className="gap-2">
              <MapPin className="h-5 w-5" />
              Registrar Ocorrência
            </Button>
            <Button size="lg" variant="outline" onClick={() => onNavigate("evaluation")} className="gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Avaliar Plataforma
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/50 bg-card">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary rounded-lg">
                <Building2 className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">FiscalizaSP</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Trabalho de Graduação Interdisciplinar (TGI) - 2026 | MVP Acadêmico
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ClipboardCheck icon component
function ClipboardCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  )
}
