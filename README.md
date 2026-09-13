# Pupify

**Gestão veterinária inteligente, feita para clínicas que querem trabalhar melhor.**

Pupify é uma plataforma completa de gestão para clínicas veterinárias, centralizando pacientes, tutores, agenda, prontuários, internações, cirurgias, estoque, financeiro e comunicação em um único sistema.

O projeto também explora recursos de **Inteligência Artificial aplicados à rotina veterinária**, incluindo consultas assistidas por IA e geração de informações clínicas a partir do atendimento.

---

## Visão geral

O Pupify foi desenvolvido para resolver um problema comum em clínicas veterinárias: informações espalhadas entre sistemas, planilhas, WhatsApp e processos manuais.

A plataforma concentra a operação da clínica em um único ambiente:

* 🐶 Pacientes e tutores
* 📅 Agenda e consultas
* 🩺 Prontuários veterinários
* 🤖 Consultas assistidas por IA
* 🏥 Internações e acompanhamento de pacientes
* 💉 Vacinas e procedimentos
* 🔬 Exames
* 🧬 Cirurgias
* 📦 Estoque
* 💰 Gestão financeira
* 💬 WhatsApp
* 📄 Documentos e templates
* 👥 Gestão de equipe e permissões
* 📊 Dashboard e indicadores

---

## Principais recursos

### 🐾 Gestão de pacientes

Cadastro completo dos animais, incluindo:

* Espécie
* Raça
* Sexo
* Data de nascimento
* Peso
* Microchip
* Alergias
* Condições crônicas
* Tutor responsável
* Histórico clínico

O modelo de dados também permite relacionar cada paciente diretamente à clínica e ao histórico de atendimentos.

---

### 📅 Agenda

Gerenciamento de consultas e procedimentos com suporte para diferentes tipos de atendimento:

* Consulta
* Retorno
* Vacina
* Cirurgia
* Exame
* Banho e tosa
* Emergência

Os agendamentos possuem status próprios, como:

`Agendado` → `Confirmado` → `Em atendimento` → `Concluído`

Além de cancelamentos e faltas.

---

### 🩺 Prontuário veterinário

O prontuário foi estruturado para acompanhar todo o histórico clínico do paciente.

É possível registrar:

* Queixa principal
* Anamnese
* Sintomas
* Diagnóstico
* Plano diagnóstico
* Plano de tratamento
* Observações
* Prescrições
* Documentos da consulta
* Notas SOAP

O sistema suporta tanto consultas **manuais** quanto consultas assistidas por **IA**.

---

### 🤖 Inteligência Artificial

Um dos principais diferenciais do Pupify é a utilização de IA dentro do fluxo de atendimento veterinário.

O sistema possui estrutura para consultas no modo:

```text
AI
Manual
```

Durante o atendimento, informações podem ser transformadas em dados estruturados para o prontuário, incluindo informações clínicas e notas SOAP.

O objetivo é reduzir o trabalho administrativo do veterinário e permitir que ele se concentre no paciente.

---

### 🏥 Internações

O módulo de internação permite acompanhar pacientes hospitalizados em tempo real.

Cada internação pode possuir:

* Motivo da internação
* Box/Canil
* Veterinário responsável
* Status clínico
* Nível de dor
* Dieta
* Valor da diária
* Sinais vitais
* Prescrições e ordens de tratamento
* Relatório de alta

Os sinais vitais podem incluir:

* Temperatura
* Frequência cardíaca
* Frequência respiratória
* Pressão arterial
* Saturação de oxigênio

---

### 🔪 Cirurgias

Gerenciamento de procedimentos cirúrgicos, incluindo informações do paciente, equipe, procedimento e acompanhamento.

O sistema possui estrutura específica para checklists e informações relacionadas ao procedimento.

---

### 📦 Estoque

Controle de produtos e insumos utilizados pela clínica.

O módulo pode ser utilizado para gerenciar:

* Medicamentos
* Vacinas
* Materiais
* Produtos
* Quantidades
* Movimentações

---

### 💰 Financeiro

Controle das movimentações financeiras da clínica.

O sistema possui estrutura para:

