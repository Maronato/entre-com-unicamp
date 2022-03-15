export enum Scope {
  ID_READ = "id:read",
  EMAIL_READ = "email:read",
  APPS_READ = "apps:read",
  APPS_WRITE = "apps:write",
}

export enum ScopeDescriptions {
  ID_READ = "Ver o seu ID",
  EMAIL_READ = "Ver o seu email",
  APPS_READ = "Ver os seus apps",
  APPS_WRITE = "Ver e modificar os seus apps",
}
export function getScopeDescription(scope: Scope): ScopeDescriptions {
  const res = Object.entries(Scope).find(([, value]) => value === scope)
  if (res) {
    return ScopeDescriptions[res[0] as "ID_READ"]
  }
  return ScopeDescriptions.ID_READ
}

export function isScope(v: unknown): v is Scope {
  return Object.values(Scope).includes(v as Scope)
}
