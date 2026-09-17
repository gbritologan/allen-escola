import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BotaoSalvar } from '@/components/primitives/botao-salvar'
import { Button } from '@/components/primitives/button'
import { Chip } from '@/components/primitives/chip'
import { IconeApagar } from '@/components/icons'
import { Field, Input } from '@/components/primitives/field'
import { formatDuration } from '@/core/shared/format'
import { Surface } from '@/components/surfaces/surface'
import { createClient } from '@/lib/supabase/server'
import { apagarAula, atualizarAula, publicarAula } from './actions'
import { CampoLongo } from './campo-longo'
import { EnviarVideo } from './enviar-video'
import { Habilidades } from './habilidades'
import { Materiais } from './materiais'
import { videoConfigurado } from '@/lib/video'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lessonId: string }>
}): Promise<Metadata> {
  const { lessonId } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('lessons').select('title').eq('id', lessonId).maybeSingle()
  return { title: data?.title ?? 'Aula' }
}

export default async function EditorDeAulaPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>
}) {
  const { id: courseId, lessonId } = await params
  const supabase = await createClient()

  // Sem os tipos gerados do banco, o supabase-js infere todo embed como array.
  // Duas consultas pequenas e corretamente tipadas custam menos que um cast.
  const [{ data: lesson }, { data: course }] = await Promise.all([
    supabase
      .from('lessons')
      .select(
        'id, title, description, position, status, duration_seconds, video_asset_id, para_saber, para_fazer, module_id',
      )
      .eq('id', lessonId)
      .maybeSingle(),
    supabase.from('courses').select('title').eq('id', courseId).maybeSingle(),
  ])

  if (!lesson) notFound()

  const [{ data: mod }, { data: materiais }, { data: skills }, { data: mapeamento }] =
    await Promise.all([
      supabase.from('modules').select('title').eq('id', lesson.module_id).maybeSingle(),
      supabase
        .from('materials')
        .select('id, title, url, kind')
        .eq('lesson_id', lessonId)
        .order('position'),
      supabase.from('skills').select('id, name, description').order('name'),
      supabase.from('lesson_skills').select('skill_id, weight').eq('lesson_id', lessonId),
    ])

  const habilidadesMapeadas = new Map(
    (mapeamento ?? []).map((m) => [m.skill_id, Number(m.weight)]),
  )

  const published = lesson.status === 'published'
  const temVideo = Boolean(lesson.video_asset_id)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10 lg:px-10">
      {/*
        ─── POR QUE ESTA PÁGINA FOI REDESENHADA ─────────────────────────────

        O Gabriel disse que subir aula estava "confuso, difícil, não
        intuitivo, não didático". Estava, e o defeito era de hierarquia: a
        tela mostrava oito campos com o mesmo peso visual, três selos de
        aviso ("sem vídeo", "sem Para Fazer", "sem habilidade") e um campo de
        duração vazio pedindo para ser preenchido.

        Nada dizia o que era obrigatório. Então TUDO parecia obrigatório — e
        uma tela em que tudo parece obrigatório é uma tela em que não se sabe
        por onde começar.

        Agora são duas zonas, e a diferença entre elas é a única coisa que a
        pessoa precisa entender:

          O ESSENCIAL — título e vídeo. É o que faz a aula existir.
          OPCIONAL    — o resto, fechado por padrão, aberto quando der vontade.

        Os selos de aviso saíram. Sobrou um aviso, e só quando ele é
        verdadeiro: falta o vídeo para publicar.
      */}
      <header className="flex flex-col gap-4">
        <Link href={`/admin/cursos/${courseId}`} className="text-caption text-ink-3 hover:text-ink">
          ← {course?.title ?? 'Curso'}
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-caption text-ink-4">{mod?.title}</span>
            <h1 className="text-title font-light">{lesson.title}</h1>
            <Chip tone={published ? 'positive' : 'neutral'}>
              {published ? 'No ar' : 'Rascunho'}
            </Chip>
          </div>

          <form action={publicarAula}>
            <input type="hidden" name="id" value={lesson.id} />
            <input type="hidden" name="course_id" value={courseId} />
            <input type="hidden" name="status" value={lesson.status} />
            <Button type="submit" variant={published ? 'secondary' : 'primary'} disabled={!temVideo}>
              {published ? 'Tirar do ar' : 'Publicar aula'}
            </Button>
          </form>
        </div>

        {!temVideo && (
          <p className="text-caption text-caution">
            Falta o vídeo. Assim que ele terminar de processar, o botão de publicar libera.
          </p>
        )}
      </header>

      {/* ═══ O ESSENCIAL ═══════════════════════════════════════════════════ */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-title font-light">O essencial</h2>
          <p className="text-caption text-ink-4">
            Um título e um vídeo. Com esses dois, a aula pode ir ao ar.
          </p>
        </div>

        <Surface className="flex flex-col gap-5 p-5">
          <form action={atualizarAula} className="flex items-end gap-3">
            <input type="hidden" name="id" value={lesson.id} />
            <input type="hidden" name="course_id" value={courseId} />
            {/* A duração viaja escondida: o formulário de título não pode
                zerá-la sem querer, já que ela vem do Bunny e não daqui. */}
            <input
              type="hidden"
              name="duration_minutes"
              value={lesson.duration_seconds ? Math.round(lesson.duration_seconds / 60) : 0}
            />
            <div className="flex-1">
              <Field label="Título da aula" htmlFor="title">
                <Input id="title" name="title" defaultValue={lesson.title} required />
              </Field>
            </div>
            <BotaoSalvar />
          </form>

          <div className="flex flex-col gap-2 border-t border-line pt-5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-label font-medium text-ink-2">Vídeo</span>
              {/* A duração é INFORMAÇÃO, não campo. Ela vem do Bunny quando o
                  processamento acaba — pedir para alguém cronometrar a
                  própria aula era trabalho que a máquina já fazia. */}
              {lesson.duration_seconds > 0 && (
                <span data-numeric className="text-caption text-ink-4">
                  {formatDuration(lesson.duration_seconds)} · medido pelo vídeo
                </span>
              )}
            </div>
            {videoConfigurado() ? (
              <EnviarVideo
                lessonId={lesson.id}
                courseId={courseId}
                tituloAula={lesson.title}
                assetIdAtual={lesson.video_asset_id}
                duracaoAtual={lesson.duration_seconds}
              />
            ) : (
              <p className="text-caption text-caution">
                O provedor de vídeo não está configurado neste ambiente. Faltam as variáveis
                BUNNY_STREAM_* — em produção elas precisam ser adicionadas na Vercel.
              </p>
            )}
          </div>
        </Surface>
      </section>

      {/* ═══ OPCIONAL ══════════════════════════════════════════════════════
          Fechado por padrão. Quem está subindo doze aulas numa tarde não
          quer rolar por cinco blocos que não vai preencher hoje — e quem
          quer enriquecer uma aula acha tudo num clique. */}
      <details className="group rounded-[var(--radius-card)] border border-line">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
          <span className="flex flex-col gap-0.5">
            <span className="text-lead font-light text-ink">Enriquecer a aula</span>
            <span className="text-caption text-ink-4">
              Tudo daqui para baixo é opcional — dá para voltar depois, com a aula já no ar.
            </span>
          </span>
          <span
            aria-hidden
            className="shrink-0 text-caption text-ink-4 transition-transform duration-150 group-open:rotate-90"
          >
            ▸
          </span>
        </summary>

        <div className="flex flex-col gap-8 border-t border-line px-5 py-6">
          <div className="flex flex-col gap-4">
            <CampoLongo
              lessonId={lesson.id}
              field="description"
              label="Descrição"
              hint="Uma ou duas linhas sobre o que a aula resolve."
              defaultValue={lesson.description ?? ''}
              rows={3}
            />

            <CampoLongo
              lessonId={lesson.id}
              field="para_saber"
              label="Para saber"
              hint="O conhecimento essencial. O que a pessoa precisa entender antes de agir."
              defaultValue={lesson.para_saber ?? ''}
            />

            <CampoLongo
              lessonId={lesson.id}
              field="para_fazer"
              label="Para fazer"
              hint="A ação concreta que o aluno executa na própria rotina. É o que separa a Allen de uma videoteca — mas não trava nada: a aula publica sem ele."
              defaultValue={lesson.para_fazer ?? ''}
              accent
            />

            <p className="text-caption text-ink-4">
              Estes três salvam sozinhos ao sair do campo.
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t border-line pt-6">
            <div className="flex flex-col gap-1">
              <span className="text-label font-medium text-ink-2">Habilidades</span>
              <p className="text-caption text-ink-4">
                O que esta aula desenvolve. Alimenta o histórico do aluno e o Mapa.{' '}
                <Link href="/admin/habilidades" className="text-blue-light hover:underline">
                  Criar ou renomear →
                </Link>
              </p>
            </div>
            <Habilidades
              lessonId={lesson.id}
              courseId={courseId}
              skills={skills ?? []}
              mapeadas={habilidadesMapeadas}
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-line pt-6">
            <div className="flex flex-col gap-1">
              <span className="text-label font-medium text-ink-2">Materiais</span>
              <p className="text-caption text-ink-4">
                Arquivos que o aluno baixa. Aparecem embaixo do Para Fazer.
              </p>
            </div>
            <Materiais lessonId={lesson.id} courseId={courseId} materiais={materiais ?? []} />
          </div>

          <div className="flex flex-col gap-3 border-t border-line pt-6">
            <Field
              label="Corrigir a duração"
              htmlFor="duration_minutes_manual"
              hint="Normalmente não precisa: ela vem do vídeo sozinha. Use só se o número estiver errado, ou numa aula sem vídeo."
            >
              <form action={atualizarAula} className="flex items-center gap-3">
                <input type="hidden" name="id" value={lesson.id} />
                <input type="hidden" name="course_id" value={courseId} />
                <input type="hidden" name="title" value={lesson.title} />
                <Input
                  id="duration_minutes_manual"
                  name="duration_minutes"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={
                    lesson.duration_seconds ? Math.round(lesson.duration_seconds / 60) : ''
                  }
                  className="max-w-28"
                />
                <span className="text-caption text-ink-4">minutos</span>
                <BotaoSalvar />
              </form>
            </Field>
          </div>
        </div>
      </details>

      <form action={apagarAula} className="border-t border-line pt-6">
        <input type="hidden" name="id" value={lesson.id} />
        <input type="hidden" name="course_id" value={courseId} />
        <button
          type="submit"
          className="flex items-center gap-2 text-caption text-ink-4 transition-colors hover:text-critical"
        >
          <IconeApagar className="size-4" />
          Apagar esta aula
        </button>
      </form>
    </div>
  )
}
