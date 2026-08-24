'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface LoginState {
  step: 'email' | 'code'
  email: string
  error: string | null
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Passo 1 — pedir o código.
 *
 * Sem senha, por decisão: nada para esquecer, nada para vazar, e no celular a
 * pessoa não precisa sair do app para colar um link. O e-mail traz o código de
 * 6 dígitos e também um link, para quem preferir clicar.
 */
export async function requestCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()

  if (!EMAIL.test(email)) {
    return { step: 'email', email, error: 'Esse e-mail não parece completo. Confere?' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // ACESSO POR CONVITE.
      //
      // `true` aqui significa: qualquer pessoa que digitar um e-mail nesta tela
      // ganha uma conta — e, como `handle_new_user` já cria uma assinatura
      // ativa, ganha junto o catálogo inteiro. Com a tela pública, isso é uma
      // porta aberta.
      //
      // Só entra quem já existe em `auth.users`. Cadastrar alunos é ato
      // deliberado do Admin, não efeito colateral de alguém curioso.
      shouldCreateUser: false,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    // Mensagem de erro diz o que houve e o que fazer — sem "algo deu errado".
    const tooMany = error.status === 429
    return {
      step: 'email',
      email,
      error: tooMany
        ? 'Muitas tentativas seguidas. Espere um minuto e peça de novo.'
        : 'Não encontrei uma conta com esse e-mail, ou não consegui enviar agora.',
    }
  }

  return { step: 'code', email, error: null }
}

/** Passo 2 — conferir o código. */
export async function verifyCode(prev: LoginState, formData: FormData): Promise<LoginState> {
  const token = String(formData.get('code') ?? '').replace(/\D/g, '')
  const email = String(formData.get('email') ?? prev.email)
  const destination = String(formData.get('destino') ?? '/')

  if (token.length !== 6) {
    return { step: 'code', email, error: 'O código tem 6 dígitos.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })

  if (error) {
    return {
      step: 'code',
      email,
      error: 'Código inválido ou expirado. Peça um novo e tente de novo.',
    }
  }

  // Só destinos internos. Um `?destino=` apontando para fora vira redirecionamento aberto.
  redirect(destination.startsWith('/') && !destination.startsWith('//') ? destination : '/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/entrar')
}
