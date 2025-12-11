import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const exportToPDF = async (elementId: string, fileName: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    // Increase scale for better quality
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true, // Handle images from external domains if CORS configured
      logging: false,
      backgroundColor: '#ffffff' // Ensure white background
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'l' : 'p',
      unit: 'mm',
      format: 'a4'
    });

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    // If height exceeds A4 page, we might need multiple pages, 
    // but for simple summary reports, we usually fit to width or single page.
    // Here we implement a simple fit-to-width logic.
    
    let heightLeft = pdfHeight;
    let position = 0;
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    
    // For very long content (longer than one page), simple cropping logic:
    // (This is a basic implementation, complex multi-page PDF from HTML is harder)
    // heightLeft -= pageHeight;
    // while (heightLeft >= 0) {
    //   position = heightLeft - pdfHeight;
    //   pdf.addPage();
    //   pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    //   heightLeft -= pageHeight;
    // }

    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};