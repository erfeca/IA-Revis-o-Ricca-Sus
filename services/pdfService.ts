
declare const pdfjsLib: any;

export const extractTextFromPdf = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    
    // Inserimos um marcador de página para que a IA possa rastrear a localização do texto
    fullText += `\n[[PÁGINA ${i}]]\n${pageText}\n`;
  }

  return fullText.trim();
};
