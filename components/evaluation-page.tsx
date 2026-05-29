"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  GraduationCap,
  ClipboardCheck,
  ExternalLink,
  Users,
  Star,
  Target,
  Lightbulb,
  CheckCircle2,
  FlaskConical,
  Info,
  Layers,
  Map,
  Flame,
  Trophy,
  Building2,
  Brain,
  KeyRound,
  Server,
  Vote,
  Bell,
  Shield,
  UserCheck,
  ShieldCheck,
  Eye,
  Sparkles,
  AlertTriangle,
  MoreHorizontal,
  Heart,
} from "lucide-react"

export function EvaluationPage() {
  const mvpSimplifications = [
    {
      icon: KeyRound,
      title: "Login Simulado",
      description: "Sistema de autenticação mockado para facilitar testes",
    },
    {
      icon: Vote,
      title: "Votos Sem Limite Rígido",
      description: "Votos colaborativos liberados para testes mais amplos",
    },
    {
      icon: Shield,
      title: "Acesso Admin Simplificado",
      description: "Modo administrador acessível para demonstração",
    },
    {
      icon: Server,
      title: "Dados Simulados",
      description: "Base de dados fictícia para exemplificar funcionalidades",
    },
    {
      icon: Sparkles,
      title: "Alterações Instantâneas",
      description: "Mudanças em front-end sem persistência real",
    },
  ]

  const futureEvolutions = [
    {
      icon: Layers,
      title: "Mais Categorias Urbanas",
      description: "Expansão das categorias de problemas reportáveis",
    },
    {
      icon: Map,
      title: "Mapas de Calor",
      description: "Visualização de áreas com maior concentração de ocorrências",
    },
    {
      icon: Trophy,
      title: "Sistema de Incentivos",
      description: "Pontos, rankings e recompensas por participação",
    },
    {
      icon: Building2,
      title: "Ranking por Bairro",
      description: "Comparativo de zeladoria entre diferentes regiões",
    },
    {
      icon: Brain,
      title: "Priorização Inteligente",
      description: "Algoritmos para ordenação automática de demandas",
    },
    {
      icon: KeyRound,
      title: "Autenticação Real",
      description: "Sistema seguro de login e cadastro de usuários",
    },
    {
      icon: Server,
      title: "Backend Integrado",
      description: "Infraestrutura completa para persistência de dados",
    },
    {
      icon: Vote,
      title: "Limite Inteligente de Votos",
      description: "Controle de votos por usuário para evitar abusos",
    },
    {
      icon: Heart,
      title: "Alteração Única de Voto",
      description: "Permitir que o usuário mude seu voto de prioridade apenas uma vez por ocorrência, caso reavalie que a urgência do problema aumentou ou diminuiu",
    },
    {
      icon: Bell,
      title: "Notificações em Tempo Real",
      description: "Alertas sobre atualizações de ocorrências reportadas",
    },
    {
      icon: Shield,
      title: "Moderação de Conteúdo",
      description: "Revisão e validação de denúncias antes da publicação",
    },
    {
      icon: UserCheck,
      title: "Reputação de Usuários",
      description: "Sistema de credibilidade baseado em histórico",
    },
    {
      icon: ShieldCheck,
      title: "Validação Antifraude",
      description: "Mecanismos para garantir autenticidade das denúncias",
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge variant="secondary" className="mb-4">
          <GraduationCap className="h-3 w-3 mr-1" />
          Trabalho de Graduação Interdisciplinar
        </Badge>
        <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-4 text-balance">
          Avaliação Acadêmica do MVP
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-pretty leading-relaxed">
          Sua opinião é fundamental para o sucesso deste projeto acadêmico. 
          Ao responder nosso questionário, você contribui diretamente para a 
          validação e aprimoramento da plataforma.
        </p>
      </div>

      {/* Main CTA Card */}
      <Card className="mb-12 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ClipboardCheck className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold mb-3 text-foreground">
            Questionário de Avaliação de Usabilidade
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto text-pretty">
            O questionário leva aproximadamente 5 minutos para ser respondido e 
            suas respostas são anônimas.
          </p>
          <Button size="lg" asChild className="gap-2">
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSf4KuJWMyJqniSdxqHHyJsi6UnduaqN7yLEyt4c72LqB3BU9w/viewform?usp=header"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-5 w-5" />
              Responder Questionário de Avaliação
            </a>
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            O link abrirá em uma nova aba (Google Forms)
          </p>
        </CardContent>
      </Card>

      {/* NEW SECTION: Sobre Este MVP */}
      <Card className="mb-8 border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-accent" />
            Sobre Este MVP
          </CardTitle>
          <CardDescription>
            Entenda o contexto experimental desta plataforma
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* O que é MVP */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Info className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">O que é um MVP?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong>MVP</strong> significa <strong>Produto Mínimo Viável</strong> (Minimum Viable Product). 
                  É uma versão simplificada de um produto desenvolvida para validar conceitos e coletar 
                  feedback antes de investir em uma implementação completa.
                </p>
              </div>
            </div>
          </div>

          {/* Objetivo do MVP */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Objetivo Principal
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Este sistema é um <strong>MVP acadêmico</strong> cujo objetivo principal é 
              <strong> validar o conceito da plataforma</strong> de fiscalização cidadã. 
              Esta versão foi simplificada intencionalmente para permitir:
            </p>
            <ul className="grid gap-2 md:grid-cols-2 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                Testes de usabilidade
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                Demonstração acadêmica
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                Coleta de feedback
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                Validação conceitual
              </li>
            </ul>
          </div>

          {/* Aviso de Transparência */}
          <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">Transparência sobre Funcionalidades</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  Por se tratar de um protótipo acadêmico, algumas funcionalidades estão 
                  <strong> simuladas</strong> ou <strong>simplificadas</strong>. 
                  Certos comportamentos foram liberados propositalmente para permitir testes mais amplos, 
                  e nem todas as regras de um sistema real foram implementadas nesta etapa.
                </p>
              </div>
            </div>
          </div>

          {/* Cards de Simplificações */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground text-sm">Exemplos de simplificações neste MVP:</h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {mvpSimplifications.map((item) => (
                <div
                  key={item.title}
                  className="p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground mb-2" />
                  <h4 className="font-medium text-xs text-foreground mb-1">{item.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              ))}
              {/* Card Outros */}
              <div className="p-3 rounded-lg bg-muted/30 border border-dashed border-border hover:bg-muted/50 transition-colors">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground mb-2" />
                <h4 className="font-medium text-xs text-foreground mb-1">Outros</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Existem outras simplificações não listadas aqui que foram aplicadas para viabilizar este MVP no contexto acadêmico
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Importance Section (existing - complemented) */}
      <Card className="mb-8 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Por que sua avaliação é importante?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed text-pretty">
            Este MVP (Produto Mínimo Viável) faz parte de um Trabalho de Graduação 
            Interdisciplinar (TGI) que visa desenvolver uma solução tecnológica para 
            promover a participação cidadã na fiscalização da infraestrutura urbana.
          </p>
          <p className="text-muted-foreground leading-relaxed text-pretty">
            A avaliação de usabilidade é uma etapa crucial do desenvolvimento, pois permite:
          </p>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Identificar pontos fortes e áreas de melhoria na interface</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Validar se a plataforma atende às necessidades dos usuários</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Coletar dados para fundamentação científica do projeto</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Contribuir para pesquisas em Smart Cities e participação cidadã</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* NEW SECTION: Objetivo da Avaliação */}
      <Card className="mb-8 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Objetivo da Avaliação
          </CardTitle>
          <CardDescription>
            O que esperamos analisar com sua participação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed text-pretty">
            O objetivo desta avaliação é analisar diversos aspectos da plataforma para 
            compreender como os usuários interagem com o sistema e identificar oportunidades 
            de melhoria. Especificamente, buscamos avaliar:
          </p>
          
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Target className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm text-foreground">Experiência de Uso</h4>
                <p className="text-xs text-muted-foreground">Como é navegar e utilizar a plataforma</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Star className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm text-foreground">Clareza da Interface</h4>
                <p className="text-xs text-muted-foreground">Se os elementos são compreensíveis</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Layers className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm text-foreground">Organização das Informações</h4>
                <p className="text-xs text-muted-foreground">Como os dados estão estruturados</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm text-foreground">Percepção de Utilidade</h4>
                <p className="text-xs text-muted-foreground">Se a plataforma parece útil e relevante</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Brain className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm text-foreground">Compreensão das Funcionalidades</h4>
                <p className="text-xs text-muted-foreground">Se as funções são intuitivas</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm text-foreground">Experiência Geral</h4>
                <p className="text-xs text-muted-foreground">Satisfação global com a plataforma</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 mt-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Ao avaliar, considere:</strong> o contexto de MVP acadêmico, 
              a natureza exploratória do sistema e o foco na validação inicial da proposta. 
              Seu feedback honesto e construtivo é essencial para o sucesso deste projeto.
            </p>
          </div>
        </CardContent>
      </Card>



      {/* NEW SECTION: Ideias e Possíveis Evoluções */}
      <Card className="mb-8 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Ideias e Possíveis Evoluções
          </CardTitle>
          <CardDescription>
            Reflexões e possibilidades identificadas durante o desenvolvimento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-sm text-muted-foreground leading-relaxed">
              As funcionalidades listadas abaixo representam <strong>reflexões e possibilidades</strong> levantadas 
              durante o desenvolvimento do artigo e do MVP. É importante ressaltar que estas ideias 
              <strong> não necessariamente serão implementadas futuramente</strong>, servindo como uma 
              <strong> análise exploratória</strong> e visão de evolução potencial da plataforma.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {futureEvolutions.map((evolution) => (
              <div
                key={evolution.title}
                className="group p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50 hover:border-primary/30 hover:from-primary/5 hover:to-transparent transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mb-3 transition-colors">
                  <evolution.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm text-foreground mb-1">{evolution.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{evolution.description}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center pt-2">
            Estas ideias refletem o potencial de expansão identificado durante a pesquisa acadêmica.
          </p>
        </CardContent>
      </Card>

      {/* Academic Context (existing) */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Contexto Acadêmico
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-medium text-sm text-foreground mb-1">Projeto</h3>
              <p className="text-sm text-muted-foreground">
                Plataforma Digital para Apoio à Fiscalização Cidadã da Infraestrutura Urbana
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-medium text-sm text-foreground mb-1">Modalidade</h3>
              <p className="text-sm text-muted-foreground">
                Trabalho de Graduação Interdisciplinar (TGI 1)
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-medium text-sm text-foreground mb-1">Área de Pesquisa</h3>
              <p className="text-sm text-muted-foreground">
                Smart Cities, Participação Cidadã, Tecnologia Cívica
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-medium text-sm text-foreground mb-1">Ano</h3>
              <p className="text-sm text-muted-foreground">2026</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center pt-4">
            Todas as respostas são anônimas e serão utilizadas exclusivamente para fins acadêmicos.
          </p>
        </CardContent>
      </Card>

      {/* Bottom CTA */}
      <div className="text-center mt-12">
        <Button size="lg" asChild className="gap-2">
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSf4KuJWMyJqniSdxqHHyJsi6UnduaqN7yLEyt4c72LqB3BU9w/viewform?usp=header"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-5 w-5" />
            Responder Questionário
          </a>
        </Button>
      </div>
    </div>
  )
}
