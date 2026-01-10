import { MapPin } from "lucide-react";

const MapSection = () => {
  return (
    <section className="py-20 bg-secondary">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">Find Us</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Visit our office for personalized consultation
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl overflow-hidden shadow-lg border border-border bg-card">
            {/* Interactive Map (MapLibre in an iframe using MapTiler style) */}
            <div className="relative w-full h-96">
              <iframe
                title="MapTiler Map"
                className="w-full h-full border-0"
                srcDoc={
`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <link href="https://unpkg.com/maplibre-gl/dist/maplibre-gl.css" rel="stylesheet" />
    <style>
      html,body,#map { height: 100%; margin: 0; padding: 0; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/maplibre-gl/dist/maplibre-gl.js"></script>
    <script>
      // MapTiler style URL with provided API key
      const styleUrl = 'https://api.maptiler.com/maps/base-v4/style.json?key=GSnqdXi9o51ELauMGguM';

      // Create the map once maplibregl is available
      (function() {
        try {
          const map = new maplibregl.Map({
            container: 'map',
            style: styleUrl,
            center: [ -0.1278, 51.5074 ], // lon, lat (default: London). Adjust as needed.
            zoom: 12
          });

          // Add navigation controls
          map.addControl(new maplibregl.NavigationControl());
        } catch (err) {
          document.body.innerHTML = '<div style="display:flex;height:100%;align-items:center;justify-content:center;color:#666">Failed to load the map: ' + (err && err.message ? err.message : err) + '</div>';
        }
      })();
    </script>
  </body>
</html>`
                }
              />
            </div>

            {/* Contact Info Bar */}
            <div className="bg-primary text-primary-foreground p-6">
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm opacity-90 mb-1">Address</p>
                  <p className="font-semibold">Chardobato, 07 Banepa, Kavre</p>
                </div>
                <div>
                  <p className="text-sm opacity-90 mb-1">Phone</p>
                  <p className="font-semibold">011-66-5060, +977 9767364658</p>
                </div>
                <div>
                  <p className="text-sm opacity-90 mb-1">Email</p>
                  <p className="font-semibold">learningloungenepal@gmail.com</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MapSection;
