"""Document parsing pipeline: extract text → LLM structured output → OpportunityExtraction."""

import json
import logging
from pathlib import Path

from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)

# Image extensions that should be sent directly to a vision LLM
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}


class OpportunityExtraction(BaseModel):
    """Structured fields extracted from a real estate teaser document."""

    property_name: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    asking_price: float | None = None
    property_type: str | None = None  # office, retail, industrial, residential, mixed-use, land
    size_sqft: float | None = None
    year_built: int | None = None
    cap_rate: float | None = None
    noi: float | None = None
    occupancy_rate: float | None = None
    rent_roll_summary: str | None = None
    debt_terms: str | None = None
    irr_projection: float | None = None
    seller_info: str | None = None


SYSTEM_PROMPT = """You are a real estate document parser. Extract structured data from the provided document text.

Return a JSON object with these fields (all optional — extract what you can find, leave others as null):
- property_name: Name of the property or project
- address: Street address
- city: City
- state: State or province
- country: Country
- asking_price: Asking price / sale price (number only, no currency symbols)
- property_type: One of: office, retail, industrial, residential, mixed-use, land
- size_sqft: Total area in square feet (number only)
- year_built: Year constructed (integer)
- cap_rate: Capitalization rate as percentage (e.g., 5.5 for 5.5%)
- noi: Net operating income (number only)
- occupancy_rate: Current occupancy as percentage (e.g., 95.0 for 95%)
- rent_roll_summary: Brief summary of rent roll
- debt_terms: Existing debt / financing terms
- irr_projection: Projected internal rate of return as percentage
- seller_info: Seller / broker information

Return ONLY valid JSON. No markdown, no code blocks, no explanation."""


def _extract_text_with_docling(file_path: Path) -> str:
    """Use docling to extract markdown text from a document."""
    from docling.document_converter import DocumentConverter

    converter = DocumentConverter()
    result = converter.convert(str(file_path))
    return result.document.export_to_markdown()


def _call_llm(document_text: str) -> OpportunityExtraction:
    """Send extracted text to LLM for structured extraction."""
    import litellm

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Extract real estate data from this document:\n\n{document_text}"},
    ]

    response = litellm.completion(
        model="openrouter/openai/gpt-oss-120b",
        messages=messages,
        extra_body={
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "opportunity_extraction",
                    "strict": True,
                    "schema": OpportunityExtraction.model_json_schema(),
                },
            }
        },
        api_key=settings.openrouter_api_key,
    )

    content = response.choices[0].message.content
    data = json.loads(content)
    return OpportunityExtraction(**data)


def _mock_extraction(file_path: Path) -> OpportunityExtraction:
    """Return deterministic mock data for testing without an LLM."""
    return OpportunityExtraction(
        property_name="Riverside Office Tower",
        address="100 Main Street",
        city="Austin",
        state="TX",
        country="US",
        asking_price=12500000.0,
        property_type="office",
        size_sqft=45000.0,
        year_built=2015,
        cap_rate=6.2,
        noi=775000.0,
        occupancy_rate=92.5,
        rent_roll_summary="12 tenants, weighted average lease term 4.2 years",
        debt_terms="$8M senior loan at 4.5%, matures 2028",
        irr_projection=14.5,
        seller_info="CBRE - John Smith, (512) 555-0100",
    )


def parse_document(file_path: Path) -> OpportunityExtraction:
    """Full parsing pipeline: extract text from document, then call LLM for structured extraction.

    If LLM_MOCK=true, returns deterministic mock data.
    """
    if settings.llm_mock:
        logger.info("Mock mode: returning deterministic extraction for %s", file_path.name)
        return _mock_extraction(file_path)

    ext = file_path.suffix.lower()

    if ext in IMAGE_EXTENSIONS:
        # For images, we skip docling and note that vision LLM would be used
        # For now, fall back to a simple description
        document_text = f"[Image file: {file_path.name}. Please extract any visible real estate information.]"
    else:
        logger.info("Extracting text from %s with docling", file_path.name)
        document_text = _extract_text_with_docling(file_path)

    if not document_text.strip():
        logger.warning("No text extracted from %s", file_path.name)
        return OpportunityExtraction()

    logger.info("Calling LLM for structured extraction (%d chars)", len(document_text))
    return _call_llm(document_text)
