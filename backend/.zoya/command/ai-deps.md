This file contains guiding principles for AI provider and model dependency management in ZOYA.

## AI Provider Support

ZOYA supports multiple AI providers. Key considerations:
- Latest stable versions of each provider's SDK
- Dependency version constraints consistent across backend and UI
- Fallback handling for unavailable providers
- Rate limiting and quota management at provider level

## Model Integration

Model providers integrate through the LLM module system:
- Plugin-style provider architecture
- Consistent model interface across providers
- Provider capability detection (streaming, tools, vision, etc.)
- Caching of model metadata and capabilities

## Dependency Management Practices

- Use semantic versioning for AI SDK dependencies
- Lock provider versions to specific ranges, not ranges
- Test against multiple provider versions for compatibility
- Maintain separate testing environments for different providers

## Security Considerations

- API keys and provider credentials are loaded from environment variables
- No provider credentials committed to version control
- Token usage monitoring and alerting implemented per provider

## Integration Points

Providers integrate through:
- LLM module system
- Core provider management services
- API configuration system
- Usage analytics and billing

See also .zoya/agent/command and .zoya/agent/tool for related workflows.