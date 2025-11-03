# Agentic Chat Endpoint

A simple ai agent application featuring streaming responses with reasoning transparency(if the model support it) and tool calling responses and web search capabilities(simple just to show how it works ). Built with Next.js frontend and Express backend, leveraging Google Gemini AI models through LangChain and also a manual aget with custom configs.

## 📋 Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Development](#development)

## 🎯 About

This project is a simple ai agentic application with only one endpoit `/caht` that demonstrates advanced AI capabilities with:

- **Streaming AI Responses**: Real-time streaming of AI-generated content using Server-Sent Events (SSE)
- **Reasoning Transparency**: View the AI's thought process and reasoning steps(when the model support it)
- **Web Search Integration**: Built-in web search tool that allows the AI to fetch and incorporate real-time information
- **Dual Agent Modes**: Support for both LangChain agents and manual function calling modes
- **Modern UI**: Beautiful, responsive interface built with Next.js and Tailwind CSS

## ✨ Features

- 🤖 AI-powered chat interface using Google Gemini models
- 🔍 Web search capabilities for real-time information retrieval
- 📡 Server-Sent Events (SSE) for real-time streaming responses
- 🧠 Reasoning process visualization
- 🔧 Tool call tracking and display
- 🎨 Modern, gradient-based UI design
- 🔄 Support for both automatic and manual agent modes

## 🛠 Tech Stack

### Backend
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **LangChain** - AI agent framework
- **Google Gemini AI** - AI model provider
- **DuckDuckGo** - Web search integration
- **Cheerio** - HTML parsing for web scraping

### Frontend
- **Next.js 16** - React framework
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI component library
- **Radix UI** - Accessible component primitives

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **Yarn** package manager
- **pnpm** package manager (for frontend)
- **Google Gemini API Key** ([Get one here](https://aistudio.google.com/app/apikey))

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agentic-chat-endpoint
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   yarn install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   pnpm install
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
# Google Gemini API Key (Required)
# Get your API key from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Server Port (Optional, defaults to 3003)
PORT=3003
```

### Example `.env` file:

```env
GEMINI_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PORT=3003
```

**Important Notes:**
- The `GEMINI_API_KEY` is **required** for the application to work
- Keep your API key secure and never commit it to version control
- The `.env` file should be listed in `.gitignore`

### Frontend Configuration

The frontend connects to the backend at `http://localhost:3003` by default. If you change the backend port, you'll need to update the API endpoint in `frontend/app/page.tsx`:

```typescript
const response = await fetch("http://localhost:3003/chat/", {
  // ... rest of the config
})
```

## 🎬 Getting Started

### Development Mode

1. **Start the backend server**
   ```bash
   cd backend
   yarn dev
   ```
   The backend will start on `http://localhost:3003` (or your configured PORT)

2. **Start the frontend development server** (in a new terminal)
   ```bash
   cd frontend
   pnpm dev
   ```
   The frontend will start on `http://localhost:3000`

3. **Open your browser**
   Navigate to `http://localhost:3000` to see the chat interface

### Production Mode

1. **Build the backend**
   ```bash
   cd backend
   yarn build
   yarn start
   ```

2. **Build and start the frontend**
   ```bash
   cd frontend
   pnpm build
   pnpm start
   ```

## 📁 Project Structure

```
agentic-chat-endpoint/
├── backend/
│   ├── dist/              # Compiled JavaScript files
│   ├── node_modules/      # Backend dependencies
│   ├── server.ts          # Main backend server file
│   ├── package.json       # Backend dependencies and scripts
│   ├── tsconfig.json      # TypeScript configuration
│   └── .env              # Environment variables (create this)
│
├── frontend/
│   ├── app/               # Next.js app directory
│   │   ├── page.tsx      # Main chat page
│   │   ├── layout.tsx    # Root layout
│   │   └── globals.css   # Global styles
│   ├── components/        # React components
│   │   └── ui/           # shadcn/ui components
│   ├── lib/              # Utility functions
│   ├── public/           # Static assets
│   ├── package.json      # Frontend dependencies and scripts
│   └── next.config.mjs   # Next.js configuration
│
└── README.md             # This file
```

## 🔌 API Endpoints

### POST `/chat`

Send a chat query to the AI agent.

**Request Body:**
```json
{
  "query": "What is the weather like today?",
  "manual": false
}
```

**Parameters:**
- `query` (string, required): The user's question or prompt
- `manual` (boolean, optional): Use manual agent mode (default: false)

**Response:**
- Content-Type: `text/event-stream` (SSE format)
- Streams events with types:
  - `reasoning`: AI reasoning/thinking process
  - `tool_call`: Tool invocations and results
  - `response`: AI response content
  - `end`: Stream completion

**Example Response Stream:**
```
data: {"type":"reasoning","content":"Thinking about relevant factors..."}

data: {"type":"tool_call","tool":"web_search","input":"weather today","output":"..."}

data: {"type":"response","content":"Based on the search results..."}

event: end
data: {}
```

## 💻 Development

### Backend Scripts

- `yarn dev` - Start development server with hot reload
- `yarn build` - Compile TypeScript to JavaScript
- `yarn start` - Start production server

### Frontend Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

### Key Implementation Details

- **Web Search Tool**: The backend includes a custom web search tool that scrapes DuckDuckGo results. In production, consider using official APIs like SerpAPI or DuckDuckGo Search from LangChain community tools.
- **Streaming**: Both agent modes support streaming responses for real-time user experience.
- **Model Selection**: Currently uses `gemini-2.5-flash`. You can switch to `gemini-1.5-pro` by modifying `MODEL_NAME` in `backend/server.ts`.

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Made with ❤️ using Next.js, Express, and Google Gemini AI

