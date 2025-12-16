import http.server
import socketserver
import webbrowser
import os
import sys

# Port, kde to celé pojede (localhost:8000)
PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Force aggressive anti-caching
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        
        # Force correct MIME types for Windows (Chrome is strict about application/javascript)
        path = self.path.lower()
        if path.endswith('.js') or path.endswith('.mjs'):
            self.send_header('Content-Type', 'application/javascript')
        elif path.endswith('.css'):
            self.send_header('Content-Type', 'text/css')
        elif path.endswith('.json'):
            self.send_header('Content-Type', 'application/json')
        elif path.endswith('.svg'):
            self.send_header('Content-Type', 'image/svg+xml')
            
        super().end_headers()

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

def run_server():
    # Přesuneme se do složky se skriptem, ať servírujeme správný root
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    try:
        # allow_reuse_address=True je nutnost, jinak při restartu port visí a řve to "Address already in use"
        with ReusableTCPServer(("", PORT), Handler) as httpd:
            print(f"Server běží na http://localhost:{PORT}")
            print("Pro ukončení stiskněte Ctrl+C")
            
            # Otevřeme to rovnou v prohlížeči, ať to nemusíte datlovat ručně
            webbrowser.open(f"http://localhost:{PORT}")
            
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\nKončím, vypínám krám...")
                httpd.shutdown()
                sys.exit(0)
    except OSError as e:
        if "Address already in use" in str(e) or e.errno == 10048:
            print(f"Chyba: Port {PORT} je obsazený.")
            print("Zkuste vypnout jiné aplikace běžící na tomto portu.")
        else:
            print(f"Chyba při spouštění serveru: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_server()
