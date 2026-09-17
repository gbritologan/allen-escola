import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BotaoSalvar } from '@/components/primitives/botao-salvar'
import { Button } from '@/components/primitives/button'
import { Chip } from '@/components/primitives/chip'
import { IconeApagar, IconeMover } from '@/components/icons'
import { Field, Input, Textarea } from '@/components/primitives/field'
import { Surface } from '@/components/surfaces/surface'
import { formatDuration, formatPosition } from '@/core/shared/format'
import { createClient } from '@/lib/supabase/server'
import {
  alternarTema,
  apagarModulo,
  atualizarCurso,
  criarAula,
  criarModulo,
  enviarBannerCurso,
  moverAula,
  publicarCurso,
  removerBannerCurso,
} from './actions'
import { AulaExpansivel } from './aula-expansivel'
import { CampoImagem } from '@/components/domain/campo-imagem'
import { textoDosPontos } from '@/core/catalog/aprendizado'
import { Capa } from './capa'
import { SoltarAulas } from './soltar-aulas'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('courses').select('title').eq('id', id).maybeSingle()
  return { title: data?.title ?? 'Curso' }
}

const iconButton =
  'flex size-6 items-center justify-center rounded border border-line text-caption text-ink-3 ' +
  'transition-colors duration-150 hover:border-line-strong hover:text-ink ' +
  'disabled:pointer-events-none disabled:opacity-25'

