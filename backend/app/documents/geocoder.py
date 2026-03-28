"""Nominatim geocoding: address → lat/lng with simple caching."""

import logging
import time

import httpx

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "BTP-TeaserParser/0.1 (real-estate-parser)"

# Simple in-memory cache: address string → (lat, lng)
_cache: dict[str, tuple[float, float] | None] = {}

# Rate limiting: track last request time (Nominatim requires max 1 req/sec)
_last_request_time: float = 0.0


def geocode(address: str, city: str | None = None, state: str | None = None, country: str | None = None) -> tuple[float, float] | None:
    """Look up latitude/longitude for an address via Nominatim.

    Returns (lat, lng) tuple or None if geocoding fails.
    Respects Nominatim's 1 request/second rate limit.
    """
    # Build full address string for lookup
    parts = [p for p in [address, city, state, country] if p]
    if not parts:
        return None

    full_address = ", ".join(parts)

    # Check cache
    if full_address in _cache:
        logger.debug("Geocode cache hit: %s", full_address)
        return _cache[full_address]

    # Rate limit: wait if needed
    global _last_request_time
    elapsed = time.time() - _last_request_time
    if elapsed < 1.0:
        time.sleep(1.0 - elapsed)

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                NOMINATIM_URL,
                params={"q": full_address, "format": "json", "limit": 1},
                headers={"User-Agent": USER_AGENT},
            )
            _last_request_time = time.time()
            response.raise_for_status()

        results = response.json()
        if results:
            lat = float(results[0]["lat"])
            lng = float(results[0]["lon"])
            _cache[full_address] = (lat, lng)
            logger.info("Geocoded '%s' → (%f, %f)", full_address, lat, lng)
            return (lat, lng)

        logger.warning("No geocoding results for '%s'", full_address)
        _cache[full_address] = None
        return None

    except Exception:
        logger.exception("Geocoding failed for '%s'", full_address)
        return None
