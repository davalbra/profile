import Swal from "sweetalert2";

export function abrirAlertaProceso(titulo: string): void {
  void Swal.fire({
    title: titulo,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
}

export function cerrarAlertaProceso(): void {
  Swal.close();
}
