/**
 * O Mapa é tela cheia e escura. Um esqueleto de cartões aqui seria um
 * flash branco de conteúdo que nunca vai existir.
 *
 * Em vez disso: o próprio fundo do céu, com o brilho do núcleo pulsando no
 * centro. A pessoa já está no Mapa antes de o Mapa chegar.
 */
export default function CarregandoMapa() {
  return (
    <div className="relative h-[calc(100dvh-3.5rem)] w-full overflow-hidden bg-navy-deep md:h-dvh">
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 [animation:vigil_2400ms_ease-in-out_infinite] [background:radial-gradient(circle,rgba(76,65,255,0.22)_0%,rgba(76,65,255,0.06)_55%,transparent_75%)]"
      />
      <span className="sr-only">Carregando o mapa</span>
    </div>
  )
}
