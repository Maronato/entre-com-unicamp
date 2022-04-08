import { FunctionComponent, useEffect, useState } from "react"

import { GetServerSideProps, NextPage } from "next"
import Image from "next/image"

import Layout from "@/components/Layout"
import { DEFAULT_SCOPE, REQUIRED_SCOPE } from "@/oauth/scope"
import OAuthFlowImage from "@/public/docs/oauth.png"
import { UserFallback, UserProvicer } from "@/utils/browser/hooks/useUser"
import { serverFetch } from "@/utils/server/auth"

type Props = {
  fallback: UserFallback
}

const Section: FunctionComponent = ({ children }) => (
  <section className="pt-10">{children}</section>
)

const Heading: FunctionComponent = ({ children }) => (
  <h2 className="text-2xl font-bold text-black dark:text-white">{children}</h2>
)

const Paragraph: FunctionComponent = ({ children }) => (
  <p className="mt-3">{children}</p>
)

const RegularLink: FunctionComponent<{ href: string }> = ({
  href,
  children,
}) => (
  <a
    href={href}
    className="text-blue-500 dark:text-blue-400 underline hover:text-blue-400 dark:hover:text-blue-300">
    {children}
  </a>
)

const DocsPage: FunctionComponent = () => {
  const [baseURL, setBaseURL] = useState("http://localhost:3000")

  useEffect(() => {
    const { origin } = window.location
    setBaseURL(origin)
  }, [])

  return (
    <div className="mt-10 divide-y divide-gray-300 dark:divide-gray-600 space-y-10 text-gray-700 dark:text-gray-200">
      <section>
        <h1 className="text-4xl font-bold text-center text-black dark:text-white">
          Documentação
        </h1>
        <p className="text-xl text-center mt-4 text-gray-500 dark:text-gray-400">
          Aprenda a criar apps e fazer requests para o Entre com Unicamp
        </p>
      </section>
      <Section>
        <Heading>Vai usar OpenID Connect?</Heading>
        <Paragraph>
          O <b>Entre com Unicamp</b> expoõe todos os{" "}
          <RegularLink href="https://datatracker.ietf.org/doc/html/rfc8414#section-3">
            metadados
          </RegularLink>{" "}
          na URL padrão:
          <br />
          <br />
          <RegularLink
            href={`${baseURL}/.well-known/openid-configuration`}>{`${baseURL}/.well-known/openid-configuration`}</RegularLink>
        </Paragraph>
      </Section>
      <Section>
        <Heading>Já sabe usar OAuth 2.0?</Heading>
        <ul className="list-disc list-inside mt-5">
          <li className="list-item">
            <b>Authorize URL</b>: {`${baseURL}/oauth/authorize`}
          </li>
          <li className="list-item">
            <b>Token endpoint</b>: {`${baseURL}/oauth/token`}
          </li>
          <li className="list-item">
            <b>Informações do usuário</b>: {`${baseURL}/api/me`}
          </li>
          <li className="list-item">
            <b>response_type permitidos</b>: {`code`}
          </li>
          <li className="list-item">
            <b>Scope obrigatória</b>: {REQUIRED_SCOPE.join(", ")}
          </li>
          <li className="list-item">
            <b>Scope padrão</b>: {DEFAULT_SCOPE.join(", ")}
          </li>
          <li className="list-item">
            <b>grant_type permitidos</b>: {`authorization_code e refresh_token`}
          </li>
          <li className="list-item">
            <b>TTL do access_token</b>: 1h
          </li>
          <li className="list-item">
            <b>TTL do refresh_token</b>: não expira
          </li>
          <li className="list-item">
            refresh_token é atualizado a cada refresh, com o token anterior
            sendo invalidado
          </li>

          <li className="list-item">Public clients devem usar PKCE.</li>
          <li className="list-item">
            <b>PKCE challenge methods permitidos</b>: {`plain e S256`}
          </li>
        </ul>
      </Section>
      <Section>
        <Heading>Introdução</Heading>
        <Paragraph>
          Bem-vindo(a) à documentação do Entre com Unicamp! Caso você não
          encontre o que está procurando aqui, abra uma issue no{" "}
          <RegularLink href="https://github.com/Maronator/entre-com-unicamp/issues">
            GitHub
          </RegularLink>
          .
        </Paragraph>
        <Paragraph>
          Falando em GitHub, todo o código do Entre com Unicamp é FOSS! Veja
          tudo{" "}
          <RegularLink href="https://github.com/Maronato/entre-com-unicamp">
            Aqui!
          </RegularLink>{" "}
        </Paragraph>
      </Section>
      <Section>
        <Heading>Criando um app</Heading>
        <Paragraph>
          Para criar um app, você primeiro vai precisar de uma conta. Caso ainda
          não tenha criado, faça isso{" "}
          <RegularLink href="/profile">agora mesmo</RegularLink>!
        </Paragraph>
        <Paragraph>
          Depois de criar uma conta, vá na{" "}
          <RegularLink href="/profile#developer">
            aba de Desenvolvedor
          </RegularLink>{" "}
          e clieque em {`"Novo app"`}. Agora você deve preencher os campos do
          seu novo app com as suas informações. A maioria delas é auto
          explicativa, mas existem algumas que configuram a forma que seu app
          vai autenticar seus usuários. Para entender como preencher essas
          informações, vamos dar uma olhada em como funciona o protocol de
          autenticação que o Entre com Unicamp usa, o OAuth2.
        </Paragraph>
      </Section>
      <Section>
        <Heading>Básicos de OAuth2</Heading>
        <Paragraph>
          OAuth 2.0 é um protocolo que permite aos usuários terem acesso
          limitado a recursos de um website ou app sem precisar criar ou expor
          suas credenciais. Você já deve ter visto isso quando foi criar uma
          conta em um site e encontrou a opção <i>Entre com Facebook</i> ou{" "}
          <i>Entre com Google</i>. O Entre com Unicamp fornece o mesmo serviço
          para que apps e usuários possam usar o email acadêmico para logar.
        </Paragraph>
        <Paragraph>
          No caso do Entre com Unicamp, seus usuários poderão logar de forma
          segura em seu app e você terá acesso às informações que eles
          forneceram ao Entre com Unicamp sem nunca ter que pedir uma senha ou
          lidar diretamente com dados confidenciais deles.
        </Paragraph>
        <div className="mt-10" />
        <Heading>Fluxo de autenticação</Heading>
        <Paragraph>
          No Entre com Unicamp o único fluxo de autenticação permitido é o
          Authorization Code. Por conta disso, este será o único fluxo que vamos
          estudar daqui pra frente.
        </Paragraph>
        <Paragraph>
          Este é um diagrama simplificado do fluxo Authorization Code:
        </Paragraph>
        <div className="w-full mt-10 overflow-hidden rounded-md shadow">
          <Image src={OAuthFlowImage} layout="intrinsic" />
        </div>
      </Section>
      <Section>
        <Paragraph>Mais em breve</Paragraph>
      </Section>
    </div>
  )
}

const Page: NextPage<Props> = ({ fallback, ...props }) => {
  return (
    <UserProvicer fallback={fallback}>
      <Layout title="Documentação">
        <DocsPage {...props} />
      </Layout>
    </UserProvicer>
  )
}
export default Page

export const getServerSideProps: GetServerSideProps<Props> = async ({
  req,
}) => {
  const user = await serverFetch(req)

  return {
    props: {
      fallback: { ...user },
    },
  }
}
