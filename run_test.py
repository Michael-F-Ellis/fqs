import asyncio
import http.server
import socketserver
import threading
import subprocess
from playwright.async_api import async_playwright

PORT = 8000
TEST_FILE = "dev.fqs"
URL = f"http://localhost:{PORT}/pre-fqs.html?load={TEST_FILE}"

def run_build():
    """Runs the build.py script."""
    print("Running build script...")
    try:
        subprocess.run(["python3", "build.py"], check=True)
        print("Build successful.")
    except subprocess.CalledProcessError as e:
        print(f"Build failed: {e}")
        exit(1)

def start_server():
    """Starts a simple HTTP server in a separate thread."""
    handler = http.server.SimpleHTTPRequestHandler
    # Allow the server to reuse the address. This prevents "Address already in use" errors.
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("", PORT), handler)
    print(f"Serving at http://localhost:{PORT}")
    thread = threading.Thread(target=httpd.serve_forever)
    thread.daemon = True
    thread.start()
    return httpd

async def run_test():
    """Launches Playwright, runs the test, and captures console logs."""
    httpd = start_server()
    
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Listen for all console events and print them
        page.on("console", lambda msg: print(f"BROWSER LOG: {msg.text}"))

        print(f"Navigating to {URL}...")
        await page.goto(URL)

        # Give the page a moment to load and execute scripts
        await asyncio.sleep(5)

        print("Closing browser...")
        await browser.close()

    print("Shutting down server...")
    httpd.shutdown()
    print("Test run complete.")

if __name__ == "__main__":
    run_build()
    asyncio.run(run_test())
