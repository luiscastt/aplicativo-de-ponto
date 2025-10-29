
```markdown
# 🕒 Sistema de Ponto Digital — Painel Web

Painel administrativo web do sistema de controle de ponto eletrônico **(inspirado no modelo SOLIDES)**.  
Desenvolvido para gerenciamento centralizado de registros de ponto, funcionários, equipes, e relatórios — integrado ao aplicativo mobile de marcação de ponto com selfie e geolocalização.

---

## 🚀 Tecnologias Utilizadas

| Categoria | Tecnologia / Framework |
|------------|------------------------|
| **Frontend** | React.js + TypeScript |
| **UI/UX** | TailwindCSS + ShadCN/UI + Lucide Icons |
| **Backend** | Node.js (NestJS / Express) |
| **Banco de Dados** | PostgreSQL + Prisma ORM |
| **Autenticação** | JWT + OAuth 2.0 (Google/Microsoft optional) |
| **Armazenamento** | AWS S3 (para fotos) |
| **APIs Externas** | Google Maps API (geolocalização e mapa de pontos) |
| **Deploy** | Docker + Nginx + CI/CD (GitHub Actions) |

---

## 🎯 Objetivo

O **Painel Web** serve como interface de **gestão administrativa** e **visualização de dados** para supervisores, RH e administradores de TI.  
Seu principal objetivo é garantir **controle total sobre registros de ponto**, **localizações de batidas**, **logs de autenticação**, e **relatórios de produtividade**, integrando-se em tempo real com o aplicativo mobile.

---

## ⚙️ Funcionalidades Principais

### 👥 Gestão de Funcionários
- Cadastro e edição de funcionários com campos de foto, CPF, cargo, e setor.
- Vinculação de permissões e perfis de acesso (Administrador, RH, Supervisor, Colaborador).
- Importação e exportação de dados em formato CSV ou XLSX.

### 🕑 Registros de Ponto
- Visualização em tempo real das marcações vindas do app mobile.  
- Filtro por período, funcionário, setor e status (válido, fora de área, manual, etc).
- Validação de batidas com geolocalização e reconhecimento facial.
- Controle de horários de entrada, saída, pausas e extras.

### 📍 Mapa de Localizações
- Exibição em mapa interativo (Google Maps API) das marcações com pins coloridos.
- Indicação de desvios de localização e áreas não autorizadas (geofencing).
- Visualização agrupada por região ou equipe.

### 📊 Relatórios e Exportações
- Geração de relatórios personalizados (diários, semanais e mensais).
- Exportação para PDF, Excel e integração direta com Google Sheets.
- Cálculo automático de horas trabalhadas, atrasos e horas extras.

### 🔒 Segurança e Conformidade
- Autenticação por JWT + refresh token seguro.
- Criptografia de dados sensíveis (bcrypt + AES-256).
- Logs de auditoria e rastreabilidade de alterações.
- Conformidade com LGPD: consentimento de uso de dados e retenção mínima.

### ⚙️ Configurações do Sistema
- Parametrização de jornada padrão, tolerância de atraso e banco de horas.
- Definição de áreas geográficas autorizadas para marcação de ponto.
- Gestão de dispositivos registrados (sincronizados com o app mobile).
- Personalização visual (cores e logotipo da empresa).

---

## 🧩 Integração com o App Mobile

- Sincronização via API REST e WebSocket em tempo real.
- Upload e validação automática de fotos (reconhecimento facial opcional).
- Envio bidirecional de status de marcação (sucesso, erro, validação manual).
- Acesso unificado por token e sincronização de dados offline → online.

---

## 🎨 Padrão de Design

- **Cores principais:** Azul escuro (`#0D1B2A`), Amarelo contraste (`#FFD60A`), Branco (`#FFFFFF`)  
- **Fontes recomendadas:** Inter, Poppins ou Roboto  
- **Layout:** Responsivo, grid-based, estilo dashboard corporativo  
- **Ícones:** Lucide Icons + SVGs personalizados

---

## 🧱 Estrutura do Projeto

```

/painel-web
│
├── src/
│   ├── components/       # Componentes reutilizáveis (botões, tabelas, modais)
│   ├── pages/            # Páginas principais (Login, Dashboard, Funcionários, Relatórios)
│   ├── services/         # Conexões com API (Axios)
│   ├── hooks/            # Hooks customizados de estado e contexto
│   ├── utils/            # Funções auxiliares
│   └── assets/           # Logos, ícones, imagens estáticas
│
├── .env.example          # Variáveis de ambiente
├── docker-compose.yml    # Configuração de containers
├── package.json
└── README.md

````

---

## ⚡ Instalação e Execução Local

### 1️⃣ Clonar o repositório
```bash
git clone https://github.com/seu-usuario/painel-ponto-digital.git
cd painel-ponto-digital
````

### 2️⃣ Instalar dependências

```bash
npm install
```

### 3️⃣ Configurar variáveis de ambiente

Crie um arquivo `.env` com base em `.env.example` e defina:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/pontodigital
JWT_SECRET=seu_token_seguro
AWS_S3_BUCKET=nome-do-bucket
GOOGLE_MAPS_API_KEY=sua_chave
```

### 4️⃣ Executar em ambiente local

```bash
npm run dev
```

### 5️⃣ Build para produção

```bash
npm run build
npm start
```

---

## 🧠 Boas Práticas de Desenvolvimento

* Seguir o padrão de componentes reutilizáveis (Atomic Design).
* Manter código tipado e documentado (TypeScript + JSDoc).
* Usar commits semânticos (`feat:`, `fix:`, `chore:`, etc.).
* Implementar testes automatizados (Jest + React Testing Library).
* Realizar code review antes de merges principais.

---

## 🔄 Roadmap Futuro

* [ ] Dashboard analítico avançado (BI integrado)
* [ ] Chat interno entre gestores e colaboradores
* [ ] Controle de dispositivos ativos
* [ ] Exportação automática para folha de pagamento
* [ ] Módulo de férias e afastamentos

---

## 👨‍💻 Equipe Técnica

| Função             | Responsável |
| ------------------ | ----------- |
| Product Owner      | Luis        |
| Tech Lead          | (a definir) |
| Frontend Developer | (a definir) |
| Backend Developer  | (a definir) |
| UI/UX Designer     | (a definir) |

---

## 🧾 Licença

Este projeto está sob a licença **MIT** — veja o arquivo `LICENSE` para mais detalhes.

---

> **Sistema de Ponto Digital — Painel Web**
> Desenvolvimento inspirado em soluções corporativas como **Solides RH** e **Pontomais**,
> com foco em **precisão, segurança e escalabilidade.**
