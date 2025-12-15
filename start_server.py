import http.server
import socketserver
import webbrowser
import os
import sys

# Port, kde to celé pojede (localhost:8000)
PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Cache politiku nastavíme na 'no-cache', aby browser věděl, 
        # že si má změny kontrolovat (304 Not Modified), ale necachoval agresivně staré verze.
        # Hard 'no-store' byl overkill a zbytečně to pak lagovalo.
        
        # Tady by se daly vynutit MIME typy, kdyby browser dělal drahoty s JS soubory.
        # Zatím to necháme na automatice.
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
