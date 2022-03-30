export enum Scope {
  PROFILE_READ = "profile:read",
  PROFILE_WRITE = "profile:write",
  APPS_READ = "apps:read",
  APPS_WRITE = "apps:write",
}

enum ScopeDescriptions {
  PROFILE_READ = "Ver seu perfil público",
  PROFILE_WRITE = "Modificar seu perfil público",
  APPS_READ = "Ver seus apps",
  APPS_WRITE = "Modificar seus apps",
}
export function getScopeDescription(scope: Scope): ScopeDescriptions {
  const res = Object.entries(Scope).find(([, value]) => value === scope)
  if (res) {
    return ScopeDescriptions[res[0] as "PROFILE_READ"]
  }
  return ScopeDescriptions.PROFILE_READ
}

export function isScope(v: unknown): v is Scope {
  return Object.values(Scope).includes(v as Scope)
}

export const REQUIRED_SCOPE = [Scope.PROFILE_READ]
