import { createContext, FunctionComponent, useContext, useState } from "react";
import type { ResourceOwner } from "../oauth2/authorizationServer/resourceOwner";

interface AuthContext {
  user: ResourceOwner | undefined
  sendEmailCode(email: string): Promise<boolean>
  login(email: string, emailCode: string): Promise<boolean>
  logout(): Promise<void>
}

const context = createContext<AuthContext>({ user: undefined } as AuthContext)

export const useAuth = () => useContext(context)

export const AuthProvider: FunctionComponent = ({ children }) => {
  const [user, setUser] = useState<ResourceOwner>()

  const sendEmailCode: AuthContext['sendEmailCode'] = (email) => {
    return fetch("/api/login/sendEmailCode", { body:  })
  }


  return <context.Provider>{children}</context.Provider>
}
