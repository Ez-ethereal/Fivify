"""
OCR API endpoints.
Converts images of mathematical formulas to LaTeX.
"""
from fastapi import APIRouter, File, UploadFile, HTTPException
from app.models.formula import OCRResponse
from PIL import Image
from pix2text import Pix2Text
import io
import logging
import time

router = APIRouter()
logger = logging.getLogger(__name__)

# Minimum confidence threshold for OCR results
# Results below this threshold are rejected with 400 error
CONFIDENCE_THRESHOLD = 0.6

# ========================================
# Module-Level Model Initialization
# ========================================
# This runs ONCE when the server starts, not per-request
try:
    logger.info("Initializing Pix2Text model...")
    p2t = Pix2Text.from_config()
    logger.info("✅ Pix2Text model loaded successfully")
except Exception as e:
    logger.error(f"❌ Failed to initialize Pix2Text: {e}")
    p2t = None  # Allow server to start even if model fails


@router.post("/ocr", response_model=OCRResponse)
async def extract_latex(file: UploadFile = File(...)):
    """
    Extract LaTeX from uploaded formula image using Pix2Text.

    Args:
        file: Image file (JPEG/PNG) via multipart/form-data

    Returns:
        OCRResponse with extracted LaTeX string and confidence score

    Raises:
        HTTPException 503: Pix2Text model not initialized
        HTTPException 400: Invalid image file or confidence below threshold
        HTTPException 500: OCR processing failed
    """
    # Log request
    logger.info(f"OCR request received: {file.filename}, size={file.size}, type={file.content_type}")

    # Check if model is available
    if p2t is None:
        logger.error("OCR request failed: Pix2Text model not initialized")
        raise HTTPException(
            status_code=503,
            detail="OCR service unavailable: model not loaded"
        )

    try:
        # Read uploaded file
        contents = await file.read()
        logger.debug(f"File read successfully: {len(contents)} bytes")

        # Convert to PIL Image
        try:
            image = Image.open(io.BytesIO(contents))
            logger.debug(f"Image decoded: size={image.size}, mode={image.mode}")
        except Exception as e:
            logger.error(f"Invalid image file: {e}")
            raise HTTPException(
                status_code=400,
                detail="Invalid image file"
            )

        # Run OCR with post-processing
        # return_text=False returns dict {'text': '...', 'score': 0.98} instead of just string
        start_time = time.time()
        result = p2t.recognize_text_formula(image, return_text=False, use_post_process=True)
        ocr_duration = time.time() - start_time

        # Log full result object for debugging
        logger.info(f"OCR raw result (type={type(result).__name__}, count={len(result) if isinstance(result, list) else 'N/A'}):")
        if isinstance(result, list):
            for i, item in enumerate(result):
                # Convert position numpy array to list for readable logging
                position_str = item.get('position', []).tolist() if hasattr(item.get('position', []), 'tolist') else item.get('position', [])
                logger.info(f"  [{i}] type={item.get('type')!r}, line={item.get('line_number')}, score={item.get('score', 0):.3f}")
                logger.info(f"       text={item.get('text')!r}")
                logger.info(f"       position={position_str}")
        else:
            logger.info(f"  {result}")
            
            
        # todo: if multiple formulas detected, there will be multiple isolateds
        # handle later
        
        max_conf = float("-inf")
        res = None
        for i in range(len(result)):
            element = result[i]
            if element.get('type') == "isolated":
                confidence = float(element.get('score'))
                if ((confidence) > max_conf):
                    max_conf = confidence
                    res = element
        result = res    
        
                

        # Extract LaTeX and confidence score from result
        latex = result.get('text', '')
        confidence = result.get('score', 1.0)

        # Reject low-confidence results
        if confidence < CONFIDENCE_THRESHOLD:
            logger.warning(f"OCR confidence too low: {confidence:.2f} < {CONFIDENCE_THRESHOLD}")
            raise HTTPException(
                status_code=400,
                detail=f"Unable to recognize formula clearly (confidence: {confidence:.2f})"
            )

        # Log success
        logger.info(f"OCR succeeded: latex_length={len(latex)}, confidence={confidence:.2f}, duration={ocr_duration:.2f}s")
        logger.debug(f"OCR result: {latex}")

        return OCRResponse(
            latex=latex,
            confidence=confidence
        )

    except HTTPException:
        # Re-raise HTTP exceptions (already logged)
        raise
    except Exception as e:
        # Catch-all for unexpected errors
        logger.error(f"OCR processing failed: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"OCR failed: {str(e)}"
        )
