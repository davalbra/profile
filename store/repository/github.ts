import axios from "axios";
import { defineStore } from "pinia";
import type { RespuestaRepositoriosFijados } from "@/types/github";

export const useGithubRepositorio = defineStore("githubRepositorio", () => {
  const obtenerRepositoriosFijados = async () => {
    return await axios.get<RespuestaRepositoriosFijados>("/api/github/pinned");
  };

  return {
    obtenerRepositoriosFijados,
  };
});