* Receitas
* Despesas
* Transações
* Relatórios
* Associação de movimentações com pacientes e tutores
* Indicadores financeiros

---

### 💬 WhatsApp

O Pupify possui estrutura para integração com WhatsApp, permitindo trabalhar com:

* Contatos
* Conversas
* Etiquetas
* Respostas rápidas
* Respostas automáticas
* Atribuição de contatos para membros da equipe

Também existe estrutura para notificações e lembretes relacionados a consultas.

---

## Multi-tenancy

O Pupify foi projetado desde a camada de banco para suportar múltiplas clínicas.

Cada clínica é representada por um `Tenant`, podendo possuir:

* Usuários
* Pacientes
* Tutores
* Veterinários
* Consultas
* Internações
* Cirurgias
* Estoque
* Transações
* Arquivos
* Templates
* Notificações
* Configurações de WhatsApp

Isso permite evoluir o projeto para um modelo SaaS com múltiplas clínicas utilizando a mesma aplicação.

---

## Controle de acesso

O sistema possui controle granular de permissões.

### Roles

Atualmente existem diferentes perfis de usuário:

* `SUPER_ADMIN`
* `CLINIC_ADMIN`
* `VETERINARIAN`
* `RECEPTIONIST`
* `TECHNICIAN`
* `CLIENT`

Além dos papéis, as permissões podem ser configuradas individualmente por usuário.

Exemplos:

```text
patients_view
patients_create
patients_edit
patients_delete

agenda_view
agenda_create
agenda_edit
agenda_delete

consultations_view
consultations_create
consultations_edit
consultations_ai

financial_view
financial_create
financial_edit

inventory_view
inventory_create
inventory_edit

whatsapp_view
whatsapp_send
whatsapp_manage
```

Isso permite adaptar o sistema às diferentes funções existentes dentro de uma clínica.

---

# Arquitetura

O projeto é dividido principalmente em três partes:

```text
Pupify
│
├── app/           # Aplicação web Next.js
├── components/    # Componentes de interface
├── hooks/         # React hooks
├── lib/           # Bibliotecas e utilitários
├── styles/        # Estilos
│
├── backend/       # API e regras de negócio
│   ├── src/
│   └── prisma/
│
├── public/        # Assets públicos
│
└── src-tauri/     # Aplicação desktop
```

### Frontend

O frontend utiliza:

* Next.js 16
* React 19
* TypeScript
* Tailwind CSS
* Radix UI
* Tiptap
* React Hook Form
* Zod
* Recharts
* dnd-kit
* Lucide React

A aplicação utiliza componentes reutilizáveis e uma arquitetura baseada em React/Next.js.

---

### Backend

O backend é uma API independente construída com:

* Node.js
* TypeScript
* Fastify
* Prisma
* PostgreSQL
* JWT
* Zod

Também existem integrações com:

* AWS S3
* SMTP/Nodemailer
* WhatsApp
* Cron jobs
* Swagger/OpenAPI

O backend possui documentação Swagger disponível durante o desenvolvimento.

---

### Banco de dados

O banco utiliza **PostgreSQL** através do Prisma ORM.

O schema possui entidades para toda a operação da clínica, incluindo autenticação, multi-tenancy, pacientes, tutores, consultas, internações, prontuários, prescrições, estoque, financeiro, cirurgias, WhatsApp, arquivos e outros módulos.

---

### Desktop

O Pupify também possui integração com **Tauri 2**, permitindo empacotar a aplicação como um aplicativo desktop.

A configuração atual utiliza:

```text
Tauri 2
├── macOS
├── Windows
├── Linux
└── Android
```

O frontend Next.js é utilizado como interface da aplicação desktop.

---

# Requisitos

Antes de começar, tenha instalado:

* Node.js 20+
* npm
* PostgreSQL 14+
* Git

Para utilizar o ambiente com Docker, também é necessário:

* Docker
* Docker Compose

---

# Instalação

Clone o projeto:

```bash
git clone https://github.com/andrichluiz-lab/pupify.git

cd pupify
```

Instale as dependências do frontend:

```bash
npm install
```

Depois configure o backend:

