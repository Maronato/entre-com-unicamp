import { FunctionComponent, ReactNode } from "react"

import { Disclosure } from "@headlessui/react"
import { ChevronUpIcon } from "@heroicons/react/solid"
import { GetServerSideProps, NextPage } from "next"

import Button from "@/components/Button"
import Layout from "@/components/Layout"
import { UserFallback, UserProvicer } from "@/utils/browser/hooks/useUser"
import { serverFetch } from "@/utils/server/auth"

const RegularLink: FunctionComponent<{ href: string }> = ({
  href,
  children,
}) => (
  <a href={href} className="text-blue-500 underline hover:text-blue-600">
    {children}
  </a>
)

const FAQ: FunctionComponent<{ question: string }> = ({
  question,
  children,
}) => (
  <Disclosure
    as="div"
    className="flex flex-col text-left rounded-xl border border-gray-400 border-opacity-0 transition-all duration-200 hover:border-opacity-20">
    {({ open }) => (
      <>
        <Disclosure.Button className="p-4 text-xl font-bold tracking-tight flex flex-row justify-between items-center">
          <span className="text-left">{question}</span>
          <ChevronUpIcon
            className={`${
              open ? "" : "transform rotate-180"
            } w-5 h-5 text-primary-500 shrink-0 ml-2`}
          />
        </Disclosure.Button>
        <Disclosure.Panel className="px-4 pb-4 text-base text-gray-500 dark:text-gray-400 whitespace-pre-line">
          {children}
        </Disclosure.Panel>
      </>
    )}
  </Disclosure>
)

type Props = {
  fallback: UserFallback
}

const IndexPage: FunctionComponent = () => {
  const faq: { question: string; answer: ReactNode }[] = [
    {
      question: "O que é isso?",
      answer: () => (
        <div>
          <p>
            Sabe quando você vai criar uma conta em um site e encontra a opção
            {` `}
            <i>Entre com Google</i>, ou <i>Entre com Facebook</i>?<br />
            <b>Entre com Unicamp</b> é a mesma coisa, mas para alunos e
            funcionários da Unicamp!
            <br />
            Com ele, você consegue:
          </p>
          <ul className="mt-2 list-disc list-inside">
            <li className="list-item">
              <b>Criar contas</b> em apps feitos exclusivamente para alunos e
              funcionários
            </li>
            <li className="list-item">
              <b>Desenvolver outros apps</b> exclusivos para alunos e
              funcionários
            </li>
          </ul>
          <p className="mt-5">
            Tudo isso de forma segura, fácil, e com privacidade 😊
          </p>
        </div>
      ),
    },
    {
      question: "Como funciona?",
      answer: () => (
        <>
          <div className="mb-3">
            <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300">
              Para Usuários
            </h3>
            <div>
              <p>
                Você encontra um app bacana e decide criar uma conta. Na hora de
                entrar, você vê que ele oferece a opção{" "}
                <b>
                  <i>Entre com Unicamp</i>
                </b>
              </p>
              <ul className="list-inside list-disc mt-3">
                <li className="list-item">
                  Você clica em <b>Entre com Unicamp</b>
                </li>
                <li className="list-item">
                  Aparece uma janela pedindo seu email da Unicamp
                </li>
                <li className="list-item">
                  A gente te envia um email com um código secreto
                </li>
                <li className="list-item">
                  Você digita esse código na tela pra confirmar que o email é
                  seu
                </li>
                <li className="list-item">
                  Uma nova janela vai aparecer te dizendo exatamente que
                  informações o app vai ter sobre você
                </li>
                <li className="list-item">
                  Você aceita e a gente te manda de volta pro app, com sua conta
                  já criada!
                </li>
              </ul>
              <p className="mt-3">É fácil assim 🥳</p>
            </div>
          </div>
          <div className="mt-5">
            <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300">
              Para Desenvolvedores
            </h3>
            <div>
              <p>
                Você criou um app novo e quer que membros da Unicamp possam usar
                seus emails acadêmicos pra logar. Pra isso, você
              </p>
              <ul className="list-inside list-disc mt-3">
                <li className="list-item">
                  <RegularLink href="/profile">Cria uma conta</RegularLink> no
                  Entre com Unicamp
                </li>
                <li className="list-item">
                  Vai até o seu perfil, na{" "}
                  <RegularLink href="/profile#developer">
                    aba de desenvolvedor
                  </RegularLink>
                </li>
                <li className="list-item">
                  Cria um app novo colocando as informações dele
                </li>
                <li className="list-item">
                  Usa o Entre com Unicamp como um provedor comum de OAuth2.{" "}
                  <RegularLink href="https://aaronparecki.com/oauth-2-simplified/#creating-an-app">
                    Leia esse guia para mais informações
                  </RegularLink>
                </li>
              </ul>
              <p className="mt-3">Só isso! 🚀</p>
            </div>
          </div>
        </>
      ),
    },
    {
      question: "Quem pode usar?",
      answer: () => (
        <p>
          Alunos e funcionários da Unicamp com um email da universidade que
          termina em <b>unicamp.br</b>
        </p>
      ),
    },
    {
      question: "Quanto custa?",
      answer: () => (
        <div>
          <p className="text-xl font-bold text-black dark:text-white">Nada!</p>
          <p>Entre com Unicamp é 100% gratuito!</p>
        </div>
      ),
    },
    {
      question: "Quem fez?",
      answer: () => (
        <p>
          Feito com<span className="mx-1">❤️</span> por{` `}
          <RegularLink href="https://github.com/Maronato">
            Gustavo Maronato
          </RegularLink>
          <br />
          Código disponível no{` `}
          <RegularLink href="https://github.com/Maronato/entre-com-unicamp">
            Github
          </RegularLink>
        </p>
      ),
    },
  ]

  return (
    <div className="flex flex-col my-32 divide-y dark:divide-gray-700">
      <div className="flex flex-col">
        <div>
          <h1 className="text-5xl font-extrabold text-gray-700 dark:text-gray-200 text-center tracking-tight relative">
            Entre com Unicamp{" "}
            <span className="text-sm font-medium tracking-normal absolute top-0">
              (não oficial)
            </span>
          </h1>
          <p className="text-2xl text-gray-500 dark:text-gray-400 text-center mt-10">
            Um provedor de OAuth2 para apps feitos por e para membros da{" "}
            <span className="text-secondary-600 dark:text-secondary-500 font-bold">
              Unicamp
            </span>
          </p>
        </div>
        <div className="flex flex-col lg:flex-row mt-20 items-center w-full justify-between max-w-md mx-auto">
          <Button
            color="secondary"
            href="/login"
            large
            className="mb-10 lg:mb-0">
            Entre
          </Button>
          <Button color="primary" outline href="/profile#developer" large>
            Registre um app novo
          </Button>
        </div>
        <div className="mt-5 text-lg text-gray-500 dark:text-gray-400 text-center mb-20">
          Esse <span className="underline">não</span> é um projeto oficial da
          Unicamp
        </div>
      </div>
      <div className="flex flex-col">
        <h1 className="mt-20 text-3xl font-extrabold text-gray-700 dark:text-gray-200 text-center tracking-tight">
          Tem perguntas?
        </h1>
        <section className="flex flex-col space-y-4 mx-auto mt-10 w-full max-w-screen-md">
          {faq.map((item) => (
            <FAQ key={item.question} question={item.question}>
              {item.answer}
            </FAQ>
          ))}
        </section>
      </div>
    </div>
  )
}

const Page: NextPage<Props> = ({ fallback, ...props }) => {
  return (
    <UserProvicer fallback={fallback}>
      <Layout>
        <IndexPage {...props} />
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
