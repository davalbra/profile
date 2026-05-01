import axios from "axios"
import { defineStore } from "pinia"
import type {
  RespuestaSesionFirebase,
  RespuestaSesionSegura,
} from "@/types/auth"

export const useAuthRepositorio = defineStore("authRepositorio", () => {
  const crearSesionFirebase = async (idToken: string) => {
    return await axios.post<RespuestaSesionFirebase>(
      "/api/auth/firebase-session",
      { idToken },
    )
  }

  const eliminarSesionFirebase = async (idToken: string) => {
    return await axios.delete("/api/auth/firebase-session", {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    })
  }

  const obtenerSesionSegura = async () => {
    return await axios.get<RespuestaSesionSegura>("/api/secure/session")
  }

  return {
    crearSesionFirebase,
    eliminarSesionFirebase,
    obtenerSesionSegura,
  }
})
