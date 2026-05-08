// Client-side parsing for txt/md/json/csv, .docx (mammoth), .pdf (pdfjs).
export async function parseFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    const pdfjs: any = await import("pdfjs-dist");
    // @ts-ignore
    const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    let out = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const p = await doc.getPage(i);
      const t = await p.getTextContent();
      out += t.items.map((it: any) => it.str).join(" ") + "\n\n";
    }
    return out.trim();
  }
  if (name.endsWith(".docx")) {
    const mammoth: any = await import("mammoth/mammoth.browser");
    const buf = await file.arrayBuffer();
    const r = await mammoth.extractRawText({ arrayBuffer: buf });
    return (r.value || "").trim();
  }
  // text-like
  return await file.text();
}
