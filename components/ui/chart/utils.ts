import type { ChartConfig } from ".";
import type { Component } from "vue";
import { isClient } from "@vueuse/core";
import { useId } from "reka-ui";
import { h, render } from "vue";

type ValorGrafico =
  | string
  | number
  | boolean
  | Date
  | null
  | ValorGrafico[]
  | { [clave: string]: ValorGrafico };

interface DatosGraficoConData {
  data: Record<string, ValorGrafico>;
}

type DatosGrafico = Record<string, ValorGrafico> | DatosGraficoConData;
type PropiedadComponenteGrafico =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | ChartConfig
  | Record<string, ValorGrafico>
  | ((valor: number | Date) => string);
type PropiedadesComponenteGrafico = Record<string, PropiedadComponenteGrafico>;

const tieneData = (datos: DatosGrafico): datos is DatosGraficoConData => {
  return "data" in datos;
};

const cache = new Map<string, string>();

function serializeKey(key: Record<string, ValorGrafico>): string {
  return JSON.stringify(key, Object.keys(key).sort());
}

export function componentToString(
  config: ChartConfig,
  component: Component,
  props?: PropiedadesComponenteGrafico,
) {
  if (!isClient) return;

  const id = useId();

  return (datos: DatosGrafico, x: number | Date) => {
    const data = tieneData(datos) ? datos.data : datos;
    const serializedKey = `${id}-${serializeKey(data)}`;
    const cachedContent = cache.get(serializedKey);
    if (cachedContent) return cachedContent;

    const vnode = h(component, { ...props, payload: data, config, x });
    const div = document.createElement("div");
    render(vnode, div);
    cache.set(serializedKey, div.innerHTML);
    return div.innerHTML;
  };
}
