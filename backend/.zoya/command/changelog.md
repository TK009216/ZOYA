This file provides project information and guidelines for the ZOYA AI assistant project.

## Overview

ZOYA is an AI-powered development tool with both a backend server and web interface. It combines AI capabilities with efficient development workflows.

## Project Structure

ZOYA consists of:
- **Backend**: API server, agent management, and core AI logic
- **UI**: Web interface for interacting with ZOYA
- **Shared**: Common functionality and utilities

## Key Features

- **Agent Orchestration**: Multiple AI agents with specialized roles
- **Development Tools**: Code analysis, refactoring, and workflow optimization
- **Web Interface**: Modern web UI for project management
- **Cross-Platform Support**: Windows, macOS, and Linux

## Development Guidelines

### Backend Development
- Uses Bun for TypeScript compilation
- Electron for packaging (for Electron products)
- SQLite for local data storage
- WebSocket communication for real-time updates

### Frontend Development
- React-based UI with Zod schemas
- UnoCSS for styling
- Vite for development server
- Electron integration for desktop app

## Usage

The project supports:
- Local development with hot reload
- Building for production
- Packaging for different platforms
- Running as an app, CLI tool, or web service

## Configuration

Environment variables are loaded from .env files. Key configuration options include:
- Database connection
- API keys for AI providers
- Server ports and hosts
- Path configurations

## Documentation

Refer to README.md in individual packages for more specific usage and development instructions.

See .zoya/agent/command and .zoya/command/ for agent and command documentation.