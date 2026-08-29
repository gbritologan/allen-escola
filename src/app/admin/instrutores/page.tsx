import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/primitives/button'
import { Chip } from '@/components/primitives/chip'
import { IconeApagar } from '@/components/icons'
import { Field, Input, Textarea } from '@/components/primitives/field'
import { Surface } from '@/components/surfaces/surface'
import { createClient } from '@/lib/supabase/server'
import { apagarInstrutor, enviarRetrato, salvarInstrutor } from './actions'
import { NovoInstrutor } from './novo-instrutor'

export const metadata: Metadata = { title: 'Instrutores' }

/**
 * INSTRUTORES.
 *
 * Uma tela só: criar em cima, editar embaixo, tudo aberto. São poucas pessoas —
 * esconder cada uma atrás de um clique para depois abrir um formulário idêntico
 * seria burocracia sem ganho.
 *
 * Cada instrutor mostra em quantos cursos está. É a informação que decide se dá
 * para apagar, e é a que responde "quem está carregando o catálogo".
 */
export default async function InstrutoresPage() {
  const supabase = await createClient()

  const [{ data: instructors }, { data: courses }] = await Promise.all([
    supabase.from('instructors').select('id, name, slug, headline, bio, photo_url').order('name'),
    supabase.from('courses').select('id, title, slug, status, instructor_id'),
  ])

  const lista = instructors ?? []
  const porInstrutor = new Map<string, Array<{ id: string; title: string; status: string }>>()
  for (const c of courses ?? []) {
    if (!c.instructor_id) continue
    const atual = porInstrutor.get(c.instructor_id) ?? []
    atual.push({ id: c.id, title: c.title, status: c.status })
    porInstrutor.set(c.instructor_id, atual)
  }

  const semInstrutor = (courses ?? []).filter((c) => !c.instructor_id)

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-10 lg:px-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-display font-light">Instrutores</h1>
        <p className="max-w-[60ch] text-body text-ink-3">
          Quem ensina é parte da promessa da Allen — a credencial precisa provar prática, não
          diploma.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-title font-light">Novo instrutor</h2>
        <Surface className="p-5">
          <NovoInstrutor />
        </Surface>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-title font-light">
            {lista.length === 0
              ? 'Ninguém cadastrado'
              : `${lista.length} ${lista.length === 1 ? 'instrutor' : 'instrutores'}`}
          </h2>
          {semInstrutor.length > 0 && (
            <span className="text-caption text-caution">
              {semInstrutor.length} curso(s) sem instrutor
            </span>
          )}
        </div>

        {lista.length === 0 ? (
          <Surface className="p-5">
            <p className="text-body text-ink-3">
              Enquanto não houver ninguém aqui, o seletor de instrutor dentro de cada curso continua
              vazio.
            </p>
          </Surface>
        ) : (
          <div className="flex flex-col gap-4">
            {lista.map((pessoa) => {
              const cursos = porInstrutor.get(pessoa.id) ?? []
              const incompleto = !pessoa.bio?.trim()

              return (
                <Surface key={pessoa.id} className="flex flex-col gap-5 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {pessoa.photo_url ? (
                        /* Virou next/image porque o retrato agora mora no
                           nosso Storage — domínio conhecido. Com link colado
                           isso era impossível, daí o eslint-disable de antes. */
                        <Image
                          src={pessoa.photo_url}
                          alt=""
                          width={44}
                          height={44}
                          className="size-11 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span
                          aria-hidden
                          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line text-label text-ink-4"
                        >
                          {pessoa.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="flex flex-col gap-1">
                        <span className="text-lead font-light text-ink">{pessoa.name}</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Chip tone={cursos.length > 0 ? 'accent' : 'neutral'}>
                            {cursos.length === 0
                              ? 'nenhum curso'
                              : `${cursos.length} ${cursos.length === 1 ? 'curso' : 'cursos'}`}
                          </Chip>
                          {incompleto && <Chip tone="caution">sem bio</Chip>}
                        </div>
                      </div>
                    </div>

                    {/* Apagar só existe quando ninguém depende. A ação recusa
                        de novo no servidor — o botão escondido é conveniência,
                        não a regra. */}
                    {cursos.length === 0 && (
                      <form action={apagarInstrutor}>
                        <input type="hidden" name="id" value={pessoa.id} />
                        <button
                          type="submit"
                          className="flex items-center gap-1.5 text-caption text-ink-4 transition-colors hover:text-critical"
                        >
                          <IconeApagar className="size-3.5" />
                          Apagar
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Envio do retrato: form próprio, porque tem ação
                      própria. Aninhar <form> dentro de <form> é inválido em
                      HTML e o navegador desfaz do jeito dele. */}
                  <form action={enviarRetrato} className="flex flex-wrap items-center gap-3 pb-4">
                    <input type="hidden" name="id" value={pessoa.id} />
                    <input type="hidden" name="slug" value={pessoa.slug} />
                    <input
                      type="file"
                      name="arquivo"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      required
                      className="max-w-[15rem] text-caption text-ink-3 file:mr-3 file:rounded-[var(--radius-control)] file:border file:border-line file:bg-transparent file:px-3 file:py-1.5 file:text-caption file:text-ink-2"
                    />
                    <button
                      type="submit"
                      className="rounded-[var(--radius-control)] border border-line px-3 py-1.5 text-caption text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
                    >
                      {pessoa.photo_url ? 'Trocar foto' : 'Enviar foto'}
                    </button>
                  </form>

                  <form action={salvarInstrutor} className="flex flex-col gap-4">
                    <input type="hidden" name="id" value={pessoa.id} />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Nome" htmlFor={`name-${pessoa.id}`}>
                        <Input
                          id={`name-${pessoa.id}`}
                          name="name"
                          defaultValue={pessoa.name}
                          required
                        />
                      </Field>

                      {/* O campo de URL saiu: link colado mora no servidor de
                          outra pessoa e um dia cai. O envio vive fora deste
                          form, porque tem ação própria. */}
                      <input type="hidden" name="photo_url" value={pessoa.photo_url ?? ''} />
                    </div>

                    <Field
                      label="Credencial"
                      htmlFor={`headline-${pessoa.id}`}
                      hint="Uma linha. Aparece embaixo do nome, na página do curso."
                    >
                      <Input
                        id={`headline-${pessoa.id}`}
                        name="headline"
                        defaultValue={pessoa.headline ?? ''}
                      />
                    </Field>

                    <Field
                      label="Bio"
                      htmlFor={`bio-${pessoa.id}`}
                      hint="O que essa pessoa faz hoje, com quem, e há quanto tempo. Sem isso a página do curso fica sem rosto."
                    >
                      <Textarea id={`bio-${pessoa.id}`} name="bio" defaultValue={pessoa.bio ?? ''} />
                    </Field>

                    <Button type="submit" variant="secondary" size="sm" className="self-start">
                      Salvar
                    </Button>
                  </form>

                  {cursos.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
                      <span className="text-caption text-ink-4">Dá aula em</span>
                      {cursos.map((c) => (
                        <Link
                          key={c.id}
                          href={`/admin/cursos/${c.id}`}
                          className="rounded-full border border-line px-3 py-1 text-caption text-ink-3 transition-colors hover:border-line-strong hover:text-ink"
                        >
                          {c.title}
                          {c.status !== 'published' && <span className="text-ink-4"> · rascunho</span>}
                        </Link>
                      ))}
                    </div>
                  )}
                </Surface>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
