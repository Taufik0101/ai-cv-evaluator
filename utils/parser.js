const pdfparse = require('pdf-parse');
const mammoth = require('mammoth');
async function parseBufferToText(file) {
  const mime = file.mimetype || '';
  try {
    if (mime === 'application/pdf' || file.originalname.endsWith('.pdf')) {
      try {
        const data = await pdfparse(file.buffer);
        return data.text || '';
      } catch (e) {
        console.warn('pdf parse failed, fallback to utf8', e.message);
      }
    }
    if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.originalname.endsWith('.docx')) {
      try {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        return result.value || '';
      } catch (e) {
        console.warn('docx parse failed, fallback', e.message);
      }
    }
  } catch (err) {
    console.warn('parser outer warn', err.message);
  }

  // fallback: try to decode as utf-8 text
  return file.buffer.toString('utf8');
}
module.exports = { parseBufferToText };
