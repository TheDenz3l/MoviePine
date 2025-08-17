#!/usr/bin/env python3
"""
HTTPS Proxy for Anthropic Bridge
Wraps the HTTP bridge with HTTPS to satisfy extension requirements
"""
import asyncio
import aiohttp
import ssl
from aiohttp import web
import logging
import json
from urllib.parse import urljoin

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Bridge URL
BRIDGE_URL = "http://127.0.0.1:8001"

async def proxy_request(request):
    """Proxy all requests to the HTTP bridge"""
    # Build target URL
    target_url = urljoin(BRIDGE_URL, request.path_qs)
    
    # Copy headers
    headers = dict(request.headers)
    # Remove hop-by-hop headers
    headers.pop('Host', None)
    headers.pop('Connection', None)
    
    # Log the request
    logger.info(f"Proxying {request.method} {request.path} -> {target_url}")
    
    try:
        async with aiohttp.ClientSession() as session:
            # Read request body
            body = await request.read()
            
            # Make request to bridge
            async with session.request(
                method=request.method,
                url=target_url,
                headers=headers,
                data=body if body else None
            ) as bridge_response:
                # Copy response headers
                response_headers = {}
                for name, value in bridge_response.headers.items():
                    if name.lower() not in ['connection', 'transfer-encoding']:
                        response_headers[name] = value
                
                # Read response body
                response_body = await bridge_response.read()
                
                # Create response
                response = web.Response(
                    body=response_body,
                    status=bridge_response.status,
                    headers=response_headers
                )
                
                logger.info(f"Proxied response: {bridge_response.status}")
                return response
                
    except Exception as e:
        logger.error(f"Proxy error: {e}")
        return web.Response(text=f"Proxy error: {e}", status=500)

async def create_app():
    """Create the proxy app"""
    app = web.Application()
    
    # Add catch-all route
    app.router.add_route('*', '/{path:.*}', proxy_request)
    
    return app

def create_ssl_context():
    """Create a simple self-signed SSL context"""
    ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    # Create self-signed cert
    import tempfile
    import os
    from datetime import datetime, timedelta
    
    # Create a simple self-signed certificate
    cert_file = "/tmp/proxy_cert.pem"
    key_file = "/tmp/proxy_key.pem"
    
    if not os.path.exists(cert_file):
        logger.info("Creating self-signed certificate...")
        os.system(f"""
        openssl req -x509 -newkey rsa:4096 -keyout {key_file} -out {cert_file} -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Local/OU=Dev/CN=localhost"
        """)
    
    ssl_context.load_cert_chain(cert_file, key_file)
    return ssl_context

async def main():
    """Main function"""
    app = await create_app()
    ssl_context = create_ssl_context()
    
    logger.info("Starting HTTPS proxy on https://127.0.0.1:8443")
    logger.info(f"Proxying to: {BRIDGE_URL}")
    
    runner = web.AppRunner(app)
    await runner.setup()
    
    site = web.TCPSite(runner, '127.0.0.1', 8443, ssl_context=ssl_context)
    await site.start()
    
    logger.info("HTTPS proxy ready! Configure Claude Code to use: https://127.0.0.1:8443")
    
    # Keep running
    try:
        await asyncio.Event().wait()
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    finally:
        await runner.cleanup()

if __name__ == "__main__":
    asyncio.run(main())