```bash
cd backend

npm install
```

Crie o arquivo de ambiente:

```bash
cp .env.example .env
```

Configure a conexão com PostgreSQL:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/pupify?schema=public"
```

---

# Banco de dados

Execute as migrations:

```bash
npm run prisma:migrate
```

Gere o Prisma Client:

```bash
npm run prisma:generate
```

Opcionalmente, execute o seed:

```bash
npm run prisma:seed
```

Para abrir o Prisma Studio:

```bash
npm run prisma:studio
```

---

# Executando o projeto

## Backend

Dentro de `backend/`:

```bash
npm run dev
```

A API ficará disponível em:

```text
http://localhost:3001
```

A documentação Swagger pode ser acessada em:

```text
http://localhost:3001/docs
```

---

## Frontend

Na raiz do projeto:

```bash
npm run dev
```

A aplicação estará disponível em:

```text
http://localhost:3000
```

---

# Build

### Frontend

```bash
npm run build
```

### Backend

```bash
cd backend

npm run build
```

### Produção

```bash
npm start
```

---

# Aplicação Desktop

Para executar a versão desktop durante o desenvolvimento:

```bash
npm run tauri:dev
```

Para gerar os instaladores:

```bash
npm run tauri:build
```

O projeto utiliza Tauri 2 para empacotar a aplicação desktop.

---

# API

Alguns dos principais endpoints disponíveis:

### Patients

```http
GET    /api/patients
GET    /api/patients/:id
POST   /api/patients
PUT    /api/patients/:id
DELETE /api/patients/:id
```

### Appointments

```http
GET    /api/appointments
GET    /api/appointments/today
GET    /api/appointments/:id
POST   /api/appointments
PUT    /api/appointments/:id
DELETE /api/appointments/:id
```

### Hospitalizations

```http
GET  /api/hospitalizations
GET  /api/hospitalizations/details
GET  /api/hospitalizations/:id
POST /api/hospitalizations
PUT  /api/hospitalizations/:id
```

### Medical Records

```http
GET  /api/medical-records
GET  /api/medical-records/:id
POST /api/medical-records
PUT  /api/medical-records/:id
```

### Inventory

```http
GET    /api/inventory
GET    /api/inventory/:id
POST   /api/inventory
PUT    /api/inventory/:id
DELETE /api/inventory/:id
```

### Financial

```http
GET  /api/financial/transactions
GET  /api/financial/transactions/:id
POST /api/financial/transactions
PUT  /api/financial/transactions/:id
```

### Dashboard

```http
GET /api/dashboard/stats
GET /api/dashboard/revenue
```

A API possui documentação interativa via Swagger.

---

# Stack

| Camada         | Tecnologia            |
| -------------- | --------------------- |
| Frontend       | Next.js               |
| UI             | React                 |
| Linguagem      | TypeScript            |
| Styling        | Tailwind CSS          |
| Components     | Radix UI              |
| Editor         | Tiptap                |
| Forms          | React Hook Form + Zod |
| Charts         | Recharts              |
| Backend        | Fastify               |
| ORM            | Prisma                |
| Database       | PostgreSQL            |
| Authentication | JWT                   |
| Storage        | AWS S3                |
| Email          | Nodemailer            |
| Desktop        | Tauri 2               |
| API Docs       | Swagger / OpenAPI     |

---

# Roadmap

O Pupify está em desenvolvimento contínuo.

Algumas áreas de evolução incluem:

* [ ] Aprimorar recursos de IA durante consultas
* [ ] Transcrição de consultas em tempo real
* [ ] Geração automática de prontuários
* [ ] Análise de exames por IA
* [ ] Automação de comunicação via WhatsApp
* [ ] Melhorias no módulo financeiro
* [ ] Aplicativo mobile
* [ ] Portal do tutor
* [ ] Notificações inteligentes
* [ ] Relatórios avançados
* [ ] Integrações com serviços externos

---

# Licença

Este projeto está licenciado sob a licença **MIT**.

---

## Autor

Desenvolvido por **Luiz Felipe Andrich**.

[GitHub](https://github.com/andrichluiz-lab)
