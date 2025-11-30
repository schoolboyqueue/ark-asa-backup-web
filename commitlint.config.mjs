import workspaceScopes from '@commitlint/config-workspace-scopes'

const extraScopes = ['deps', 'dev-deps', 'release']

export default {
  extends: ['@commitlint/config-conventional', '@commitlint/config-workspace-scopes'],
  rules: {
    'scope-enum': async (ctx) => {
      const scopeEnum = await workspaceScopes.rules['scope-enum'](ctx)
      return [scopeEnum[0], scopeEnum[1], Array.from(new Set([...scopeEnum[2], ...extraScopes]))]
    }
  },
  prompt: {
    settings: {
      enableMultipleScopes: true
    }
  }
}
