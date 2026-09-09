import time
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("Gmart.access")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        try:
            response: Response = await call_next(request)
        except Exception as exc:
            duration = (time.perf_counter() - start) * 1000
            logger.error(
                f"{request.method} {request.url.path} "
                f"UNHANDLED EXCEPTION duration={duration:.1f}ms: {exc!r}"
            )
            raise
        duration = (time.perf_counter() - start) * 1000
        logger.info(
            f"{request.method} {request.url.path} "
            f"status={response.status_code} "
            f"duration={duration:.1f}ms"
        )
        return response
