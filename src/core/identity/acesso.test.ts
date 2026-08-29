import assert from 'node:assert/strict'
import { test } from 'node:test'
import { avaliarAcesso, fraseDoAcesso } from './acesso.ts'

const TURMA = {
  status: 'active',
  startedAt: '2026-09-01T03:00:00Z',
  endsAt: '2027-09-01T03:00:00Z',
}

test('antes do início, a condição existe mas não vale', () => {
  const a = avaliarAcesso(TURMA, new Date('2026-08-28T12:00:00Z'))
  assert.equal(a.estado, 'aguardando')
  assert.match(fraseDoAcesso(a), /começa em 1 de setembro de 2026/)
})

test('no primeiro dia, o acesso abre', () => {
  const a = avaliarAcesso(TURMA, new Date('2026-09-01T03:00:01Z'))
  assert.equal(a.estado, 'ativo')
})

test('a turma fundadora tem exatamente um ano', () => {
  const a = avaliarAcesso(TURMA, new Date('2026-09-01T03:00:00Z'))
  assert.equal(a.diasRestantes, 365)
})

test('no instante do fim, acaba — não sobra um dia de bônus', () => {
  const a = avaliarAcesso(TURMA, new Date('2027-09-01T03:00:00Z'))
  assert.equal(a.estado, 'encerrado')
})

test('acesso encerrado nunca mostra dias negativos', () => {
  const a = avaliarAcesso(TURMA, new Date('2027-12-01T00:00:00Z'))
  assert.equal(a.diasRestantes, 0)
})

test('perto do fim, a frase vira contagem', () => {
  const a = avaliarAcesso(TURMA, new Date('2027-08-25T03:00:00Z'))
  assert.match(fraseDoAcesso(a), /faltam 7 dias/)
})

test('longe do fim, a frase é só a data — contagem de 300 dias é ruído', () => {
  const a = avaliarAcesso(TURMA, new Date('2026-10-01T03:00:00Z'))
  assert.match(fraseDoAcesso(a), /vai até 1 de setembro de 2027\.$/)
})

test('suspenso ganha de aguardando: quem foi desligado não espera setembro', () => {
  const a = avaliarAcesso({ ...TURMA, status: 'canceled' }, new Date('2026-08-28T12:00:00Z'))
  assert.equal(a.estado, 'suspenso')
})

test('sem prazo continua sendo estado legítimo', () => {
  const a = avaliarAcesso(
    { status: 'active', startedAt: '2026-01-01T00:00:00Z', endsAt: null },
    new Date('2030-01-01T00:00:00Z'),
  )
  assert.equal(a.estado, 'ativo')
  assert.equal(a.diasRestantes, null)
  assert.match(fraseDoAcesso(a), /sem data de término/)
})
