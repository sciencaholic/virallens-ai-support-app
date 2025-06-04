# Virallens AI Customer Support Chat App

A full-stack AI-powered customer support chat application with user authentication, chat history, and integration with Google's Gemma 3 4B model via OpenRouter.

## Features

- **User Authentication**: JWT-based signup/login with bcrypt password hashing
- **AI Chat**: Powered by Google's Gemma 3 4B model via OpenRouter.ai
- **Chat History**: Persistent chat storage in MongoDB with sidebar navigation
- **Real-time Chat**: Interactive chat interface with typing indicators
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dockerized**: Complete Docker setup for easy deployment
- **Free AI Model**: Uses Google's free Gemma 3 4B model with no API costs

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React |
| **Backend** | Node.js + Express |
| **Database** | MongoDB |
| **AI Model** | Google Gemma 3 4B (free) via OpenRouter |
| **Authentication** | JWT + bcrypt |
| **DevOps** | Docker + Docker Compose |

## Prerequisites

- **Node.js** (v18+)
- **Docker & Docker Compose**
- **OpenRouter.ai API key** (free)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd virallens-ai-support-app
```

### 2. Get Your Free OpenRouter API Key

1. Visit [OpenRouter.ai](https://openrouter.ai)
2. Sign up for a **free account**
3. Navigate to **API Keys** section
4. Create a new API key
5. Copy the key for the next step

### 3. Set Up Environment Variables

**Backend Configuration** (`server/.env`):
```bash
# Copy the example file
cp server/.env.example server/.env
```

Edit `server/.env` and add your API key and JWT Token:
```bash
# Node.js Configuration
NODE_ENV=development
PORT=3001
APP_URL=http://localhost:3000

# Database Configuration  
MONGODB_URI=mongodb://admin:password123@mongodb:27017/virallens?authSource=admin
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=password123

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=24h

# OpenRouter AI Configuration
OPENROUTER_API_KEY=your-openrouter-api-key-here
AI_API_URL=https://openrouter.ai/api/v1/chat/completions
AI_MODEL=google/gemma-3-4b-it:free
AI_MAX_TOKENS=512
AI_TEMPERATURE=0.7
```

**Frontend Configuration** (`client/.env`):
```bash
# Copy the example file
cp client/.env.example client/.env
```

The default frontend configuration should work out of the box.

### 4. Run with Docker

```bash
# Start all services and run in background
docker compose up -d --build
```

### 5. Access the Application

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **MongoDB**: localhost:27017

## Usage Guide

### Getting Started
1. **Sign Up**: Create a new account with email and password (No validation setup yet)
2. **Login**: Login to your account
3. **Start Chatting**: Type messages to interact with Gemma 3 4B
4. **View History**: Previous conversations are saved in the sidebar
5. **New Chat**: Start fresh conversations anytime

## API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/auth/signup` | User registration | No |
| `POST` | `/auth/login` | User login | No |
| `GET` | `/auth/me` | Get user profile | Yes |
| `POST` | `/chat/send` | Send message to AI | Yes |
| `GET` | `/chat/history` | Get user's chat history | Yes |
| `GET` | `/chat/:chatId` | Get specific chat | Yes |
| `DELETE` | `/chat/:chatId` | Delete chat | Yes |
| `POST` | `/chat/new` | Start new chat | Yes |

## Deployment

### Using Docker

The application is fully containerized and can be deployed on any platform supporting Docker.

## AI Configuration

### Model Selection
Currently using `google/gemma-3-4b-it:free`. You can change to other models:

```bash
# Other free models available on OpenRouter
AI_MODEL=google/gemini-2.0-flash-exp:free
AI_MODEL=deepseek/deepseek-r1-0528-qwen3-8b:free
AI_MODEL=meta-llama/llama-3.3-8b-instruct:free
```

### Customizing AI Behavior

Edit in `server/.env`:
```bash
# Adjust response length (1-2048)
AI_MAX_TOKENS=512

# Control creativity (0.0-2.0)
AI_TEMPERATURE=0.7

# Customize personality
AI_SYSTEM_PROMPT=You are a helpful customer support assistant for TechCorp. Be professional but friendly.
```
