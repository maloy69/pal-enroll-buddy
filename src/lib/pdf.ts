/** Unduh sebuah elemen HTML sebagai berkas PDF ukuran A4 potret. */
export async function unduhElemenPdf(element: HTMLElement, fileName: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
  const imgWidth = canvas.width * ratio;
  const imgHeight = canvas.height * ratio;
  const offsetX = (pageWidth - imgWidth) / 2;

  pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", offsetX, 0, imgWidth, imgHeight);
  pdf.save(fileName);
}
