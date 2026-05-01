export interface RepositorioFijado {
  name: string
  description: string
  htmlUrl: string
  homepage: string | null
  stars: number
  forks: number
  language: string
  updatedAt: string
}

export interface RespuestaRepositoriosFijados {
  repos: RepositorioFijado[]
}
