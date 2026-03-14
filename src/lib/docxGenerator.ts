import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { ExtractedData } from './gemini';
// @ts-ignore
import ImageModule from 'docxtemplater-image-module-free';

export async function generateDocx(
  templateType: 'Chargeback' | 'FinCert',
  data: ExtractedData
) {
  const url = templateType === 'Chargeback' 
    ? 'ChargebackTemplateStars.docx' 
    : 'FinCertTemplateStars.docx';

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Template file not found on server");
    const arrayBuffer = await response.arrayBuffer();
    
    const zip = new PizZip(arrayBuffer);

    const opts = {
      centered: false,
      fileType: "docx",
      getImage: (tagValue: string) => {
        return new Promise((resolve, reject) => {
          if (!tagValue.startsWith('data:image/')) {
            return reject(new Error("Invalid image format. Must be base64 data URI."));
          }
           try {
               const base64Data = tagValue.split(',')[1];
               const binaryString = window.atob(base64Data);
               const len = binaryString.length;
               const bytes = new Uint8Array(len);
               for (let i = 0; i < len; i++) {
                   bytes[i] = binaryString.charCodeAt(i);
               }
               resolve(bytes.buffer);
           } catch(e) {
               reject(e);
           }
        });
      },
      getSize: (_img: any, tagValue: string) => {
        return new Promise((resolve) => {
          const image = new Image();
          image.src = tagValue;
          image.onload = () => {
             // Fixed width to fit A4 page nicely (e.g. 500 px). Scale height proportionally.
             const targetWidth = 500;
             const targetHeight = Math.round((image.height / image.width) * targetWidth);
             resolve([targetWidth, targetHeight]);
          };
          image.onerror = (e) => {
             console.error("Error loading image for dimensions: ", e);
             resolve([500, 500]); // Fallback square size
          };
        });
      }
    };

    const imageModule = new ImageModule(opts);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      modules: [imageModule]
    });

    // Formatting the screenshots so it matches an array of objects to loop over in Word
    // Usage in Word:
    // {#screenshots}
    // {%image}
    // {/screenshots}
    const templateData = {
        ...data,
        screenshots: data.screenshots?.map(img => ({ image: img })) || []
    };

    await doc.renderAsync(templateData);

    const out = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    saveAs(out, `${templateType}_${data.gateTransactionNumber || 'report'}.docx`);
    return true;
  } catch (error) {
    console.error("Error generating DOCX:", error);
    throw error;
  }
}
