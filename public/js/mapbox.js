/* eslint-disable */
// wir können auch eslint für diese Datei disablen

export const displayMap = locations => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoiYXp6dSIsImEiOiJjazZzemk3YXQwMmhsM2xxcDE3YXYxejVxIn0.tN27NokhKKrdzxVQZbXofQ';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/azzu/ck6szmrbx0wp21imfl41upoaw',
    // Zoom via mausscroll deaktivieren
    scrollZoom: false
    // Longitude, lattitude
    // center: [-118.113491, 34.111745],
    // zoom: 10,
    // // deaktiviert das zoomen etc. , es ist dann nur noch ein Bild
    // interactive: false
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach(loc => {
    // Create marker
    const el = document.createElement('div'); // neues div element erstellen
    el.className = 'marker'; // dem div Element eine Klasse namens marker hinzufügen

    // Add marker, In dem neuen Element erstellen wir den marker, der in styles.css gebaut wird und adden diesen unserer map Variable die weiter oben erstellt wurde.
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom'
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // Add popup
    new mapboxgl.Popup({
      // Das Popup um 30px darüber versetzten!
      offset: 30
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // Extend the map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  // und finally hängen es an die Karte
  map.fitBounds(bounds, {
    // 2ter Parameter ein Objekt mit paddings
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100
    }
  });
};
