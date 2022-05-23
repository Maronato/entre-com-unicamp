export enum Scope {
  OPENID = "openid",
  PROFILE_READ = "profile",
  PROFILE_WRITE = "profile:write",
  APPS_READ = "apps",
  APPS_WRITE = "apps:write",
  EMAIL_READ = "email",
}

enum ScopeDescriptions {
  OPENID = "Acessar seus dados usando OpenID Connect",
  PROFILE_READ = "Ver seu perfil público",
  PROFILE_WRITE = "Modificar seu perfil público",
  APPS_READ = "Ver seus apps",
  APPS_WRITE = "Modificar seus apps",
  EMAIL_READ = "Ver seu email público",
}

enum ScopeDevDescriptions {
  OPENID = "Scope básica do OIDC",
  PROFILE_READ = "Acessar o perfil público do usuário",
  PROFILE_WRITE = "Modificar o perfil público do usuário",
  APPS_READ = "Acessar os apps do usuário",
  APPS_WRITE = "Modificar os apps do usuário",
  EMAIL_READ = "Acessar o email do usuário",
}
export function getScopeDescription(scope: Scope): ScopeDescriptions {
  const res = Object.entries(Scope).find(([, value]) => value === scope)
  if (res) {
    return ScopeDescriptions[res[0] as "PROFILE_READ"]
  }
  return ScopeDescriptions.PROFILE_READ
}
export function getScopeDevDescription(scope: Scope): ScopeDevDescriptions {
  const res = Object.entries(Scope).find(([, value]) => value === scope)
  if (res) {
    return ScopeDevDescriptions[res[0] as "PROFILE_READ"]
  }
  return ScopeDevDescriptions.PROFILE_READ
}

export function isScope(v: unknown): v is Scope {
  return Object.values(Scope).includes(v as Scope)
}

export const REQUIRED_SCOPE = [Scope.PROFILE_READ, Scope.EMAIL_READ]

export const DEFAULT_SCOPE = [
  Scope.PROFILE_READ,
  Scope.EMAIL_READ,
  Scope.OPENID,
]
