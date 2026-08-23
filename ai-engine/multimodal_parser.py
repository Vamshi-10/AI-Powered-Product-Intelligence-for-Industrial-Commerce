import io
import os
import logging
from PIL import Image

logger = logging.getLogger("MultiModalParser")

try:
    import pypdf
except ImportError:
    pypdf = None

try:
    import google.generativeai as genai
except ImportError:
    genai = None

class MultiModalParser:
    """
    Parses arbitrary PDFs and Images into text so they can be fed into the UniversalAIEngine.
    """
    def __init__(self):
        # Configure Gemini if the API key is present
        self.gemini_enabled = False
        gemini_key = os.environ.get("GEMINI_API_KEY")
        if genai and gemini_key:
            try:
                genai.configure(api_key=gemini_key)
                self.vision_model = genai.GenerativeModel('gemini-2.5-flash')
                self.gemini_enabled = True
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini Vision: {e}")

    def parse_pdf(self, file_bytes: bytes) -> str:
        """
        Extracts raw text from a PDF file.
        """
        if not pypdf:
            return "Error: pypdf not installed. Cannot parse PDF."
            
        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            text = []
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text.append(page_text)
            
            full_text = "\n".join(text)
            if not full_text.strip():
                return "Error: PDF appears to be empty or scanned images (OCR required)."
            return full_text
        except Exception as e:
            logger.error(f"Failed to parse PDF: {e}")
            return f"Error parsing PDF: {e}"

    def parse_image(self, file_bytes: bytes) -> str:
        """
        Uses Gemini Vision to read text, specs, and details from an image.
        If Gemini is unavailable, it returns a fallback message.
        """
        if not self.gemini_enabled:
            return "Error: Google Gemini Vision is not enabled (Missing GEMINI_API_KEY or google-generativeai)."
            
        try:
            image = Image.open(io.BytesIO(file_bytes))
            prompt = (
                "You are an industrial data extractor. "
                "Carefully read all text, specifications, part numbers, and brand names from this image. "
                "Format the output as a clean, structured text block."
            )
            response = self.vision_model.generate_content([prompt, image])
            return response.text
        except Exception as e:
            logger.error(f"Failed to parse Image via Vision: {e}")
            return f"Error parsing image: {e}"

    def parse_file(self, file_bytes: bytes, filename: str) -> str:
        """
        Route to the correct parser based on extension.
        """
        ext = filename.lower().split('.')[-1]
        if ext == 'pdf':
            return self.parse_pdf(file_bytes)
        elif ext in ['png', 'jpg', 'jpeg', 'webp']:
            return self.parse_image(file_bytes)
        elif ext in ['txt', 'csv', 'json']:
            # Fallback for raw text files dragged in
            try:
                return file_bytes.decode('utf-8')
            except Exception:
                return "Error: Could not decode text file."
        else:
            return f"Unsupported file type: {ext}"

# Global singleton
multimodal_parser = MultiModalParser()
