import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { BotaoSalvar } from '@/components/primitives/botao-salvar'
import { Button } from '@/components/primitives/button'
import { Field, Input } from '@/components/primitives/field'
import { Surface } from '@/components/surfaces/surface'
import { fraseDoAcesso, type EstadoAcesso } from '@/core/identity/acesso'
import { canOpenAdmin } from '@/core/identity/permissions'
import { ROLE_DESCRIPTION, ROLE_LABEL } from '@/core/identity/roles'
import { requireSession } from '@/lib/auth/session'
import { enviarFoto, removerFoto, salvarPerfil } from './actions'

export const metadata: Metadata = { title: 'Sua conta' }

const ROTULO_ACESSO: Record<EstadoAcesso, string> = {
  ativo: 'Ativo',
  aguardando: 'Começa em breve',
  encerrado: 'Encerrado',
  suspenso: 'Suspenso',
}

/**
 * A CONTA.
 *
 * Ela era só leitura: papel, acesso, sair. Agora a pessoa também se descreve —
 * foto, nome, e se é empresária.
 *
 * A DIVISÃO QUE ORGANIZA A TELA: em cima o que a Allen sabe e a pessoa não
 * muda (papel, acesso, selo); embaixo o que é dela (foto, nome, empresa).
 * Misturar os dois faria parecer que o prazo de acesso é editável — e a
 * primeira coisa que alguém tentaria seria esticá-lo.
 */