export default async function CursoStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: course }, { data: themes }, { data: modules }] =
    await Promise.all([
      supabase
        .from('courses')
        .select(
          'id, title, slug, summary, description, format, status, instructor_id, lesson_count, duration_seconds, cover_url, banner_url, learning_points, available_at, release_after_days',
        )
        .eq('id', id)
        .maybeSingle(),
      supabase.from('themes').select('id, name, status').order('position'),
      supabase.from('modules').select('id, title, position, status').eq('course_id', id).order('position'),
    ])

  if (!course) notFound()

  const { data: links } = await supabase
    .from('course_themes')
    .select('theme_id')
    .eq('course_id', id)
  const linkedThemes = new Set((links ?? []).map((l) => l.theme_id))
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, position, status, duration_seconds, video_asset_id, para_fazer, module_id')
    .eq('course_id', id)
    .order('position')

  /*
   * Os materiais de TODAS as aulas, numa consulta só.
   *
   * A gaveta de cada aula mostra os arquivos dela. Buscar por aula seria uma
   * ida ao banco por linha da lista — vinte aulas, vinte consultas.
   */
  const { data: materiais } = await supabase
    .from('materials')
    .select('id, title, url, kind, lesson_id, position')
    .in('lesson_id', (lessons ?? []).map((l) => l.id).length ? (lessons ?? []).map((l) => l.id) : ['-'])
    .order('position')

  const materiaisPorAula = new Map<string, typeof materiais>()
  for (const m of materiais ?? []) {
    materiaisPorAula.set(m.lesson_id, [...(materiaisPorAula.get(m.lesson_id) ?? []), m])
  }

  const moduleList = (modules ?? []).map((m) => ({
    ...m,
    lessons: (lessons ?? []).filter((l) => l.module_id === m.id),
  }))
  const allLessons = moduleList.flatMap((m) => m.lessons)

  // A checagem antes de publicar. O Studio não impede — ele avisa.
  const pendencias = [
    linkedThemes.size === 0 && 'Sem tema: o curso não vai aparecer em Explorar.',
    !course.summary && 'Sem resumo: o card do curso fica vazio.',
    allLessons.length === 0 && 'Sem aulas.',
    allLessons.some((l) => !l.video_asset_id) &&
      `${allLessons.filter((l) => !l.video_asset_id).length} aula(s) sem vídeo — essas não vão ao ar.`,
    allLessons.some((l) => !l.para_fazer?.trim()) &&
      `${allLessons.filter((l) => !l.para_fazer?.trim()).length} aula(s) sem Para Fazer.`,
  ].filter(Boolean) as string[]

  const published = course.status === 'published'

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-10 lg:px-10">
      <header className="flex flex-col gap-4">
        <Link href="/admin/cursos" className="text-caption text-ink-3 hover:text-ink">
          ← Cursos
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-display font-light">{course.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone={published ? 'positive' : 'neutral'}>
                {published ? 'Publicado' : 'Rascunho'}
              </Chip>
              {course.format === 'masterclass' && <Chip tone="accent">Capacitação</Chip>}
              <span data-numeric className="text-caption text-ink-4">
                {course.lesson_count} {course.lesson_count === 1 ? 'aula' : 'aulas'} ·{' '}
                {formatDuration(course.duration_seconds)}
              </span>
            </div>
          </div>

          <form action={publicarCurso}>
            <input type="hidden" name="id" value={course.id} />
            <input type="hidden" name="status" value={course.status} />
            <Button type="submit" variant={published ? 'secondary' : 'primary'}>
              {published ? 'Voltar para rascunho' : 'Publicar curso'}
            </Button>
          </form>
        </div>

        {!published && pendencias.length > 0 && (
          <Surface className="flex flex-col gap-2 p-4">
            <span className="text-label font-medium text-caution">Antes de publicar</span>
            <ul className="flex flex-col gap-1">
              {pendencias.map((p) => (
                <li key={p} className="text-caption text-ink-3">
                  · {p}
                </li>
              ))}
            </ul>
            <span className="text-caption text-ink-4">
              Publicar mesmo assim é permitido — só as aulas com vídeo vão ao ar.
            </span>
          </Surface>
        )}
      </header>

      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-col gap-4">
        <h2 className="text-title font-light">Informações gerais</h2>
        <Surface className="p-5">
          <form action={atualizarCurso} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={course.id} />

            <Field label="Título" htmlFor="title">
              <Input id="title" name="title" defaultValue={course.title} required />
            </Field>

            <Field label="Endereço" htmlFor="slug" hint={`O aluno verá /curso/${course.slug}`}>
              <Input id="slug" name="slug" defaultValue={course.slug} />
            </Field>

            <Field label="Resumo" htmlFor="summary" hint="Uma linha. É o que aparece no card.">
              <Input
                id="summary"
                name="summary"
                defaultValue={course.summary ?? ''}
                placeholder="Conduzir uma negociação sem depender de sorte."
              />
            </Field>

            <Field label="Descrição" htmlFor="description" hint="Texto da página do curso.">
              <Textarea id="description" name="description" defaultValue={course.description ?? ''} />
            </Field>

            {/* O teaser. Uma promessa por linha — quem escreve lista escreve
                em linhas, e o marcador quem desenha é a interface. Em branco,
                a seção não aparece para o aluno: curso publicado não espera
                copy. */}
            <Field
              label="O que a pessoa vai aprender"
              htmlFor="learning_points"
              hint="Uma promessa por linha, até 12. Aparece no topo da página do curso, antes das aulas. Em branco, a seção simplesmente não existe."
            >
              <Textarea
                id="learning_points"
                name="learning_points"
                rows={6}
                defaultValue={textoDosPontos(course.learning_points)}
                placeholder={'Estruturar uma fala que prende do primeiro minuto\nLer a plateia enquanto fala\nPerder o medo de improvisar'}
              />
            </Field>

            {/* "Em breve" é uma data e não um botão: assim o curso abre sozinho
                no dia, sem depender de alguém lembrar de voltar aqui. */}
            <Field
              label="Liberar só depois de (dias)"
              htmlFor="release_after_days"
              hint="Contado a partir da entrada de CADA aluno, não de uma data fixa. Ex.: 8 — quem assina hoje só abre este curso daqui a oito dias. Em branco: abre junto com o acesso."
            >
              <Input
                id="release_after_days"
                name="release_after_days"
                type="number"
                min={0}
                defaultValue={course.release_after_days ?? ''}
                placeholder="8"
              />
            </Field>

            <Field
              label="Disponível a partir de"
              htmlFor="available_at"
              hint="Em branco: disponível assim que publicado. Data no futuro: aparece como 'Em breve' e abre sozinho no dia."
            >
              <Input
                id="available_at"
                name="available_at"
                type="date"
                defaultValue={course.available_at ? String(course.available_at).slice(0, 10) : ''}
              />
            </Field>

            {/*
              O SELETOR DE INSTRUTOR SAIU DAQUI (D-70).
              
              O Gabriel disse que escolher instrutor não faz sentido agora, e
              está certo pelo estado do produto: quem grava é ele, e o campo
              pedia uma decisão a cada curso para sempre dar a mesma resposta.
              
              O VÍNCULO CONTINUA no banco e a página do curso continua mostrando
              o instrutor quando existe — o que saiu foi a PERGUNTA, não o dado.
              Quando houver convidados, ele volta. O `instructor_id` viaja
              escondido para o salvar não apagar o que já estava lá.
            */}
            <input type="hidden" name="instructor_id" value={course.instructor_id ?? ''} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Formato" htmlFor="format">
                <select
                  id="format"
                  name="format"
                  defaultValue={course.format}
                  className="h-10 w-full rounded-[var(--radius-control)] border border-line bg-navy-deep px-3 text-body text-ink outline-none focus:border-[rgba(76,65,255,0.7)]"
                >
                  <option value="course">Curso</option>
                  <option value="masterclass">Capacitação</option>
                </select>
              </Field>
            </div>

            <div className="self-start">
              <BotaoSalvar />
            </div>
          </form>
        </Surface>
      </section>

      {/* ---------------------------------------------------------------- */}
      <Capa id={course.id} slug={course.slug} coverUrl={course.cover_url ?? null} />

      {/* O banner é OUTRA peça, não outro tamanho da mesma: a capa vende o
          curso de fora, no catálogo; o banner recebe quem já entrou. */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-title font-light">Banner da página</h2>
          <p className="text-caption text-ink-4">
            5:1 deitado — 2000×400. A página do curso é mais estreita que a Home, e a largura
            já é o dobro da moldura: em tela de densidade 2×, arte menor entra esticada.
            Aparece acima do título. Opcional: sem ele, a página abre pelo título.
          </p>
        </div>

        <CampoImagem
          atual={course.banner_url ?? null}
          pasta="capas"
          nomeBase={`${course.slug}-banner`}
          acaoSalvar={enviarBannerCurso}
          acaoRemover={removerBannerCurso}
          ocultos={{ id: course.id }}
          moldura="aspect-[5/1] w-full max-w-2xl"
          rotuloVazio="2000 × 400"
          tamanhos="42rem"
        />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-title font-light">Temas</h2>
          <p className="text-caption text-ink-4">
            Um curso pode estar em vários. É por aqui que o aluno chega nele.
          </p>
          {linkedThemes.size === 0 && (
            <p className="text-caption text-[var(--color-caution)]">
              Sem tema, este curso não aparece no Mapa — não há constelação onde pendurá-lo.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {(themes ?? []).map((theme) => {
            const linked = linkedThemes.has(theme.id)
            return (
              <form key={theme.id} action={alternarTema}>
                <input type="hidden" name="course_id" value={course.id} />
                <input type="hidden" name="theme_id" value={theme.id} />
                <input type="hidden" name="linked" value={String(linked)} />
                <button
                  type="submit"
                  className={`rounded-full border px-3 py-1.5 text-caption transition-colors duration-150 ${
                    linked
                      ? 'border-[rgba(76,65,255,0.5)] bg-[rgba(76,65,255,0.12)] text-blue-light'
                      : 'border-line text-ink-3 hover:border-line-strong hover:text-ink'
                  }`}
                >
                  {linked ? '✓ ' : '+ '}
                  {theme.name}
                  {theme.status !== 'published' && (
                    <span className="text-ink-4"> · rascunho</span>
                  )}
                </button>
              </form>
            )
          })}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-col gap-4">
        <h2 className="text-title font-light">Currículo</h2>

        <div className="flex flex-col gap-4">
          {moduleList.map((mod) => (
            <Surface key={mod.id} className="flex flex-col">
              <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                <span data-numeric className="text-caption text-ink-4">
                  {formatPosition(mod.position)}
                </span>
                <span className="flex-1 text-body font-medium text-ink">{mod.title}</span>
                {mod.lessons.length === 0 && (
                  <form action={apagarModulo}>
                    <input type="hidden" name="id" value={mod.id} />
                    <input type="hidden" name="course_id" value={course.id} />
                    <button
                      type="submit"
                      aria-label={`Apagar módulo ${mod.title}`}
                      className="flex items-center gap-1.5 text-caption text-ink-4 transition-colors hover:text-critical"
                    >
                      <IconeApagar className="size-3.5" />
                      Apagar
                    </button>
                  </form>
                )}
              </div>

              <div className="flex flex-col divide-y divide-[var(--color-line)]">
                {mod.lessons.map((lesson, index) => (
                  <AulaExpansivel
                    key={lesson.id}
                    courseId={course.id}
                    indice={index}
                    total={mod.lessons.length}
                    aula={{
                      id: lesson.id,
                      title: lesson.title,
                      durationSeconds: lesson.duration_seconds,
                      videoAssetId: lesson.video_asset_id,
                      temParaFazer: Boolean(lesson.para_fazer?.trim()),
                      publicada: lesson.status === 'published',
                      materiais: (materiaisPorAula.get(lesson.id) ?? []).map((m) => ({
                        id: m.id,
                        title: m.title,
                        url: m.url,
                        kind: m.kind,
                      })),
                    }}
                    moverPara={(direcao) => (
                      <form action={moverAula}>
                        <input type="hidden" name="id" value={lesson.id} />
                        <input type="hidden" name="module_id" value={mod.id} />
                        <input type="hidden" name="course_id" value={course.id} />
                        <input type="hidden" name="direction" value={direcao} />
                        <button
                          type="submit"
                          className={iconButton}
                          disabled={
                            direcao === 'up' ? index === 0 : index === mod.lessons.length - 1
                          }
                          aria-label={`Mover ${lesson.title} para ${direcao === 'up' ? 'cima' : 'baixo'}`}
                        >
                          <IconeMover
                            direcao={direcao === 'up' ? 'cima' : 'baixo'}
                            className="size-3"
                          />
                        </button>
                      </form>
                    )}
                  />
                ))}

                {/* Vários de uma vez primeiro: é o gesto do trabalho real —
                    quem sobe um curso tem uma pasta, não um arquivo. */}
                <SoltarAulas courseId={course.id} moduleId={mod.id} />

                <form action={criarAula} className="flex items-center gap-2 border-t border-line px-4 py-3">
                  <input type="hidden" name="course_id" value={course.id} />
                  <input type="hidden" name="module_id" value={mod.id} />
                  <Input name="title" placeholder="Título da nova aula" className="h-9" required />
                  <Button type="submit" size="sm" variant="secondary">
                    Criar aula
                  </Button>
                </form>
              </div>
            </Surface>
          ))}
        </div>

        <Surface className="p-4">
          <form action={criarModulo} className="flex items-center gap-2">
            <input type="hidden" name="course_id" value={course.id} />
            <Input name="title" placeholder="Título do novo módulo" className="h-9" required />
            <Button type="submit" size="sm" variant="secondary">
              Adicionar módulo
            </Button>
          </form>
        </Surface>
      </section>
    </div>
  )
}
