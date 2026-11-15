export type ProfileAnswerKey = "ageRange" | "socialMediaUse" | "digitalFamiliarity" | "platformExperience" | "deviceType"

export type ProfileQuestion = {
  key: ProfileAnswerKey
  title: string
  shortTitle: string
  description: string
  options: { value: string; label: string }[]
}

export const profileQuestions: ProfileQuestion[] = [
  {
    key: "ageRange",
    title: "Qual é a sua faixa etária?",
    shortTitle: "Faixa etária",
    description: "Não solicitamos sua data de nascimento.",
    options: [
      { value: "18-24", label: "18 a 24 anos" },
      { value: "25-34", label: "25 a 34 anos" },
      { value: "35-44", label: "35 a 44 anos" },
      { value: "45-54", label: "45 a 54 anos" },
      { value: "55+", label: "55 anos ou mais" },
      { value: "prefer-not-to-say", label: "Prefiro não informar" },
    ],
  },
  {
    key: "socialMediaUse",
    title: "Com que frequência você utiliza redes sociais?",
    shortTitle: "Uso de redes sociais",
    description: "Considere o uso de redes sociais no seu dia a dia.",
    options: [
      { value: "daily", label: "Diariamente" },
      { value: "several-times-weekly", label: "Algumas vezes por semana" },
      { value: "once-weekly", label: "Uma vez por semana" },
      { value: "rarely", label: "Raramente" },
      { value: "never", label: "Nunca" },
      { value: "prefer-not-to-say", label: "Prefiro não responder" },
    ],
  },
  {
    key: "digitalFamiliarity",
    title: "Como você avalia sua familiaridade com ferramentas digitais?",
    shortTitle: "Familiaridade digital",
    description: "Pense em aplicativos, sites e serviços online.",
    options: [
      { value: "beginner", label: "Pouco familiarizado(a)" },
      { value: "intermediate", label: "Razoavelmente familiarizado(a)" },
      { value: "advanced", label: "Muito familiarizado(a)" },
    ],
  },
  {
    key: "platformExperience",
    title: "Você já usou plataformas digitais para fiscalizar ou reportar problemas urbanos?",
    shortTitle: "Experiência com fiscalização digital",
    description: "Por exemplo, canais digitais para comunicar problemas de infraestrutura à cidade.",
    options: [
      { value: "yes", label: "Sim" },
      { value: "no", label: "Não" },
      { value: "unsure", label: "Não tenho certeza" },
    ],
  },
  {
    key: "deviceType",
    title: "Qual dispositivo você está utilizando para realizar esta avaliação?",
    shortTitle: "Dispositivo utilizado",
    description: "Selecione o equipamento usado neste momento.",
    options: [
      { value: "smartphone", label: "Smartphone (celular)" },
      { value: "computer", label: "Computador ou notebook" },
      { value: "tablet", label: "Tablet" },
      { value: "other", label: "Outro dispositivo" },
    ],
  },
]

export const evaluationTaskCatalog = [
  { id: "find-occurrence", title: "Localizar uma ocorrência" },
  { id: "interact-with-occurrence", title: "Consultar detalhes e interagir" },
  { id: "register-test", title: "Registrar uma ocorrência demonstrativa" },
  { id: "admin-panel", title: "Alterar o status de uma ocorrência" },
] as const

export const likertStatements = [
  { id: "interface-ease", text: "A interface do FiscalizaSP é simples e fácil de utilizar.", negative: false },
  { id: "intuitive-navigation", text: "A navegação entre as funcionalidades é intuitiva.", negative: false },
  { id: "find-functionality", text: "Foi fácil localizar as funcionalidades necessárias.", negative: false },
  { id: "report-process", text: "O processo de registro de ocorrências é claro e compreensível.", negative: false },
  { id: "organized-info", text: "As informações apresentadas sobre as ocorrências são organizadas.", negative: false },
  { id: "interaction-tools", text: "Os recursos de comentários, apoios e votação são fáceis de utilizar.", negative: false },
  { id: "admin-charts", text: "Os indicadores e gráficos administrativos são fáceis de compreender.", negative: false },
  { id: "urban-impact", text: "O FiscalizaSP pode contribuir para o acompanhamento de problemas de infraestrutura urbana.", negative: false },
  { id: "performance", text: "O desempenho da plataforma durante a avaliação foi satisfatório.", negative: false },
  { id: "future-use", text: "Eu utilizaria uma plataforma como o FiscalizaSP para acompanhar problemas urbanos.", negative: false },
] as const

export const openQuestions = [
  { id: "difficulties", text: "Quais dificuldades você encontrou durante a utilização?" },
  { id: "improvements", text: "Que melhorias você sugere para o FiscalizaSP?" },
] as const