export default async function ContaPage() {
  const session = await requireSession()
  const perfil = session.profile

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-6 pt-10 sm:pt-14">
      <header className="flex items-center gap-5">
        <span className="relative size-20 shrink-0 overflow-hidden rounded-full border border-line bg-navy">
          {perfil?.avatarUrl ? (
            <Image src={perfil.avatarUrl} alt="" fill sizes="80px" className="object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-title font-light text-ink-3">
              {(perfil?.fullName ?? session.email ?? '·').trim().charAt(0).toUpperCase()}
            </span>
          )}
        </span>

        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate text-display font-light">
            {perfil?.fullName ?? 'Sua conta'}
          </h1>
          <p className="truncate text-label text-ink-3">{session.email}</p>
        </div>
      </header>

      {/*
       * O SELO DE PIONEIRO.
       *
       * Só aparece para quem é — e aparece em destaque, não como um chip no
       * meio de metadados. Um selo que se ganha e se mostra pequeno não é
       * selo, é etiqueta.
       */}
      {perfil?.pioneer && (
        <Surface className="flex items-center gap-5 p-6">
          <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-[rgba(243,245,252,0.94)] p-2.5">
            <Image
              src="/brand/selo-pioneiro.png"
              alt="Selo de Pioneiro"
              width={64}
              height={64}
              className="size-full object-contain"
            />
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-caption uppercase tracking-[0.18em] text-blue-light">
              Pioneiro
            </span>
            <p className="max-w-[44ch] text-body text-ink-2">
              Você entrou na arena antes de todo mundo. Este selo é de quem chegou no começo — e
              ele não se perde.
            </p>
          </div>
        </Surface>
      )}

      {/* --- O que a Allen sabe ---------------------------------------------- */}
      <Surface className="flex flex-col divide-y divide-[var(--color-line)]">
        <Linha
          rotulo="Papel"
          valor={ROLE_LABEL[session.role]}
          nota={ROLE_DESCRIPTION[session.role]}
        />
        <Linha
          rotulo="Acesso"
          valor={ROTULO_ACESSO[session.acesso?.estado ?? 'ativo']}
          nota={session.acesso ? fraseDoAcesso(session.acesso) : 'Acesso liberado.'}
        />
      </Surface>

      {/* --- O que é da pessoa ----------------------------------------------- */}
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-title font-light">Seus dados</h2>
          <p className="text-caption text-ink-4">
            Só você e a equipe da Allen veem isto. Nada aqui aparece para outros alunos.
          </p>
        </div>

        {/* Dois <form> IRMÃOS, nunca aninhados: form dentro de form é
            inválido em HTML e o navegador desfaz do jeito dele. */}
        <div className="flex flex-wrap items-center gap-3">
          <form action={enviarFoto} className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              name="arquivo"
              accept="image/jpeg,image/png,image/webp,image/avif"
              required
              className="max-w-[15rem] text-caption text-ink-3 file:mr-3 file:rounded-[var(--radius-control)] file:border file:border-line file:bg-transparent file:px-3 file:py-1.5 file:text-caption file:text-ink-2"
            />
            <Button type="submit" size="sm" variant="secondary">
              {perfil?.avatarUrl ? 'Trocar foto' : 'Enviar foto'}
            </Button>
          </form>

          {perfil?.avatarUrl && (
            <form action={removerFoto}>
              <Button type="submit" size="sm" variant="ghost">
                Remover
              </Button>
            </form>
          )}
        </div>

        <form action={salvarPerfil} className="flex flex-col gap-5">
          <Field label="Nome completo" htmlFor="full_name">
            <Input id="full_name" name="full_name" defaultValue={perfil?.fullName ?? ''} />
          </Field>

          <fieldset className="flex flex-col gap-2">
            <legend className="pb-1 text-label text-ink-2">Você é empresário?</legend>
            {/* Rádio e não caixa: "não respondeu" e "respondeu que não" são
                estados diferentes, e uma caixa só sabe representar um deles. */}
            <div className="flex flex-wrap gap-4">
              {(
                [
                  ['sim', 'Sim'],
                  ['nao', 'Não'],
                ] as const
              ).map(([valor, texto]) => (
                <label key={valor} className="flex items-center gap-2 text-body text-ink-2">
                  <input
                    type="radio"
                    name="is_business"
                    value={valor}
                    defaultChecked={
                      valor === 'sim' ? perfil?.isBusiness === true : perfil?.isBusiness === false
                    }
                    className="size-4 accent-[var(--color-blue)]"
                  />
                  {texto}
                </label>
              ))}
            </div>
          </fieldset>

          <Field
            label="Site da empresa"
            htmlFor="company_url"
            hint="Opcional. Só é guardado se você marcar que é empresário."
          >
            <Input
              id="company_url"
              name="company_url"
              defaultValue={perfil?.companyUrl ?? ''}
              placeholder="suaempresa.com.br"
            />
          </Field>

          <div>
            <BotaoSalvar />
          </div>
        </form>
      </section>

      <div className="flex flex-wrap items-center gap-4 text-caption text-ink-4">
        <Link href="/termos" className="transition-colors hover:text-ink">
          Termos de uso
        </Link>
        <Link href="/privacidade" className="transition-colors hover:text-ink">
          Privacidade
        </Link>
      </div>

      {canOpenAdmin(session.role) && (
        <Link
          href="/admin"
          className="flex items-center justify-between gap-4 rounded-[var(--radius-card)] border border-line px-6 py-5 transition-colors hover:border-line-strong"
        >
          <span className="flex flex-col">
            <span className="text-body text-ink">Allen Admin</span>
            <span className="text-caption text-ink-4">Criar e publicar conteúdo</span>
          </span>
          <span aria-hidden className="text-ink-4">
            →
          </span>
        </Link>
      )}

      <form action="/sair" method="post" className="pb-4">
        <button
          type="submit"
          className="text-label text-ink-4 transition-colors hover:text-ink"
        >
          Sair desta conta
        </button>
      </form>
    </main>
  )
}

function Linha({
  rotulo,
  valor,
  nota,
}: {
  rotulo: string
  valor: string
  nota?: string
}) {
  return (
    <div className="flex flex-col gap-0.5 px-6 py-4">
      <span className="text-caption uppercase tracking-[0.14em] text-ink-4">{rotulo}</span>
      <span className="text-body text-ink">{valor}</span>
      {nota && <span className="text-caption text-ink-4">{nota}</span>}
    </div>
  )
}
