export interface SesionServidor {
  uid: string
  email: string
  nombre: string
  avatarUrl: string
  rol: string
}

export interface RespuestaSesionFirebase {
  ok: boolean
  usuario: SesionServidor
}

export interface RespuestaSesionSegura {
  ok: boolean
  sesion: SesionServidor
}
