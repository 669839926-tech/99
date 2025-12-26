
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * 将 HTML 元素导出为多页 PDF
 * @param elementId 目标元素 ID
 * @param fileName 导出的文件名
 */
export const exportToPDF = async (elementId: string, fileName: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    // 使用高倍率采样以保证打印质量
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      // 确保渲染完整高度
      windowHeight: element.scrollHeight,
      scrollY: -window.scrollY
    });

    const imgData = canvas.toDataURL('image/png');
    
    // 创建 A4 纸张尺寸的 PDF (210mm x 297mm)
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // 计算图像在 PDF 中的比例高度
    const imgProps = pdf.getImageProperties(imgData);
    const totalImgHeightInPDF = (imgProps.height * pdfWidth) / imgProps.width;

    let heightLeft = totalImgHeightInPDF;
    let position = 0;

    // 第一页
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, totalImgHeightInPDF);
    heightLeft -= pdfHeight;

    // 如果内容超过一页，则循环添加新页面并平移图像位置
    while (heightLeft > 0) {
      position -= pdfHeight; // 向上平移一个 PDF 页面高度
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, totalImgHeightInPDF);
      heightLeft -= pdfHeight;
    }

    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('Error generating multi-page PDF:', error);
    throw error;
  }
};
