import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '@/components/primitives/button'
import { Chip } from '@/components/primitives/chip'
import { IconeApagar } from '@/components/icons'
import { Field, Input } from '@/components/primitives/field'
import { Surface } from '@/components/surfaces/surface'
import { createClient } from '@/lib/supabase/server'
import { apagarAula, atualizarAula, publicarAula } from './actions'
import { CampoLongo } from './campo-longo'
import { EnviarVideo } from './enviar-video'
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

  const [{ data: mod }, { data: materiais }] = await Promise.all([
    supabase.from('modules').select('title').eq('id', lesson.module_id).maybeSingle(),
    supabase
      .from('materials')
      .select('id, title, url, kind')
      .eq('lesson_id', lessonId)
      .order('position'),
  ])

  const published = lesson.status === 'published'
  const temVideo = Boolean(lesson.video_asset_id)
  const temParaFazer = Boolean(lesson.para_fazer?.trim())

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10 lg:px-10">
      <header className="flex flex-col gap-4">
        <Link href={`/admin/cursos/${courseId}`} className="text-caption text-ink-3 hover:text-ink">
          ← {course?.title ?? 'Curso'}
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-caption text-ink-4">{mod?.title}</span>
            <h1 className="text-title font-light">{lesson.title}</h1>
            <div className="flex flex-wrap gap-1.5">
              <Chip tone={published ? 'positive' : 'neutral'}>
                {published ? 'No ar' : 'Rascunho'}
              </Chip>
              {!temVideo && <Chip tone="caution">sem vídeo</Chip>}
              {!temParaFazer && <Chip>sem Para Fazer</Chip>}
            </div>
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
            Sem vídeo, publicar deixaria o aluno numa tela preta. O botão volta quando o vídeo
            estiver pronto.
          </p>
        )}
      </header>

      {/* ------------------------------------------------------------------ */}
      <Surface className="flex flex-col gap-4 p-5">
        <form action={atualizarAula} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={lesson.id} />
          <input type="hidden" name="course_id" value={courseId} />

          <Field label="Título da aula" htmlFor="title">
            <Input id="title" name="title" defaultValue={lesson.title} required />
          </Field>

          <Field
            label="Duração"
            htmlFor="duration_minutes"
            hint="Preenchida sozinha quando o vídeo termina de processar. Edite só se precisar corrigir."
          >
            <Input
              id="duration_minutes"
              name="duration_minutes"
              type="number"
              min={0}
              step={1}
              defaultValue={lesson.duration_seconds ? Math.round(lesson.duration_seconds / 60) : ''}
              className="max-w-32"
            />
          </Field>

          <Button type="submit" variant="secondary" className="self-start">
            Salvar
          </Button>
        </form>
      </Surface>

      {/* --- Vídeo --------------------------------------------------------- */}
      <Surface className="flex flex-col gap-4 p-5">
        <span className="text-label font-medium text-ink-2">Vídeo</span>
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
      </Surface>

      {/* --- O par que define a Allen -------------------------------------- */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-title font-light">A aula</h2>
          <p className="text-caption text-ink-4">
            Estes dois campos salvam sozinhos ao sair do campo.
          </p>
        </div>

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
          hint="A ação concreta que o aluno executa na própria rotina. Sem isto, a aula é videoaula."
          defaultValue={lesson.para_fazer ?? ''}
          accent
        />
      </section>

      {/* --- Materiais ----------------------------------------------------- */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-title font-light">Materiais</h2>
          <p className="text-caption text-ink-4">
            O que o aluno leva da aula. Aparece embaixo do Para Fazer.
          </p>
        </div>
        <Surface className="p-5">
          <Materiais lessonId={lesson.id} courseId={courseId} materiais={materiais ?? []} />
        </Surface>
      </section>

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
